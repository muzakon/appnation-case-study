#!/usr/bin/env bun
/**
 * Test Runner
 *
 * Wraps bun test with database setup and teardown.
 * Usage: bun tests/run.ts [bun test args...]
 *
 * This provides guaranteed database cleanup after tests complete,
 * regardless of how tests exit (success, failure, or interrupt).
 */
import { spawn } from "bun";
import { getTestDatabaseUrl, setup, teardown } from "./setup";

async function run() {
  let exitCode = 0;

  try {
    // Setup test database
    await setup();

    // Mark that runner is handling lifecycle
    const env = {
      ...process.env,
      TEST_RUNNER_ACTIVE: "1",
      DATABASE_URL: getTestDatabaseUrl(),
    };

    // Run bun test with forwarded arguments
    const args = process.argv.slice(2);
    const proc = spawn(["bun", "test", ...args], {
      env,
      stdio: ["inherit", "inherit", "inherit"],
    });

    exitCode = await proc.exited;
  } catch (error) {
    console.error("[Test Runner] Error:", error);
    exitCode = 1;
  } finally {
    // Always teardown, even on failure
    try {
      await teardown();
    } catch (teardownError) {
      console.error("[Test Runner] Teardown error:", teardownError);
      exitCode = 1;
    }
  }

  process.exit(exitCode);
}

run();
