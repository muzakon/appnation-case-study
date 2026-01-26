import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolClient } from "pg";
import { PrismaClient } from "../database/prisma/client";
import type { TransactionIsolationLevel } from "../database/prisma/internal/prismaNamespace";
import { lifespan } from "./lifespan";
import { createLogger } from "./logger";
import { appSettings } from "./settings";

const logger = createLogger("Database");

/**
 * Database client type for use throughout the application.
 * This is the Prisma client instance configured with the pg adapter.
 */
export type DatabaseClient = PrismaClient;

/**
 * Transaction client type for use in transactional operations.
 * Omits transaction-specific methods to prevent nested transactions.
 */
export type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

let pool: Pool | null = null;
let prismaClient: PrismaClient | null = null;

function createPool(): Pool {
  return new Pool({
    connectionString: appSettings.database.url,
    max: appSettings.database.poolSize,
    idleTimeoutMillis: appSettings.database.idleTimeout,
    connectionTimeoutMillis: appSettings.database.connectionTimeout,
  });
}

function createPrismaClient(connectionPool: Pool): PrismaClient {
  const adapter = new PrismaPg(connectionPool);

  return new PrismaClient({
    adapter,
    log: appSettings.isDev
      ? [
          { level: "query", emit: "event" },
          { level: "error", emit: "stdout" },
          { level: "warn", emit: "stdout" },
        ]
      : [{ level: "error", emit: "stdout" }],
  });
}

async function testConnection(connectionPool: Pool): Promise<void> {
  let client: PoolClient | null = null;
  try {
    client = await connectionPool.connect();
    await client.query("SELECT 1");
    logger.info("Database connection test successful");
  } finally {
    client?.release();
  }
}

async function startDatabase(): Promise<void> {
  if (prismaClient) {
    logger.warn("Database already initialized");
    return;
  }

  logger.info("Initializing database connection pool...", {
    poolSize: appSettings.database.poolSize,
  });

  pool = createPool();

  pool.on("error", (err) => {
    logger.error("Unexpected database pool error", err);
  });

  pool.on("connect", () => {
    logger.debug("New client connected to pool");
  });

  await testConnection(pool);

  prismaClient = createPrismaClient(pool);
  await prismaClient.$connect();

  logger.info("Database initialized successfully");
}

async function stopDatabase(): Promise<void> {
  if (prismaClient) {
    logger.info("Disconnecting Prisma client...");
    await prismaClient.$disconnect();
    prismaClient = null;
  }

  if (pool) {
    logger.info("Closing database connection pool...");
    await pool.end();
    pool = null;
  }

  logger.info("Database connections closed");
}

lifespan.register({
  name: "Database",
  priority: 100,
  onStart: startDatabase,
  onStop: stopDatabase,
});

/**
 * Returns the Prisma client instance.
 * @throws Error if database is not initialized
 */
export function prisma(): PrismaClient {
  if (!prismaClient) {
    throw new Error("Database not initialized. Call lifecycle.start() first.");
  }
  return prismaClient;
}

/**
 * Returns the underlying connection pool for raw queries.
 * Prefer using Prisma client methods when possible.
 * @throws Error if database is not initialized
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error("Database pool not initialized. Call lifecycle.start() first.");
  }
  return pool;
}

/**
 * Executes a callback within a database transaction.
 * Automatically rolls back on error and commits on success.
 *
 * @param fn - Callback receiving the transaction client
 * @param options - Transaction options (timeout, isolation level)
 * @returns The result of the callback
 *
 * @example
 * ```ts
 * const result = await withTransaction(async (tx) => {
 *   const user = await tx.user.create({ data: { email } });
 *   await tx.workspace.create({ data: { ownerId: user.id } });
 *   return user;
 * });
 * ```
 */
export async function withTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: TransactionIsolationLevel;
  },
): Promise<T> {
  const db = prisma();
  return db.$transaction(fn, options);
}
