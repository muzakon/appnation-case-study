import { readFile } from "node:fs/promises";
import type { logger as baseLogger } from "../../logger";
import { parseYamlFlags } from "../parser";
import type { FeatureFlagProvider, FeatureFlagRecord } from "../types";

type LoggerLike = typeof baseLogger;

type FileProviderOptions = {
  path: string;
  logger: LoggerLike;
};

export class FileFeatureFlagProvider implements FeatureFlagProvider {
  private readonly path: string;
  private readonly logger: LoggerLike;
  private cache: FeatureFlagRecord = {};
  private loaded = false;

  constructor(options: FileProviderOptions) {
    this.path = options.path;
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
      const contents = await readFile(this.path, "utf8");
      const parsed = this.parseFlags(contents);
      this.cache = parsed;
      this.loaded = true;
    } catch (error) {
      this.logger.error("Failed to load feature flags file", {
        path: this.path,
        error,
      });
      throw error;
    }
  }

  private parseFlags(contents: string): FeatureFlagRecord {
    return parseYamlFlags(contents);
  }
}
