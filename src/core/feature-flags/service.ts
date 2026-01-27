import type { logger as baseLogger } from "../logger";
import type { FeatureFlagProvider } from "./types";

type LoggerLike = typeof baseLogger;
type FeatureFlagKey =
  | "PAGINATION_LIMIT"
  | "AI_TOOLS_ENABLED"
  | "STREAMING_ENABLED"
  | "CHAT_HISTORY_ENABLED"
  | "CHAT_HISTORY_LIMIT"
  | "RATE_LIMIT_PER_MINUTE";

export class FeatureFlagService {
  private readonly provider: FeatureFlagProvider;
  private readonly logger: LoggerLike;

  constructor(provider: FeatureFlagProvider, logger: LoggerLike) {
    this.provider = provider;
    this.logger = logger;
  }

  async get(key: FeatureFlagKey): Promise<string | number | boolean | undefined> {
    const flags = await this.provider.getFlags();
    const config = flags[key];

    if (!config) {
      this.logger.warn(`Feature flag ${key} not found`);
      return undefined;
    }

    return config.value ?? config.default;
  }

  async isEnabled(key: FeatureFlagKey): Promise<boolean> {
    const value = await this.get(key);
    return Boolean(value);
  }

  async getNumber(key: FeatureFlagKey): Promise<number> {
    const value = await this.get(key);
    return typeof value === "number" ? value : Number(value);
  }
}
