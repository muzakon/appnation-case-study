import type { DatabaseClient, TransactionClient } from "../../core/database";
import type { Message, Prisma } from "../../database/prisma/client";

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

  async findByChatAndId(
    chatId: string,
    messageId: string,
    options?: {
      tx?: TransactionClient;
    },
  ): Promise<Message | null> {
    const client = options?.tx ?? this.db;
    return client.message.findFirst({
      where: {
        chatId,
        id: messageId,
      },
    });
  }

  async listMessagesPage(
    chatId: string,
    options?: {
      limit?: number;
      cursor?: string;
      order?: "asc" | "desc";
      tx?: TransactionClient;
    },
  ): Promise<Message[]> {
    const client = options?.tx ?? this.db;
    const order = options?.order ?? "desc";
    return client.message.findMany({
      where: {
        chatId,
      },
      orderBy: [{ createdAt: order }, { id: order }],
      take: options?.limit,
      ...(options?.cursor
        ? {
            cursor: {
              id: options.cursor,
            },
            skip: 1,
          }
        : {}),
    });
  }

  async countMessages(
    chatId: string,
    options?: {
      beforeOrEqual?: {
        createdAt: Date;
        id: string;
      };
      tx?: TransactionClient;
    },
  ): Promise<number> {
    const client = options?.tx ?? this.db;
    const where: Prisma.MessageWhereInput = { chatId };

    if (options?.beforeOrEqual) {
      where.OR = [
        {
          createdAt: {
            gt: options.beforeOrEqual.createdAt,
          },
        },
        {
          createdAt: options.beforeOrEqual.createdAt,
          id: {
            gte: options.beforeOrEqual.id,
          },
        },
      ];
    }

    return client.message.count({ where });
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
