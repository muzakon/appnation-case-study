import type { RedisClient } from "bun";

export type RateLimitResult = {
  limited: boolean;
  remaining: number;
  resetInSeconds: number;
  limit: number;
};

export class RedisManager {
  private readonly client: RedisClient;

  constructor(client: RedisClient) {
    this.client = client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, exSeconds?: number): Promise<void> {
    if (exSeconds) {
      await this.client.set(key, value, "EX", exSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * Sliding window rate limiter using Redis
   * @param identifier - Unique identifier (e.g., userId, IP address)
   * @param limit - Maximum requests allowed in the window
   * @param windowSeconds - Time window in seconds (default: 60 for per-minute)
   */
  async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds = 60,
  ): Promise<RateLimitResult> {
    const key = `ratelimit:${identifier}`;

    const count = await this.incr(key);

    if (count === 1) {
      await this.expire(key, windowSeconds);
    }

    const ttl = await this.ttl(key);

    return {
      limited: count > limit,
      remaining: Math.max(0, limit - count),
      resetInSeconds: ttl > 0 ? ttl : windowSeconds,
      limit,
    };
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getRateLimitStatus(
    identifier: string,
    limit: number,
    windowSeconds = 60,
  ): Promise<RateLimitResult> {
    const key = `ratelimit:${identifier}`;
    const countStr = await this.get(key);
    const count = countStr ? parseInt(countStr, 10) : 0;
    const ttl = await this.ttl(key);

    return {
      limited: count >= limit,
      remaining: Math.max(0, limit - count),
      resetInSeconds: ttl > 0 ? ttl : windowSeconds,
      limit,
    };
  }
}
