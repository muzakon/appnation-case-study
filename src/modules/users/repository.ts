import type { DatabaseClient, TransactionClient } from "../../core/database";
import type { User } from "../../database/prisma/client";

export class UserRepository {
  private readonly db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.db = db;
  }

  async findUser(id: string, tx?: TransactionClient): Promise<User | null> {
    const client = tx ?? this.db;
    const user = await client.user.findFirst({
      where: {
        id,
      },
    });

    if (!user) {
      return null;
    }

    return user;
  }
}
