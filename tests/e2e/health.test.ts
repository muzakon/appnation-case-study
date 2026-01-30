import { describe, expect, it } from "bun:test";
import { cleanDatabase, createTestUser, getTestPrisma } from "../helpers";
import { TEST_DATABASE_NAME } from "../setup";

describe("E2E Health Check", () => {
  it("should use the test database", () => {
    const dbUrl = process.env.DATABASE_URL;
    expect(dbUrl).toContain(TEST_DATABASE_NAME);
  });

  it("should be able to write and read from the database", async () => {
    await cleanDatabase();

    const user = await createTestUser({ name: "Health Check User" });
    expect(user).toBeDefined();
    expect(user.name).toBe("Health Check User");

    const prisma = getTestPrisma();
    const fetchedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(fetchedUser).toBeDefined();
    expect(fetchedUser?.id).toBe(user.id);
  });
});
