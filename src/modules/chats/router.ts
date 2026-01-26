import { ErrorResponse } from "../../common/dtos";
import { createRouter } from "../../common/router";
import { ChatParams } from "./dto/request.dto";
import { ChatService } from "./service";

export const chatsRouter = createRouter("chats")
  .get(
    "/",
    async ({ decodedToken }) => {
      return await ChatService.listUserChats(decodedToken);
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
    async ({ decodedToken, params }) => {
      return await ChatService.getChatHistory(decodedToken, params.chatId);
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
    async ({ decodedToken, params }) => {
      return await ChatService.getUserChatCompletion(decodedToken, params.chatId);
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
