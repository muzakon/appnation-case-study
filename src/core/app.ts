import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { AppError } from "../common/errors";

export function createApp() {
  const app = new Elysia()
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
      // Handle Custom App Errors
      if (error instanceof AppError) {
        set.status = error.statusCode;
        return {
          code: error.code,
          detail: error.message,
          details: "details" in error ? error.details : undefined,
        };
      }

      // Handle Validation Errors (Elysia's built-in validation)
      if (code === "VALIDATION") {
        set.status = 400;
        return {
          code: "VALIDATION_ERROR",
          detail: "Validation failed",
          details: error.all,
        };
      }

      // Handle other unknown errors
      console.error(error);
      set.status = 500;
      return {
        code: "INTERNAL_SERVER_ERROR",
        detail: "An unexpected error occurred",
      };
    });
  // .group("/api/v1", (app) => app.use(userRouter).use(taskRouter).use(taskWebhookRouter));

  return app;
}
