import type { DatabaseClient, TransactionClient } from "../../core/database";
import type { TokenUsage } from "../../database/prisma/client";
import type { CreateTokenUsageData } from "./interfaces";

export class TokenUsageRepository {
  private readonly db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.db = db;
  }

  async create(data: CreateTokenUsageData, tx?: TransactionClient): Promise<TokenUsage> {
    const client = tx ?? this.db;
    return client.tokenUsage.create({ data });
  }

  async findByUserId(
    userId: string,
    options?: { limit?: number; tx?: TransactionClient },
  ): Promise<TokenUsage[]> {
    const client = options?.tx ?? this.db;
    return client.tokenUsage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: options?.limit,
    });
  }

  async findByChatId(chatId: string, options?: { tx?: TransactionClient }): Promise<TokenUsage[]> {
    const client = options?.tx ?? this.db;
    return client.tokenUsage.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getTotalUsageByUser(
    userId: string,
    options?: { since?: Date; tx?: TransactionClient },
  ): Promise<{ inputTokens: number; outputTokens: number; totalTokens: number }> {
    const client = options?.tx ?? this.db;
    const result = await client.tokenUsage.aggregate({
      where: {
        userId,
        ...(options?.since ? { createdAt: { gte: options.since } } : {}),
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
      },
    });

    return {
      inputTokens: result._sum.inputTokens ?? 0,
      outputTokens: result._sum.outputTokens ?? 0,
      totalTokens: result._sum.totalTokens ?? 0,
    };
  }
}
