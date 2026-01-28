import { RedisManager } from "../common/redis";
import { ChatRepository } from "../modules/chats/repository";
import { ChatService } from "../modules/chats/service";
import {
  ChatCompletionResponseSelector,
  JsonCompletionResponseStrategy,
  StreamingCompletionResponseStrategy,
  ToolStrategySelector,
  ToolsDisabledStrategy,
  ToolsEnabledStrategy,
} from "../modules/chats/strategies";
import { MessageRepository } from "../modules/messages/repository";
import { TokenUsageRepository } from "../modules/token-usage/repository";
import { UserRepository } from "../modules/users/repository";
import type { DatabaseClient } from "./database";
import { prisma } from "./database";
import { FeatureFlagService, FileFeatureFlagProvider } from "./feature-flags";
import { logger } from "./logger";
import { getRedis } from "./redis";
import { type AppSettings, appSettings } from "./settings";

export type AppContainer = {
  db: DatabaseClient;
  settings: AppSettings;
  logger: typeof logger;
  redis: RedisManager;
  featureFlags: FeatureFlagService;
  strategies: {
    chatCompletion: ChatCompletionResponseSelector;
  };
  repositories: {
    chats: ChatRepository;
    messages: MessageRepository;
    users: UserRepository;
    tokenUsage: TokenUsageRepository;
  };
  services: {
    chats: ChatService;
  };
};

export function createAppContainer(): AppContainer {
  const db = prisma();
  const redisClient = getRedis();
  const redis = new RedisManager(redisClient);

  const featureFlagLogger = logger.child("FeatureFlags");

  const featureFlagProvider = new FileFeatureFlagProvider({
    logger: featureFlagLogger,
  });
  const featureFlags = new FeatureFlagService(featureFlagProvider, featureFlagLogger);

  const repositories = {
    chats: new ChatRepository(db),
    messages: new MessageRepository(db),
    users: new UserRepository(db),
    tokenUsage: new TokenUsageRepository(db),
  };

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
      repositories.messages,
      repositories.tokenUsage,
      featureFlags,
      toolSelector,
    ),
  };

  return {
    db,
    settings: appSettings,
    logger,
    redis,
    featureFlags,
    strategies: {
      chatCompletion: completionResponder,
    },
    repositories,
    services,
  };
}
