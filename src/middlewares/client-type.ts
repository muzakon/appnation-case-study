/**
 * Middleware: Client Type Detection
 * Detects client type from User-Agent or custom headers.
 */
export const clientTypeDetectionMiddleware =
  () =>
  async ({ request }: { request: Request }) => {
    const userAgent = (request.headers.get("user-agent") || "").toLowerCase();

    let clientType: "mobile" | "web" | "desktop" | "postman" | "unknown" = "unknown";

    switch (true) {
      // Development için bunu da ekleyelim
      case userAgent.includes("postman"):
        clientType = "postman";
        break;

      case userAgent.includes("electron") || userAgent.includes("desktop"):
        clientType = "desktop";
        break;

      case userAgent.includes("mobile") ||
        userAgent.includes("android") ||
        userAgent.includes("iphone"):
        clientType = "mobile";
        break;

      case userAgent.includes("mozilla") && !userAgent.includes("mobile"):
        clientType = "web";
        break;

      default:
        clientType = "unknown";
    }

    return { clientType };
  };
