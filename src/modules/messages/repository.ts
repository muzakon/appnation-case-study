import type { DatabaseClient, TransactionClient } from "../../core/database";
import type { Message } from "../../database/prisma/client";

export class MessageRepository {
  private readonly db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.db = db;
  }

  async findMessages(
    chatId: string,
    options?: {
      limit?: number;
      recent?: boolean;
      tx?: TransactionClient;
    },
  ): Promise<Message[]> {
    const client = options?.tx ?? this.db;
    const orderBy = options?.recent ? "desc" : "asc";
    const messages = await client.message.findMany({
      where: {
        chatId,
      },
      orderBy: {
        createdAt: orderBy,
      },
      take: options?.limit,
    });
    if (options?.recent && options?.limit) {
      return messages.reverse();
    }
    return messages;
  }

  async createMessage(
    data: {
      chatId: string;
      role: string;
      content: string;
    },
    options?: {
      tx?: TransactionClient;
    },
  ): Promise<Message> {
    const client = options?.tx ?? this.db;
    return client.message.create({
      data,
    });
  }
}
