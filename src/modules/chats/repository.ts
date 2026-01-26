import { prisma, type TransactionClient } from "../../core/database";
import type { Chat } from "../../database/prisma/client";

export class ChatRepository {
  static async findByChatAndUserId(
    userId: string,
    chatId: string,
    tx?: TransactionClient,
  ): Promise<Chat | null> {
    const client = tx || prisma();
    return client.chat.findFirst({
      where: {
        userId,
        id: chatId,
      },
    });
  }

  static async listUserChats(userId: string, tx?: TransactionClient): Promise<Chat[]> {
    const client = tx || prisma();
    return client.chat.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }
}
