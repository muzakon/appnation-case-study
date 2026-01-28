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
import type { ChatHistoryStrategySelector, ToolStrategySelector } from "./strategies";
import type { ChatCompletionResult } from "./types";

export class ChatService {
  private readonly userRepository: UserRepository;
  private readonly chatRepository: ChatRepository;
  private readonly messageRepository: MessageRepository;
  private readonly tokenUsageRepository: TokenUsageRepository;
  private readonly featureFlags: FeatureFlagService;
  private readonly historySelector: ChatHistoryStrategySelector;
  private readonly toolSelector: ToolStrategySelector;

  constructor(
    userRepository: UserRepository,
    chatRepository: ChatRepository,
    messageRepository: MessageRepository,
    tokenUsageRepository: TokenUsageRepository,
    featureFlags: FeatureFlagService,
    historySelector: ChatHistoryStrategySelector,
    toolSelector: ToolStrategySelector,
  ) {
    this.userRepository = userRepository;
    this.chatRepository = chatRepository;
    this.messageRepository = messageRepository;
    this.tokenUsageRepository = tokenUsageRepository;
    this.featureFlags = featureFlags;
    this.historySelector = historySelector;
    this.toolSelector = toolSelector;
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

  async listUserChats(decodedToken: DecodedToken): Promise<Chat[]> {
    const userId = await this.requireUserId(decodedToken);
    const limit = await this.featureFlags.getNumber("PAGINATION_LIMIT");
    return this.chatRepository.listUserChats(userId, { limit });
  }

  async getChatHistory(decodedToken: DecodedToken, chatId: string): Promise<Message[]> {
    const userId = await this.requireUserId(decodedToken);
    await this.requireUserChat(userId, chatId);
    return this.historySelector.getHistory(chatId);
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
          limit: await this.featureFlags.getNumber("PAGINATION_LIMIT"),
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
