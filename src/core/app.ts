import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { AppError } from "../common/errors";
import {
  authentication,
  clientTypeDetection,
  firebaseAppCheck,
  requestLogger,
} from "../middlewares";

// Modules
import { chatsRouter } from "../modules/chats/router";

export function createApp() {
  const app = new Elysia()
    // 1. Logging (Request Logger) - Logs responses
    .use(requestLogger)

    // 2. Error Handling - Catches errors from subsequent middleware and handlers
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
    })

    // 3. Firebase App Check Verification (Mock)
    .use(firebaseAppCheck)

    // 4. Authentication (JWT validation - Mock)
    .use(authentication)

    // 5. Client type detection
    .use(clientTypeDetection)

    // 6. Request validation (Implicit in Elysia routes, but defined here in the chain logic)

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
