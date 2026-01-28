import { t } from "elysia";

export const UserChatsResponse = t.Array(
  t.Object({
    id: t.String(),
    title: t.String(),
  }),
);

export const UserChatHistoryResponse = t.Array(
  t.Object({
    id: t.String(),
    role: t.String(),
    content: t.String(),
  }),
);
