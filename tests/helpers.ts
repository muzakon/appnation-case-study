/**
 * Test Helpers
 *
 * Utilities and shared test fixtures.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getRedis } from "../src/core/redis";
import { PrismaClient } from "../src/database/prisma/client";

let _prisma: PrismaClient | null = null;
let _pool: Pool | null = null;

/**
 * Get a Prisma client connected to the test database.
 * Reuses the same client across tests for efficiency.
 */
export function getTestPrisma(): PrismaClient {
  if (!_prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL not set - did test setup run?");
    }

    _pool = new Pool({ connectionString });
    const adapter = new PrismaPg(_pool);
    _prisma = new PrismaClient({ adapter });
  }

  return _prisma;
}

/**
 * Disconnect the test Prisma client.
 * Call this in afterAll if you need to clean up explicitly.
 */
export async function disconnectTestPrisma(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
  }
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

/**
 * Clean all tables in the test database.
 * Useful for resetting state between test suites.
 */
export async function cleanDatabase(): Promise<void> {
  const prisma = getTestPrisma();

  try {
    const tablenames = await prisma.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== "_prisma_migrations")
      .map((name) => `"${name}"`)
      .join(", ");

    if (tables.length > 0) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
  } catch (error) {
    console.error("Error cleaning database:", error);
    throw error;
  }
}

/**
 * Create a test user with sensible defaults.
 */
export async function createTestUser(
  overrides: Partial<{
    id: string;
    email: string;
    name: string;
  }> = {},
) {
  const prisma = getTestPrisma();

  const id = overrides.id ?? crypto.randomUUID();

  return prisma.user.create({
    data: {
      id,
      email: overrides.email ?? `${id}@test.local`,
      name: overrides.name ?? "Test User",
    },
  });
}

/**
 * Create a test chat for a user.
 */
export async function createTestChat(
  userId: string,
  overrides: Partial<{
    id: string;
    title: string;
  }> = {},
) {
  const prisma = getTestPrisma();
  return prisma.chat.create({
    data: {
      id: overrides.id ?? crypto.randomUUID(),
      title: overrides.title ?? "Test Chat",
      userId,
    },
  });
}

/**
 * Create a test message in a chat.
 */
export async function createTestMessage(
  chatId: string,
  overrides: Partial<{
    role: "user" | "assistant";
    content: string;
  }> = {},
) {
  const prisma = getTestPrisma();
  return prisma.message.create({
    data: {
      chatId,
      role: overrides.role ?? "user",
      content: overrides.content ?? "Hello",
    },
  });
}

/**
 * Clean Redis data.
 */
export async function cleanRedis(): Promise<void> {
  const redis = getRedis();
  if ("sendCommand" in redis) {
    await (redis as any).sendCommand(["FLUSHALL"]);
  } else if ("flushall" in redis) {
    await (redis as any).flushall();
  } else if ("flushAll" in redis) {
    await (redis as any).flushAll();
  }
}
