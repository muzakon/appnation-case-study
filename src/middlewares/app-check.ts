import { Elysia } from "elysia";
import { UnauthorizedError } from "../common/errors";
import { logger } from "../core/logger";

/**
 * Middleware: Firebase App Check Verification (Mock)
 * Verifies the X-Firebase-AppCheck header.
 */
export const firebaseAppCheckMiddleware = () =>
  new Elysia({ name: "middleware.firebaseAppCheck" }).derive(({ request }) => {
    const appCheckToken = request.headers.get("x-firebase-appcheck");

    if (!appCheckToken) {
      logger.debug("Missing X-Firebase-AppCheck header");
      throw new UnauthorizedError("Missing X-Firebase-AppCheck header");
    }

    return {};
  });
