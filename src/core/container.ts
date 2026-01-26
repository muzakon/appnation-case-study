import { ChatRepository } from "../modules/chats/repository";
import { ChatService } from "../modules/chats/service";
import { MessageRepository } from "../modules/messages/repository";
import { UserRepository } from "../modules/users/repository";
import type { DatabaseClient } from "./database";
import { prisma } from "./database";
import { logger } from "./logger";
import { type AppSettings, appSettings } from "./settings";

export type AppContainer = {
  db: DatabaseClient;
  settings: AppSettings;
  logger: typeof logger;
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

  const repositories = {
    chats: new ChatRepository(db),
    messages: new MessageRepository(db),
    users: new UserRepository(db),
  };

  const services = {
    chats: new ChatService(repositories.users, repositories.chats, repositories.messages),
  };

  return {
    db,
    settings: appSettings,
    logger,
    repositories,
    services,
  };
}
