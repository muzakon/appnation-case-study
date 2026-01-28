import { t } from "elysia";

export const ChatParams = t.Object({
  chatId: t.String(),
});

export const CreateChat = t.Object({
  prompt: t.String(),
});

export const PaginationQuery = t.Object({
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.String()),
});
