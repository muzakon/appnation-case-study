import { createApp } from "./core/app";
import { lifespan } from "./core/lifespan";
import { createLogger } from "./core/logger";
import { appSettings } from "./core/settings";

// Lifespan Imports
import "./core/database";
import "./core/redis";

const logger = createLogger("Main");
const PORT = 4000;

async function main() {
  await lifespan.start();
  const app = createApp();

  app.listen({
    port: PORT,
    hostname: appSettings.server.host,
  });

  logger.info(`Server running at http://${appSettings.server.host}:${PORT}`);
  logger.info(`Environment: ${appSettings.env}`);

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    app.stop();
    await lifespan.stop();

    logger.info("Shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", error);
    shutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", reason as Error);
    shutdown("unhandledRejection");
  });
}

main().catch((error) => {
  logger.error("Failed to start application", error);
  process.exit(1);
});
