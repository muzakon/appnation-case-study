import { ChatRepository } from "../modules/chats/repository";
import { ChatService } from "../modules/chats/service";
import {
  ChatCompletionResponseSelector,
  ChatHistoryStrategySelector,
  FullChatHistoryStrategy,
  JsonCompletionResponseStrategy,
  RecentChatHistoryStrategy,
  StreamingCompletionResponseStrategy,
  ToolStrategySelector,
  ToolsDisabledStrategy,
  ToolsEnabledStrategy,
} from "../modules/chats/strategies";
import { MessageRepository } from "../modules/messages/repository";
import { UserRepository } from "../modules/users/repository";
import type { DatabaseClient } from "./database";
import { prisma } from "./database";
import { FeatureFlagService, FileFeatureFlagProvider } from "./feature-flags";
import { logger } from "./logger";
import { type AppSettings, appSettings } from "./settings";

export type AppContainer = {
  db: DatabaseClient;
  settings: AppSettings;
  logger: typeof logger;
  featureFlags: FeatureFlagService;
  strategies: {
    chatCompletion: ChatCompletionResponseSelector;
  };
  repositories: {
    chats: ChatRepository;
    messages: MessageRepository;
    users: UserRepository;
  };
  services: {
    chats: ChatService;
  };
};

export function createAppContainer(): AppContainer {
  const db = prisma();
  const featureFlagLogger = logger.child("FeatureFlags");

  const featureFlagProvider = new FileFeatureFlagProvider({
    path: appSettings.featureFlags.filePath,
    logger: featureFlagLogger,
  });
  const featureFlags = new FeatureFlagService(featureFlagProvider, featureFlagLogger);

  const repositories = {
    chats: new ChatRepository(db),
    messages: new MessageRepository(db),
    users: new UserRepository(db),
  };

  const historyStrategies = {
    full: new FullChatHistoryStrategy(repositories.messages),
    recent: new RecentChatHistoryStrategy(repositories.messages, featureFlags),
  };

  const historySelector = new ChatHistoryStrategySelector(
    featureFlags,
    historyStrategies.full,
    historyStrategies.recent,
  );

  const toolStrategies = {
    enabled: new ToolsEnabledStrategy(),
    disabled: new ToolsDisabledStrategy(),
  };

  const toolSelector = new ToolStrategySelector(
    featureFlags,
    toolStrategies.enabled,
    toolStrategies.disabled,
  );

  const completionStrategies = {
    streaming: new StreamingCompletionResponseStrategy(),
    json: new JsonCompletionResponseStrategy(),
  };

  const completionResponder = new ChatCompletionResponseSelector(
    featureFlags,
    completionStrategies.streaming,
    completionStrategies.json,
  );

  const services = {
    chats: new ChatService(
      repositories.users,
      repositories.chats,
      featureFlags,
      historySelector,
      toolSelector,
    ),
  };

  return {
    db,
    settings: appSettings,
    logger,
    featureFlags,
    strategies: {
      chatCompletion: completionResponder,
    },
    repositories,
    services,
  };
}
