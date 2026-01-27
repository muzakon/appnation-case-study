import { ErrorResponse } from "../../common/dtos";
import { createRouter } from "../../common/router";
import { ChatParams, CreateChat } from "./dto/request.dto";
import type { ChatService } from "./service";
import type { ChatCompletionResponseSelector } from "./strategies";

export type ChatRouterDeps = {
  chatService: ChatService;
  completionResponder: ChatCompletionResponseSelector;
};

export const createChatsRouter = ({ chatService, completionResponder }: ChatRouterDeps) =>
  createRouter("chats")
    .decorate("chatService", chatService)
    .decorate("completionResponder", completionResponder)
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
      async ({ decodedToken, params, chatService, completionResponder }) => {
        const result = await chatService.getUserChatCompletion(decodedToken, params.chatId);
        return completionResponder.respond(result);
      },
      {
        params: ChatParams,
        body: CreateChat,
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
