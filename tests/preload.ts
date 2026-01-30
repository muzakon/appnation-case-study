/**
 * Bun Test Preload
 *
 * This file is loaded before any tests run.
 * When using the test runner (tests/run.ts), setup is already done.
 * When running `bun test` directly, this handles setup.
 *
 * Unit tests (no database needed):
 * - Set SKIP_DB_SETUP=1 to skip database setup
 * - Or run from tests/unit/ or tests/contracts/ directories
 */
import { getTestDatabaseUrl, setup, teardown } from "./setup";

// Check if setup was already done by the test runner
const runnerHandlesLifecycle = process.env.TEST_RUNNER_ACTIVE === "1";

// Check if we should skip database setup (for unit tests)
const skipDbSetup = process.env.SKIP_DB_SETUP === "1" || !process.env.DATABASE_URL;

if (skipDbSetup) {
  console.log("[Test Preload] Skipping database setup (unit test mode)");
} else if (!runnerHandlesLifecycle) {
  // Direct `bun test` invocation - we need to setup
  await setup();

  // Handle graceful shutdown for cleanup
  const signals = ["SIGINT", "SIGTERM"] as const;
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`[Test Preload] Received ${signal}, cleaning up...`);
      await teardown();
      process.exit(0);
    });
  }

  // Note: For direct `bun test`, teardown happens via signals or manual cleanup
  // The test runner (run.ts) provides guaranteed teardown
} else {
  // Runner is active, ensure DATABASE_URL is set for test database
  process.env.DATABASE_URL = getTestDatabaseUrl();
}

// Export for manual use in tests if needed
export { setup, teardown };
