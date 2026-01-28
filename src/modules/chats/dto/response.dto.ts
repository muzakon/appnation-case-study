import { t } from "elysia";

const PaginationCursor = t.Object({
  next: t.Optional(t.String()),
  prev: t.Optional(t.String()),
});

export const UserChatsResponse = t.Object({
  count: t.Number(),
  page: t.Number(),
  pageSize: t.Number(),
  total: t.Number(),
  hasMore: t.Boolean(),
  cursor: PaginationCursor,
  data: t.Array(
    t.Object({
      id: t.String(),
      title: t.String(),
    }),
  ),
});

export const UserChatHistoryResponse = t.Object({
  count: t.Number(),
  page: t.Number(),
  pageSize: t.Number(),
  total: t.Number(),
  hasMore: t.Boolean(),
  cursor: PaginationCursor,
  data: t.Array(
    t.Object({
      id: t.String(),
      role: t.String(),
      content: t.String(),
    }),
  ),
});
