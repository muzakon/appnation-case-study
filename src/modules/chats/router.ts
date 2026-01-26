import { ErrorResponse } from "../../common/dtos";
import { createRouter } from "../../common/router";
import { ChatParams } from "./dto/request.dto";
import type { ChatService } from "./service";

export type ChatRouterDeps = {
  chatService: ChatService;
};

export const createChatsRouter = ({ chatService }: ChatRouterDeps) =>
  createRouter("chats")
    .decorate("chatService", chatService)
    .get(
      "/",
      async ({ decodedToken, chatService }) => {
        return await chatService.listUserChats(decodedToken);
      },
      {
        // body: CreateTaskRequestDTO,
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
        // body: CreateTaskRequestDTO,
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
      async ({ decodedToken, params, chatService }) => {
        return await chatService.getUserChatCompletion(decodedToken, params.chatId);
      },
      {
        params: ChatParams,
        // body: CreateTaskRequestDTO,
        response: {
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          500: ErrorResponse,
        },
        detail: {
          tags: ["Chats"],
          description: "AI completion with streaming (SSE)",
        },
      },
    );
