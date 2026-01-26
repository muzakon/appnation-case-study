import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { AppError } from "../common/errors";

// Modules
import { chatsRouter } from "../modules/chats/router";

export function createApp() {
  const app = new Elysia()
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

      console.error(error);
      set.status = 500;
      return {
        code: "INTERNAL_SERVER_ERROR",
        detail: "An unexpected error occurred",
      };
    })
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
    .group("/api/", (app) => app.use(chatsRouter));

  return app;
}
