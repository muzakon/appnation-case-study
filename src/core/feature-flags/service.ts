import type { logger as baseLogger } from "../logger";
import type { FeatureFlagProvider } from "./types";

type LoggerLike = typeof baseLogger;

export class FeatureFlagService {
  private readonly provider: FeatureFlagProvider;
  private readonly logger: LoggerLike;

  constructor(provider: FeatureFlagProvider, logger: LoggerLike) {
    this.provider = provider;
    this.logger = logger;
  }

  async get(key: string): Promise<string | number | boolean | undefined> {
    const flags = await this.provider.getFlags();
    const config = flags[key];

    if (!config) {
      this.logger.warn(`Feature flag ${key} not found`);
      return undefined;
    }

    return config.value ?? config.default;
  }

  async isEnabled(key: string): Promise<boolean> {
    const value = await this.get(key);
    return Boolean(value);
  }

  async getNumber(key: string): Promise<number> {
    const value = await this.get(key);
    return typeof value === "number" ? value : Number(value);
  }

  async snapshot(): Promise<Record<string, string | number | boolean>> {
    const flags = await this.provider.getFlags();
    const result: Record<string, string | number | boolean> = {};

    for (const [key, config] of Object.entries(flags)) {
      const value = config.value ?? config.default;
      if (value !== undefined) {
        result[key] = value;
      }
    }

    return result;
  }
}
