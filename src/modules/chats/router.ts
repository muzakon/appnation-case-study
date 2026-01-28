import { sse } from "elysia";
import { vercelAIManager } from "../../common/ai-sdk";
import { ErrorResponse } from "../../common/dtos";
import { createRouter } from "../../common/router";
import { rateLimitMiddleware } from "../../middlewares/rate-limit";
import { ChatParams, CreateChat, PaginationQuery } from "./dto/request.dto";
import { UserChatHistoryResponse, UserChatsResponse } from "./dto/response.dto";
import type { ChatRouterDeps } from "./interfaces";
import type { SSEEvent } from "./strategies";

export const createChatsRouter = ({
  chatService,
  completionResponder,
  redis,
  featureFlags,
}: ChatRouterDeps) => {
  return createRouter("chats")
    .derive(
      rateLimitMiddleware({
        redis,
        featureFlags,
        windowSeconds: 60,
      }),
    )
    .decorate("chatService", chatService)
    .decorate("completionResponder", completionResponder)
    .get(
      "/",
      async ({ decodedToken, chatService, query }) => {
        return await chatService.listUserChats(decodedToken, query);
      },
      {
        query: PaginationQuery,
        response: {
          200: UserChatsResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          429: ErrorResponse,
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
      async ({ decodedToken, params, chatService, query }) => {
        return await chatService.getChatHistory(decodedToken, params.chatId, query);
      },
      {
        params: ChatParams,
        query: PaginationQuery,
        response: {
          200: UserChatHistoryResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          429: ErrorResponse,
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
      async function* ({ body, decodedToken, params, chatService, completionResponder }) {
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
