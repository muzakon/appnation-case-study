import type { DatabaseClient, TransactionClient } from "../../core/database";
import type { Chat } from "../../database/prisma/client";

export class ChatRepository {
  private readonly db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.db = db;
  }

  async findByChatAndUserId(
    userId: string,
    chatId: string,
    tx?: TransactionClient,
  ): Promise<Chat | null> {
    const client = tx ?? this.db;
    return client.chat.findFirst({
      where: {
        userId,
        id: chatId,
      },
    });
  }

  async listUserChats(
    userId: string,
    options?: {
      limit?: number;
      tx?: TransactionClient;
    },
  ): Promise<Chat[]> {
    const client = options?.tx ?? this.db;
    return client.chat.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: options?.limit,
    });
  }
}
