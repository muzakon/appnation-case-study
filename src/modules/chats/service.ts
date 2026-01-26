import { NotFoundError } from "../../common/errors";
import type { DecodedToken } from "../../common/interfaces";
import type { FeatureFlagService } from "../../core/feature-flags";
import type { Chat, Message } from "../../database/prisma/client";
import type { UserRepository } from "../users/repository";
import type { ChatRepository } from "./repository";
import type { ChatHistoryStrategySelector, ToolStrategySelector } from "./strategies";
import type { ChatCompletionResult } from "./types";

export class ChatService {
  private readonly userRepository: UserRepository;
  private readonly chatRepository: ChatRepository;
  private readonly featureFlags: FeatureFlagService;
  private readonly historySelector: ChatHistoryStrategySelector;
  private readonly toolSelector: ToolStrategySelector;

  constructor(
    userRepository: UserRepository,
    chatRepository: ChatRepository,
    featureFlags: FeatureFlagService,
    historySelector: ChatHistoryStrategySelector,
    toolSelector: ToolStrategySelector,
  ) {
    this.userRepository = userRepository;
    this.chatRepository = chatRepository;
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
  ): Promise<ChatCompletionResult> {
    const userId = await this.requireUserId(decodedToken);
    await this.requireUserChat(userId, chatId);

    const toolResult = await this.toolSelector.execute({ chatId, userId });
    const content = toolResult.toolsUsed
      ? "Mocked completion response with tools."
      : "Mocked completion response without tools.";

    return {
      chatId,
      content,
      toolsUsed: toolResult.toolsUsed,
      toolCalls: toolResult.toolCalls,
    };
  }
}
