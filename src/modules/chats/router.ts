import { t } from "elysia";
import { createMockAuthController } from "../../auth/auth.mock";

export const chatsRouter = createMockAuthController("chats")
  .get(
    "/",
    async ({ decodedToken }) => {
      return {};
    },
    {
      params: t.Object({
        chatId: t.String(),
      }),
      // body: CreateTaskRequestDTO,
      // response: {
      //   200: CreateTaskResponseDTO,
      //   400: ErrorResponse,
      //   401: ErrorResponse,
      //   403: ErrorResponse,
      //   404: ErrorResponse,
      //   500: ErrorResponse,
      // },
      detail: {
        tags: ["Chats"],
        description: "List of user's chats",
      },
    },
  )
  .get(
    "/:chatId/history",
    async ({ decodedToken }) => {
      return {};
    },
    {
      params: t.Object({
        chatId: t.String(),
      }),
      // body: CreateTaskRequestDTO,
      // response: {
      //   200: CreateTaskResponseDTO,
      //   400: ErrorResponse,
      //   401: ErrorResponse,
      //   403: ErrorResponse,
      //   404: ErrorResponse,
      //   500: ErrorResponse,
      // },
      detail: {
        tags: ["Chats"],
        description: "Message history for a specific chat",
      },
    },
  )
  .post(
    "/:chatId/completion",
    async ({ decodedToken }) => {
      return {};
    },
    {
      params: t.Object({
        chatId: t.String(),
      }),
      // body: CreateTaskRequestDTO,
      // response: {
      //   200: CreateTaskResponseDTO,
      //   400: ErrorResponse,
      //   401: ErrorResponse,
      //   403: ErrorResponse,
      //   404: ErrorResponse,
      //   500: ErrorResponse,
      // },
      detail: {
        tags: ["Chats"],
        description: "AI completion with streaming (SSE)",
      },
    },
  );
