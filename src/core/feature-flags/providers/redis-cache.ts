import type { RedisCache } from "../../../common/redis";
import type { logger as baseLogger } from "../../logger";
import { appSettings } from "../../settings";
import type { FeatureFlagProvider, FeatureFlagRecord } from "../types";

type LoggerLike = typeof baseLogger;

type RedisCachedFeatureFlagProviderOptions = {
  provider: FeatureFlagProvider;
  cache: RedisCache;
  logger: LoggerLike;
  ttlSeconds?: number;
  cacheKey?: string;
  lockTtlMs?: number;
  waitMs?: number;
  waitIntervalMs?: number;
};

export class RedisCachedFeatureFlagProvider implements FeatureFlagProvider {
  private readonly provider: FeatureFlagProvider;
  private readonly cache: RedisCache;
  private readonly logger: LoggerLike;
  private readonly ttlSeconds: number;
  private readonly cacheKey: string;
  private readonly lockTtlMs: number;
  private readonly waitMs: number;
  private readonly waitIntervalMs: number;

  constructor(options: RedisCachedFeatureFlagProviderOptions) {
    this.provider = options.provider;
    this.cache = options.cache;
    this.logger = options.logger;
    this.ttlSeconds = options.ttlSeconds ?? appSettings.featureFlags.ttl;
    this.cacheKey = options.cacheKey ?? `feature_flags:${appSettings.env}`;
    this.lockTtlMs = options.lockTtlMs ?? 5000;
    this.waitMs = options.waitMs ?? 1000;
    this.waitIntervalMs = options.waitIntervalMs ?? 100;
  }

  async getFlags(): Promise<FeatureFlagRecord> {
    return this.cache.getOrSetJson<FeatureFlagRecord>(
      this.cacheKey,
      async () => {
        this.logger.debug("Feature flag cache miss, refreshing from provider", {
          cacheKey: this.cacheKey,
        });
        return this.provider.getFlags();
      },
      {
        ttlSeconds: this.ttlSeconds,
        lockTtlMs: this.lockTtlMs,
        waitMs: this.waitMs,
        waitIntervalMs: this.waitIntervalMs,
      },
    );
  }
}
