import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/database/prisma/client";

function createPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

function createPrismaClient(connectionPool: Pool): PrismaClient {
  const adapter = new PrismaPg(connectionPool);

  return new PrismaClient({
    adapter,
  });
}

const pool = createPool();
const prismaClient = createPrismaClient(pool);

async function main() {
  // Fixed UUIDs
  const userId = "a1111111-1111-1111-1111-111111111111";
  const chatId = "b2222222-2222-2222-2222-222222222222";

  const user = await prismaClient.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      id: userId,
      email: "alice@example.com",
      name: "Alice",
      chats: {
        create: {
          id: chatId,
          title: "Alice first chat",
        },
      },
    },
  });

  console.log({ user });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
