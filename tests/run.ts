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
    await setup();

    const env = {
      ...process.env,
      TEST_RUNNER_ACTIVE: "1",
      DATABASE_URL: getTestDatabaseUrl(),
    };

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
    // Ne olursa olsun, fail vb. bile olsa teardown'a girmesini istiyoruz.
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
