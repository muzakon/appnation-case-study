import { prisma, type TransactionClient } from "../../core/database";
import type { Message } from "../../database/prisma/client";

export class MessageRepository {
  static async findMessages(chatId: string, tx?: TransactionClient): Promise<Message[]> {
    const client = tx || prisma();
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
