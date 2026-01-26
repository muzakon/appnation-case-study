import { t } from "elysia";

export const ErrorResponse = t.Object({
  code: t.String(),
  detail: t.String(),
  details: t.Optional(t.Any()),
});
