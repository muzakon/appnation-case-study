import { prisma, type TransactionClient } from "../../core/database";
import type { User } from "../../database/prisma/client";

export class UserRepository {
  static async findUser(id: string, tx?: TransactionClient): Promise<User | null> {
    const client = tx || prisma();
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
