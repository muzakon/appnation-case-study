import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { createApp } from "../../src/core/app";
import { lifespan } from "../../src/core/lifespan";
import {
  cleanDatabase,
  cleanRedis,
  createTestChat,
  createTestMessage,
  createTestUser,
} from "../helpers";

// Lifespan dependencies
import "../../src/core/database";
import "../../src/core/redis";

// 1. Define default flags matching config/feature-flags.yaml structure
const defaultFlags = {
  STREAMING_ENABLED: { type: "boolean", value: true, default: true },
  PAGINATION_LIMIT: { type: "number", value: 20, default: 20, min: 10, max: 100 },
  AI_TOOLS_ENABLED: { type: "boolean", value: false, default: false },
  CHAT_HISTORY_ENABLED: { type: "boolean", value: false, default: true },
  RATE_LIMIT_PER_MINUTE: { type: "number", value: 5, default: 60, min: 1, max: 1000 },
};

// 2. Create a mutable flags object for testing
let currentFlags: any = JSON.parse(JSON.stringify(defaultFlags));

// 3. Mock the parser module BEFORE any app/container logic loads it
mock.module("../../src/core/feature-flags/parser", () => ({
  parseYamlFlags: () => currentFlags,
}));

describe("Feature Flags E2E", () => {
  let app: any;
  let user: any;
  let chat: any;
  let authHeader: string;
  const appCheckHeader = "mock-app-check-token";

  beforeAll(async () => {
    await lifespan.start();
  });

  afterAll(async () => {
    await lifespan.stop();
  });

  beforeEach(async () => {
    currentFlags = JSON.parse(JSON.stringify(defaultFlags));
    await cleanDatabase();
    await cleanRedis();
    user = await createTestUser();
    chat = await createTestChat(user.id);

    authHeader = `Bearer mock:email=${user.email}:id=${user.id}`;
    app = createApp();
  });

  // --- 1. STREAMING_ENABLED ---
  describe("STREAMING_ENABLED", () => {
    it("should return SSE stream when STREAMING_ENABLED is true", async () => {
      currentFlags.STREAMING_ENABLED.value = true;
      app = createApp();

      const response = await app.handle(
        new Request(`http://localhost/api/chats/${chat.id}/completion`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            "x-firebase-appcheck": appCheckHeader,
          },
          body: JSON.stringify({
            prompt: "Hello",
          }),
        }),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/event-stream");

      // Consume the stream to ensure background tasks (like saving messages) complete
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }
    }, 15000);

    it("should return regular JSON response when STREAMING_ENABLED is false", async () => {
      currentFlags.STREAMING_ENABLED.value = false;
      app = createApp();

      const response = await app.handle(
        new Request(`http://localhost/api/chats/${chat.id}/completion`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            "x-firebase-appcheck": appCheckHeader,
          },
          body: JSON.stringify({
            prompt: "Hello",
          }),
        }),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("application/json");

      const body = await response.json();
      expect(body.chatId).toBe(chat.id);
      expect(body.content).toBeDefined();
    });
  });

  // --- 2. PAGINATION_LIMIT ---
  describe("PAGINATION_LIMIT", () => {
    it("should limit chat list to PAGINATION_LIMIT", async () => {
      // Create 15 more chats (total 16 with the one in beforeEach)
      for (let i = 0; i < 15; i++) {
        await createTestChat(user.id, { title: `Chat ${i}` });
      }

      currentFlags.PAGINATION_LIMIT.value = 10;
      app = createApp();

      const response = await app.handle(
        new Request("http://localhost/api/chats", {
          method: "GET",
          headers: {
            Authorization: authHeader,
            "x-firebase-appcheck": appCheckHeader,
          },
        }),
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.length).toBe(10);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(16);
    });
  });

  // --- 3. AI_TOOLS_ENABLED ---
  describe("AI_TOOLS_ENABLED", () => {
    it("should include tool calls when AI_TOOLS_ENABLED is true", async () => {
      currentFlags.AI_TOOLS_ENABLED.value = true;
      currentFlags.STREAMING_ENABLED.value = false;
      app = createApp();

      const response = await app.handle(
        new Request(`http://localhost/api/chats/${chat.id}/completion`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            "x-firebase-appcheck": appCheckHeader,
          },
          body: JSON.stringify({
            prompt: "Use a tool please",
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.toolsUsed).toBe(true);
      expect(body.toolCalls.length).toBeGreaterThan(0);
      expect(body.toolCalls[0].name).toBe("mock.search");
    });

    it("should NOT include tool calls when AI_TOOLS_ENABLED is false", async () => {
      currentFlags.AI_TOOLS_ENABLED.value = false;
      currentFlags.STREAMING_ENABLED.value = false;
      app = createApp();

      const response = await app.handle(
        new Request(`http://localhost/api/chats/${chat.id}/completion`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            "x-firebase-appcheck": appCheckHeader,
          },
          body: JSON.stringify({
            prompt: "Hello",
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.toolsUsed).toBe(false);
      expect(body.toolCalls.length).toBe(0);
    });
  });

  // --- 4. CHAT_HISTORY_ENABLED ---
  describe("CHAT_HISTORY_ENABLED", () => {
    it("should return full history when CHAT_HISTORY_ENABLED is true", async () => {
      for (let i = 0; i < 15; i++) {
        await createTestMessage(chat.id, { content: `Msg ${i}` });
      }

      currentFlags.CHAT_HISTORY_ENABLED.value = true;
      app = createApp();

      const response = await app.handle(
        new Request(`http://localhost/api/chats/${chat.id}/history`, {
          method: "GET",
          headers: {
            Authorization: authHeader,
            "x-firebase-appcheck": appCheckHeader,
          },
        }),
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.length).toBe(15);
    });

    it("should return only last 10 messages when CHAT_HISTORY_ENABLED is false", async () => {
      // Create 15 messages
      for (let i = 0; i < 15; i++) {
        await createTestMessage(chat.id, { content: `Msg ${i}` });
      }

      currentFlags.CHAT_HISTORY_ENABLED.value = false;
      app = createApp();

      const response = await app.handle(
        new Request(`http://localhost/api/chats/${chat.id}/history`, {
          method: "GET",
          headers: {
            Authorization: authHeader,
            "x-firebase-appcheck": appCheckHeader,
          },
        }),
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      // Service.ts has RECENT_MESSAGES_LIMIT = 10
      expect(result.data.length).toBe(10);
      expect(result.hasMore).toBe(false);
    });
  });

  // --- 5. RATE_LIMIT_PER_MINUTE ---
  describe("RATE_LIMIT_PER_MINUTE", () => {
    it("should enforce rate limit based on flag", async () => {
      currentFlags.RATE_LIMIT_PER_MINUTE.value = 2;
      app = createApp();

      const makeRequest = () =>
        app.handle(
          new Request("http://localhost/api/chats", {
            method: "GET",
            headers: {
              Authorization: authHeader,
              "x-firebase-appcheck": appCheckHeader,
            },
          }),
        );

      // 1st request - OK
      const res1 = await makeRequest();
      expect(res1.status).toBe(200);

      // 2nd request - OK
      const res2 = await makeRequest();
      expect(res2.status).toBe(200);

      // 3rd request - Limited
      const res3 = await makeRequest();
      expect(res3.status).toBe(429);

      const body = await res3.json();
      expect(body.code).toBe("TOO_MANY_REQUESTS");
    });
  });
});
