import type { logger as baseLogger } from "../../logger";
import { parseYamlFlags } from "../parser";
import type { FeatureFlagProvider, FeatureFlagRecord } from "../types";

type LoggerLike = typeof baseLogger;

type FileProviderOptions = {
  logger: LoggerLike;
};

export class FileFeatureFlagProvider implements FeatureFlagProvider {
  private readonly logger: LoggerLike;
  private cache: FeatureFlagRecord = {};
  private loaded = false;

  constructor(options: FileProviderOptions) {
    this.logger = options.logger;
  }

  async getFlags(): Promise<FeatureFlagRecord> {
    if (!this.loaded) {
      await this.loadFlags();
    }
    return this.cache;
  }

  private async loadFlags(): Promise<void> {
    try {
      const parsed = this.parseFlags();
      this.cache = parsed;
      this.loaded = true;
    } catch (error) {
      this.logger.error("Failed to load feature flags file", {
        error,
      });
      throw error;
    }
  }

  private parseFlags(): FeatureFlagRecord {
    return parseYamlFlags();
  }
}
