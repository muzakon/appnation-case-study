import type { DatabaseClient, TransactionClient } from "../../core/database";
import type { Message } from "../../database/prisma/client";

export class MessageRepository {
  private readonly db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.db = db;
  }

  async findMessages(chatId: string, tx?: TransactionClient): Promise<Message[]> {
    const client = tx ?? this.db;
    const messages = await client.message.findMany({
      where: {
        chatId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    return messages;
  }
}
