import { t } from "elysia";

export const ChatParams = t.Object({
  chatId: t.String(),
});

export const CreateChat = t.Object({
  prompt: t.String(),
});
