import { createMockAuthController } from "../../auth/auth.mock";
import { ErrorResponse } from "../../common/dtos";
import { ChatParams } from "./dto/request.dto";
import { ChatService } from "./service";

export const chatsRouter = createMockAuthController("chats")
  .get(
    "/",
    async ({ decodedToken }) => {
      return await ChatService.listUserChats(decodedToken);
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
        description: "List of user's chats",
      },
    },
  )
  .get(
    "/:chatId/history",
    async ({ decodedToken }) => {
      return await ChatService.getUserChatHistory(decodedToken);
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
    async ({ decodedToken }) => {
      return await ChatService.getUserChatCompletion(decodedToken);
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
