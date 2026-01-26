import { verifyMockFirebaseToken } from "../auth/auth.mock";
import { UnauthorizedError } from "../common/errors";
import { logger } from "../core/logger";

/**
 * Middleware: Authentication (Mock JWT)
 * Validates the Authorization header using mock logic and syncs with DB.
 */
export const authenticationMiddleware =
  () =>
  async ({ request }: { request: Request }) => {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or invalid authorization header");
    }

    const token = authHeader.split(" ")[1];
    try {
      const decodedToken = await verifyMockFirebaseToken(token);
      return { decodedToken };
    } catch (error) {
      logger.error("Authentication failed", error);
      throw new UnauthorizedError("Invalid or expired token");
    }
  };
