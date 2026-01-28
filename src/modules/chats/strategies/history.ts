import type { FeatureFlagService } from "../../../core/feature-flags";
import type { Message } from "../../../database/prisma/client";
import type { MessageRepository } from "../../messages/repository";

export interface ChatHistoryStrategy {
  getHistory(chatId: string): Promise<Message[]>;
}

export class FullChatHistoryStrategy implements ChatHistoryStrategy {
  private readonly messageRepository: MessageRepository;

  constructor(messageRepository: MessageRepository) {
    this.messageRepository = messageRepository;
  }

  async getHistory(chatId: string): Promise<Message[]> {
    return this.messageRepository.findMessages(chatId);
  }
}

export class RecentChatHistoryStrategy implements ChatHistoryStrategy {
  private readonly messageRepository: MessageRepository;
  private readonly featureFlags: FeatureFlagService;

  constructor(messageRepository: MessageRepository, featureFlags: FeatureFlagService) {
    this.messageRepository = messageRepository;
    this.featureFlags = featureFlags;
  }

  async getHistory(chatId: string): Promise<Message[]> {
    const limit = await this.featureFlags.getNumber("PAGINATION_LIMIT");
    return this.messageRepository.findMessages(chatId, { limit, recent: true });
  }
}

export class ChatHistoryStrategySelector {
  private readonly featureFlags: FeatureFlagService;
  private readonly full: ChatHistoryStrategy;
  private readonly recent: ChatHistoryStrategy;

  constructor(
    featureFlags: FeatureFlagService,
    full: ChatHistoryStrategy,
    recent: ChatHistoryStrategy,
  ) {
    this.featureFlags = featureFlags;
    this.full = full;
    this.recent = recent;
  }

  async getHistory(chatId: string): Promise<Message[]> {
    const historyEnabled = await this.featureFlags.isEnabled("CHAT_HISTORY_ENABLED");
    return historyEnabled ? this.full.getHistory(chatId) : this.recent.getHistory(chatId);
  }
}
