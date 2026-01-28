import { vercelAIManager } from "../../common/ai-sdk";
import { MessageRole } from "../../common/enums";
import { NotFoundError } from "../../common/errors";
import type { DecodedToken } from "../../common/interfaces";
import type { FeatureFlagService } from "../../core/feature-flags";
import type { Chat, Message } from "../../database/prisma/client";
import type { MessageRepository } from "../messages/repository";
import type { TokenUsageRepository } from "../token-usage/repository";
import type { UserRepository } from "../users/repository";
import type { ChatRepository } from "./repository";
import type { ToolStrategySelector } from "./strategies";
import type { ChatCompletionResult } from "./types";

type PaginationParams = {
  cursor?: string;
  limit?: number | string;
};

type CursorPage<T> = {
  count: number;
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  cursor: {
    next?: string;
    prev?: string;
  };
  data: T[];
};

const MAX_PAGE_SIZE = 100;
const RECENT_MESSAGES_LIMIT = 10;

export class ChatService {
  private readonly userRepository: UserRepository;
  private readonly chatRepository: ChatRepository;
  private readonly messageRepository: MessageRepository;
  private readonly tokenUsageRepository: TokenUsageRepository;
  private readonly featureFlags: FeatureFlagService;
  private readonly toolSelector: ToolStrategySelector;

  constructor(
    userRepository: UserRepository,
    chatRepository: ChatRepository,
    messageRepository: MessageRepository,
    tokenUsageRepository: TokenUsageRepository,
    featureFlags: FeatureFlagService,
    toolSelector: ToolStrategySelector,
  ) {
    this.userRepository = userRepository;
    this.chatRepository = chatRepository;
    this.messageRepository = messageRepository;
    this.tokenUsageRepository = tokenUsageRepository;
    this.featureFlags = featureFlags;
    this.toolSelector = toolSelector;
  }

  private normalizeLimit(limit: PaginationParams["limit"], fallback: number): number {
    const parsed =
      typeof limit === "number"
        ? limit
        : typeof limit === "string"
          ? Number.parseInt(limit, 10)
          : fallback;

    if (!Number.isFinite(parsed)) {
      return Math.min(Math.max(fallback, 1), MAX_PAGE_SIZE);
    }

    return Math.min(Math.max(Math.floor(parsed), 1), MAX_PAGE_SIZE);
  }

  private async requireUserId(decodedToken: DecodedToken): Promise<string> {
    const user = await this.userRepository.findUser(decodedToken.id);
    if (!user) {
      throw new NotFoundError("User", decodedToken.id);
    }
    return user.id;
  }

  private async requireUserChat(userId: string, chatId: string): Promise<void> {
    const chat = await this.chatRepository.findByChatAndUserId(userId, chatId);
    if (!chat) {
      throw new NotFoundError("Chat", chatId);
    }
  }

  async listUserChats(
    decodedToken: DecodedToken,
    params?: PaginationParams,
  ): Promise<CursorPage<Pick<Chat, "id" | "title">>> {
    const userId = await this.requireUserId(decodedToken);
    const maxLimit = await this.featureFlags.getNumber("PAGINATION_LIMIT");
    const requestedLimit = this.normalizeLimit(params?.limit, maxLimit);
    const pageSize = Math.min(requestedLimit, maxLimit);

    const requestedCursor = typeof params?.cursor === "string" ? params.cursor : undefined;
    const cursorChat = requestedCursor
      ? await this.chatRepository.findByChatAndUserId(userId, requestedCursor)
      : null;
    const cursor = cursorChat ? requestedCursor : undefined;

    const chats = await this.chatRepository.listUserChats(userId, {
      limit: pageSize + 1,
      cursor,
    });
    const hasMore = chats.length > pageSize;
    const pageChats = hasMore ? chats.slice(0, pageSize) : chats;
    const nextCursor = hasMore ? pageChats[pageChats.length - 1]?.id : undefined;

    const total = await this.chatRepository.countUserChats(userId);
    let page = 1;
    if (cursorChat) {
      const offset = await this.chatRepository.countUserChats(userId, {
        beforeOrEqual: {
          updatedAt: cursorChat.updatedAt,
          id: cursorChat.id,
        },
      });
      page = Math.floor(offset / pageSize) + 1;
    }

    return {
      count: pageChats.length,
      page,
      pageSize,
      total,
      hasMore,
      cursor: {
        next: nextCursor,
      },
      data: pageChats.map(({ id, title }) => ({ id, title })),
    };
  }

