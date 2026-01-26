import { Elysia } from "elysia";

/**
 * Middleware: Client Type Detection
 * Detects client type from User-Agent or custom headers.
 */
export const clientTypeDetectionMiddleware = () =>
  new Elysia({ name: "middleware.clientTypeDetection" }).derive(
    ({ request }: { request: Request }) => {
      const userAgent = request.headers.get("user-agent") || "";
      let clientType: "mobile" | "web" | "desktop" | "unknown" = "unknown";

      if (userAgent.includes("Mozilla") && !userAgent.includes("Mobile")) {
        clientType = "web";
      } else if (
        userAgent.includes("Mobile") ||
        userAgent.includes("Android") ||
        userAgent.includes("iPhone")
      ) {
        clientType = "mobile";
      } else if (userAgent.includes("Electron") || userAgent.includes("Desktop")) {
        clientType = "desktop";
      }

      return { clientType };
    },
  );
