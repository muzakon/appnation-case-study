import { TooManyRequestsError } from "../common/errors";
import type { DecodedToken } from "../common/interfaces";
import type { RateLimitResult, RedisManager } from "../common/redis";
import type { FeatureFlagService } from "../core/feature-flags";

export type RateLimitContext = {
  decodedToken: DecodedToken;
  rateLimitResult?: RateLimitResult;
};

export type RateLimitOptions = {
  redis: RedisManager;
  featureFlags: FeatureFlagService;
  keyPrefix?: string;
  windowSeconds?: number;
};

type SetContext = {
  headers: Record<string, string | number>;
};

/**
 * Route-specific rate limiting middleware using Redis
 * Uses the RATE_LIMIT_PER_MINUTE feature flag for dynamic configuration
 */
export const createRateLimitMiddleware = (options: RateLimitOptions) => {
  const { redis, featureFlags, keyPrefix = "api", windowSeconds = 60 } = options;

  return async ({ decodedToken, set }: RateLimitContext & { set: SetContext }) => {
    const limit = await featureFlags.getNumber("RATE_LIMIT_PER_MINUTE");
    const identifier = `${keyPrefix}:${decodedToken.id}`;

    const result = await redis.checkRateLimit(identifier, limit, windowSeconds);

    set.headers["X-RateLimit-Limit"] = result.limit;
    set.headers["X-RateLimit-Remaining"] = result.remaining;
    set.headers["X-RateLimit-Reset"] = result.resetInSeconds;

    if (result.limited) {
      throw new TooManyRequestsError(
        `Rate limit exceeded. Try again in ${result.resetInSeconds} seconds.`,
        {
          retryAfter: result.resetInSeconds,
          limit: result.limit,
        },
      );
    }

    return { rateLimitResult: result };
  };
};
