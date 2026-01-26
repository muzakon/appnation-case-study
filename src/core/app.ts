import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { AppError } from "../common/errors";
// Modules
import { createChatsRouter } from "../modules/chats/router";
import { createAppContainer } from "./container";

export function createApp() {
  const container = createAppContainer();

  const app = new Elysia()
    .decorate("db", container.db)
    .decorate("settings", container.settings)
    .decorate("logger", container.logger)
    .use(
      openapi({
        provider: "swagger-ui",
        swagger: {
          autoDarkMode: false,
        },
        documentation: {
          components: {
            securitySchemes: {
              bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Firebase JWT Bearer token authentication",
              },
            },
          },
          security: [
            {
              bearerAuth: [],
            },
          ],
        },
      }),
    )
    .onError(({ code, error, set }) => {
      if (error instanceof AppError) {
        set.status = error.statusCode;
        return {
          code: error.code,
          detail: error.message,
          details: "details" in error ? error.details : undefined,
        };
      }

      if (code === "VALIDATION") {
        set.status = 400;
        return {
          code: "VALIDATION_ERROR",
          detail: "Validation failed",
          details: error.all,
        };
      }

      set.status = 500;
      return {
        code: "INTERNAL_SERVER_ERROR",
        detail: "An unexpected error occurred",
      };
    })
    .group("/api", (app) => app.use(createChatsRouter({ chatService: container.services.chats })));

  return app;
}
