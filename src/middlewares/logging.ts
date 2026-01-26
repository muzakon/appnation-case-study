import { Elysia } from "elysia";
import { logger } from "../core/logger";

/**
 * Middleware: Request Logging
 * Logs details about the incoming request and the response status.
 * Corresponds to "Logging" in the requirements.
 */
export const requestLogger = new Elysia({ name: "middleware.requestLogger" }).onAfterResponse(
  ({ request, set, path }) => {
    logger.info(`[${request.method}] ${path} - Status: ${set.status}`);
  },
);