  async getChatHistory(
    decodedToken: DecodedToken,
    chatId: string,
    params?: PaginationParams,
  ): Promise<CursorPage<Pick<Message, "id" | "role" | "content">>> {
    const userId = await this.requireUserId(decodedToken);
    await this.requireUserChat(userId, chatId);

    const historyEnabled = await this.featureFlags.isEnabled("CHAT_HISTORY_ENABLED");

    if (!historyEnabled) {
      const messages = await this.messageRepository.findMessages(chatId, {
        limit: RECENT_MESSAGES_LIMIT,
        recent: true,
      });

      return {
        count: messages.length,
        page: 1,
        pageSize: RECENT_MESSAGES_LIMIT,
        total: messages.length,
        hasMore: false,
        cursor: {},
        data: messages.map(({ id, role, content }) => ({ id, role, content })),
      };
    }

    const maxLimit = await this.featureFlags.getNumber("PAGINATION_LIMIT");
    const requestedLimit = this.normalizeLimit(params?.limit, maxLimit);
    const pageSize = Math.min(requestedLimit, maxLimit);

    const requestedCursor = typeof params?.cursor === "string" ? params.cursor : undefined;
    const cursorMessage = requestedCursor
      ? await this.messageRepository.findByChatAndId(chatId, requestedCursor)
      : null;
    const cursor = cursorMessage ? requestedCursor : undefined;

    const messages = await this.messageRepository.listMessagesPage(chatId, {
      limit: pageSize + 1,
      cursor,
      order: "asc",
    });
    const hasMore = messages.length > pageSize;
    const pageMessages = hasMore ? messages.slice(0, pageSize) : messages;
    const nextCursor = hasMore ? pageMessages[pageMessages.length - 1]?.id : undefined;

    const total = await this.messageRepository.countMessages(chatId);
    let page = 1;
    if (cursorMessage) {
      const offset = await this.messageRepository.countMessages(chatId, {
        beforeOrEqual: {
          createdAt: cursorMessage.createdAt,
          id: cursorMessage.id,
        },
      });
      page = Math.floor(offset / pageSize) + 1;
    }

    return {
      count: pageMessages.length,
      page,
      pageSize,
      total,
      hasMore,
      cursor: {
        next: nextCursor,
      },
      data: pageMessages.map(({ id, role, content }) => ({ id, role, content })),
    };
  }

  async getUserChatCompletion(
    decodedToken: DecodedToken,
    chatId: string,
    prompt: string,
  ): Promise<ChatCompletionResult> {
    const userId = await this.requireUserId(decodedToken);
    await this.requireUserChat(userId, chatId);

    await this.messageRepository.createMessage({
      chatId,
      role: MessageRole.USER,
      content: prompt,
    });

    const historyEnabled = await this.featureFlags.isEnabled("CHAT_HISTORY_ENABLED");
    const messages = historyEnabled
      ? await this.messageRepository.findMessages(chatId, {
          limit: 10,
          recent: true,
        })
      : [];

    const toolResult = await this.toolSelector.execute({ chatId, userId });
    const result = await vercelAIManager.generateText({
      prompt,
      messages: historyEnabled
        ? messages.map((message) => ({
            role: message.role === MessageRole.USER ? "user" : "assistant",
            content: [{ type: "text", text: message.content }],
          }))
        : undefined,
    });

    const assistantMessage = await this.messageRepository.createMessage({
      chatId,
      role: MessageRole.ASSISTANT,
      content: result.text,
    });

    // Save token usage
    await this.tokenUsageRepository.create({
      userId,
      chatId,
      messageId: assistantMessage.id,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
      model: result.model,
    });

    return {
      chatId,
      content: result.text,
      toolsUsed: toolResult.toolsUsed,
      toolCalls: toolResult.toolCalls,
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        model: result.model,
      },
    };
  }
}
