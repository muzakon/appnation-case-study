import { Elysia } from "elysia";
import { verifyMockFirebaseToken } from "../auth/auth.mock";
import { UnauthorizedError } from "../common/errors";
import { prisma } from "../core/database";
import { logger } from "../core/logger";

/**
 * Middleware: Authentication (Mock JWT)
 * Validates the Authorization header using mock logic and syncs with DB.
 */
export const authentication = new Elysia({ name: "middleware.authentication" }).derive(
  async ({ request }) => {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { user: null };
    }

    const token = authHeader.split(" ")[1];

    try {
      const decodedToken = await verifyMockFirebaseToken(token);

      const user = await prisma().user.upsert({
        where: { email: decodedToken.email },
        update: {
          name: decodedToken.name,
        },
        create: {
          email: decodedToken.email,
          name: decodedToken.name,
        },
      });

      return { user };
    } catch (error) {
      logger.error("Authentication failed", error);
      throw new UnauthorizedError("Invalid or expired token");
    }
  },
);
