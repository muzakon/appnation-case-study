import type { DatabaseClient, TransactionClient } from "../../core/database";
import type { Chat, Prisma } from "../../database/prisma/client";

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
      cursor?: string;
      tx?: TransactionClient;
    },
  ): Promise<Chat[]> {
    const client = options?.tx ?? this.db;
    return client.chat.findMany({
      where: {
        userId,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
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

  async countUserChats(
    userId: string,
    options?: {
      beforeOrEqual?: {
        updatedAt: Date;
        id: string;
      };
      tx?: TransactionClient;
    },
  ): Promise<number> {
    const client = options?.tx ?? this.db;
    const where: Prisma.ChatWhereInput = { userId };

    if (options?.beforeOrEqual) {
      where.OR = [
        {
          updatedAt: {
            gt: options.beforeOrEqual.updatedAt,
          },
        },
        {
          updatedAt: options.beforeOrEqual.updatedAt,
          id: {
            gte: options.beforeOrEqual.id,
          },
        },
      ];
    }

    return client.chat.count({ where });
  }
}
