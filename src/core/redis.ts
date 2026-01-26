import { RedisClient } from "bun";
import { defineService } from "./lifespan";
import { createLogger } from "./logger";
import { appSettings } from "./settings";

const logger = createLogger("Redis");

const redis = defineService({
  name: "Redis",
  priority: 90,
  connect: async () => {
    logger.info("Connecting to Redis...");
    const client = new RedisClient(appSettings.redis.url, {});
    await client.connect();
    await client.ping();
    logger.info("Redis connected");
    return client;
  },
  disconnect: async (client) => {
    logger.info("Disconnecting from Redis...");
    await client.close();
    logger.info("Redis disconnected");
  },
});

redis.register();

export const getRedis = redis.get;
