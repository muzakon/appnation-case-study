/**
 * Test Database Setup
 *
 * This module handles creating and destroying the test database.
 * It's designed to be used with Bun's test runner via preload.
 */

import { execSync } from "node:child_process";
import { Client } from "pg";

const TEST_DATABASE_NAME = "appnation_test";

// Store original DATABASE_URL for cleanup
let originalDatabaseUrl: string | undefined;

// Parse the original DATABASE_URL to extract connection details
function parseConnectionUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number.parseInt(parsed.port, 10) || 5432,
    user: parsed.username,
    password: parsed.password || undefined,
    database: parsed.pathname.slice(1), // Remove leading slash
  };
}

// Get test database URL by replacing the database name
function getTestDatabaseUrl(): string {
  const originalUrl = process.env.DATABASE_URL;
  if (!originalUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const parsed = new URL(originalUrl);
  parsed.pathname = `/${TEST_DATABASE_NAME}`;
  return parsed.toString();
}

// Create the test database
async function createTestDatabase(): Promise<void> {
  const originalUrl = process.env.DATABASE_URL;
  if (!originalUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const connConfig = parseConnectionUrl(originalUrl);

  // Connect to the default database to create the test database
  // We connect to the 'postgres' database or the one in the URL to issue the CREATE DATABASE command
  const client = new Client({
    host: connConfig.host,
    port: connConfig.port,
    user: connConfig.user,
    password: connConfig.password,
    database: connConfig.database,
  });

  try {
    await client.connect();

    // Drop if exists and create fresh
    // Note: We cannot drop the database we are connected to.
    // Usually connecting to 'postgres' is safe for admin tasks.
    // If connConfig.database is the same as TEST_DATABASE_NAME, we might have issues if we try to drop it while connected.
    // However, usually DATABASE_URL points to the dev DB (e.g. appnation), and we create appnation_test.

    await client.query(`DROP DATABASE IF EXISTS "${TEST_DATABASE_NAME}"`);
    await client.query(`CREATE DATABASE "${TEST_DATABASE_NAME}"`);

    console.log(`[Test Setup] Created test database: ${TEST_DATABASE_NAME}`);
  } finally {
    await client.end();
  }
}

// Sync Prisma schema to test database
function syncPrismaSchema(): void {
  const testDatabaseUrl = getTestDatabaseUrl();

  console.log("[Test Setup] Syncing Prisma schema to test database...");

  // Use prisma db push to sync schema without creating migrations
  execSync(`bunx prisma db push --accept-data-loss`, {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "inherit",
    cwd: process.cwd(),
  });

  console.log("[Test Setup] Prisma schema synced successfully");
}

// Drop the test database
async function dropTestDatabase(): Promise<void> {
  const originalUrl = process.env.DATABASE_URL;
  if (!originalUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const connConfig = parseConnectionUrl(originalUrl);

  const client = new Client({
    host: connConfig.host,
    port: connConfig.port,
    user: connConfig.user,
    password: connConfig.password,
    database: connConfig.database,
  });

  try {
    await client.connect();
    // Force drop by terminating other connections first (Postgres specific)
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${TEST_DATABASE_NAME}'
      AND pid <> pg_backend_pid();
    `);
    await client.query(`DROP DATABASE IF EXISTS "${TEST_DATABASE_NAME}"`);
    console.log(`[Test Setup] Dropped test database: ${TEST_DATABASE_NAME}`);
  } finally {
    await client.end();
  }
}

// Global setup - runs once before all tests
export async function setup(): Promise<void> {
  console.log("[Test Setup] Starting test database setup...");

  // Store original URL for cleanup
  originalDatabaseUrl = process.env.DATABASE_URL;

  await createTestDatabase();
  syncPrismaSchema();

  // Set the DATABASE_URL for tests to use
  process.env.DATABASE_URL = getTestDatabaseUrl();

  console.log("[Test Setup] Test database ready");
}

// Global teardown - runs once after all tests
export async function teardown(): Promise<void> {
  console.log("[Test Setup] Starting test database teardown...");

  // Reset to original URL for cleanup
  if (originalDatabaseUrl) {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }

  await dropTestDatabase();

  console.log("[Test Setup] Test database teardown complete");
}

export { getTestDatabaseUrl, TEST_DATABASE_NAME };
