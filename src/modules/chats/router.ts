import { sse } from "elysia";
import { vercelAIManager } from "../../common/ai-sdk";
import { ErrorResponse } from "../../common/dtos";
import type { RedisManager } from "../../common/redis";
import { createRouter } from "../../common/router";
import type { FeatureFlagService } from "../../core/feature-flags";
import { createRateLimitMiddleware } from "../../middlewares/rate-limit";
import { ChatParams, CreateChat } from "./dto/request.dto";
import type { ChatService } from "./service";
import type { ChatCompletionResponseSelector, SSEEvent } from "./strategies";

export type ChatRouterDeps = {
  chatService: ChatService;
  completionResponder: ChatCompletionResponseSelector;
  redis: RedisManager;
  featureFlags: FeatureFlagService;
};

export const createChatsRouter = ({
  chatService,
  completionResponder,
  redis,
  featureFlags,
}: ChatRouterDeps) => {
  const completionRateLimiter = createRateLimitMiddleware({
    redis,
    featureFlags,
    keyPrefix: "completion",
  });

  return createRouter("chats")
    .decorate("chatService", chatService)
    .decorate("completionResponder", completionResponder)
    .get(
      "/",
      async ({ decodedToken, chatService }) => {
        return await chatService.listUserChats(decodedToken);
      },
      {
        response: {
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          500: ErrorResponse,
        },
        detail: {
          tags: ["Chats"],
          description: "List of user's chats",
        },
      },
    )
    .get(
      "/:chatId/history",
      async ({ decodedToken, params, chatService }) => {
        return await chatService.getChatHistory(decodedToken, params.chatId);
      },
      {
        params: ChatParams,
        response: {
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          500: ErrorResponse,
        },
        detail: {
          tags: ["Chats"],
          description: "Message history for a specific chat",
        },
      },
    )
    .post(
      "/:chatId/completion",
      async function* ({ body, decodedToken, params, chatService, completionResponder, set }) {
        await completionRateLimiter({ decodedToken, set });

        const streamingEnabled = await completionResponder.isStreamingEnabled();

        if (!streamingEnabled) {
          const result = await chatService.getUserChatCompletion(
            decodedToken,
            params.chatId,
            body.prompt,
          );
          return result;
        }

        yield sse({
          event: "thinking",
          data: { status: "Processing your request..." },
        } satisfies SSEEvent);

        const result = await chatService.getUserChatCompletion(
          decodedToken,
          params.chatId,
          body.prompt,
        );

        if (result.toolsUsed && result.toolCalls.length > 0) {
          for (const toolCall of result.toolCalls) {
            yield sse({
              event: "tool_execution",
              data: { tool: toolCall.name, status: "start", input: toolCall.input },
            } satisfies SSEEvent);

            yield sse({
              event: "tool_execution",
              data: { tool: toolCall.name, status: "complete", output: toolCall.output },
            } satisfies SSEEvent);
          }

          yield sse({ event: "tool", data: { toolCalls: result.toolCalls } } satisfies SSEEvent);
        }

        yield sse({
          event: "thinking",
          data: { status: "Generating response..." },
        } satisfies SSEEvent);

        for await (const chunk of vercelAIManager.streamTextGenerator(
          result.content,
          result.content,
        )) {
          yield sse({ event: "message", data: { chunk } } satisfies SSEEvent);
        }

        yield sse({
          event: "done",
          data: { chatId: result.chatId, usage: result.usage },
        } satisfies SSEEvent);
      },
      {
        params: ChatParams,
        body: CreateChat,
        response: {
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          429: ErrorResponse,
          500: ErrorResponse,
        },
        detail: {
          tags: ["Chats"],
          description: "AI completion with streaming (SSE)",
        },
      },
    );
};
