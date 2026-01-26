import type { logger as baseLogger } from "../logger";
import {
  FEATURE_FLAG_DEFINITIONS,
  type FeatureFlagBooleanKey,
  type FeatureFlagDefinition,
  type FeatureFlagKey,
  type FeatureFlagNumberKey,
  type FeatureFlagValues,
} from "./definitions";
import type { FeatureFlagProvider, RawFlagValue } from "./types";

type LoggerLike = typeof baseLogger;

export class FeatureFlagService {
  private readonly provider: FeatureFlagProvider;
  private readonly logger: LoggerLike;

  constructor(provider: FeatureFlagProvider, logger: LoggerLike) {
    this.provider = provider;
    this.logger = logger;
  }

  async get<K extends FeatureFlagKey>(key: K): Promise<FeatureFlagValues[K]> {
    const flags = await this.provider.getFlags();
    const rawValue = flags[key];
    const definition = FEATURE_FLAG_DEFINITIONS[key];
    return this.parseValue(key, definition, rawValue) as FeatureFlagValues[K];
  }

  async isEnabled(key: FeatureFlagBooleanKey): Promise<boolean> {
    const value = await this.get(key);
    return Boolean(value);
  }

  async getNumber(key: FeatureFlagNumberKey): Promise<number> {
    const value = await this.get(key);
    return typeof value === "number" ? value : Number(value);
  }

  async snapshot(): Promise<FeatureFlagValues> {
    const flags = await this.provider.getFlags();
    const result: Partial<FeatureFlagValues> = {};
    const keys = Object.keys(FEATURE_FLAG_DEFINITIONS) as FeatureFlagKey[];

    for (const key of keys) {
      const definition = FEATURE_FLAG_DEFINITIONS[key];
      const value = this.parseValue(key, definition, flags[key]);
      (result as Record<FeatureFlagKey, boolean | number>)[key] = value;
    }

    return result as FeatureFlagValues;
  }

  private parseValue(
    key: FeatureFlagKey,
    definition: FeatureFlagDefinition,
    rawValue: RawFlagValue,
  ): FeatureFlagValues[FeatureFlagKey] {
    if (definition.type === "boolean") {
      return this.parseBoolean(key, definition, rawValue);
    }

    return this.parseNumber(key, definition, rawValue);
  }

  private parseBoolean(
    key: FeatureFlagKey,
    definition: Extract<FeatureFlagDefinition, { type: "boolean" }>,
    rawValue: RawFlagValue,
  ): boolean {
    if (rawValue === undefined || rawValue === null) {
      return definition.default;
    }

    if (typeof rawValue === "boolean") {
      return rawValue;
    }

    if (typeof rawValue === "number") {
      return rawValue !== 0;
    }

    if (typeof rawValue === "string") {
      const normalized = rawValue.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(normalized)) {
        return true;
      }
      if (["false", "0", "no", "off"].includes(normalized)) {
        return false;
      }
    }

    this.logger.warn("Invalid boolean feature flag value, using default", {
      key,
      rawValue,
      defaultValue: definition.default,
    });
    return definition.default;
  }

  private parseNumber(
    key: FeatureFlagKey,
    definition: Extract<FeatureFlagDefinition, { type: "number" }>,
    rawValue: RawFlagValue,
  ): number {
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return definition.default;
    }

    const parsed = typeof rawValue === "number" ? rawValue : Number(rawValue);
    if (Number.isNaN(parsed)) {
      this.logger.warn("Invalid numeric feature flag value, using default", {
        key,
        rawValue,
        defaultValue: definition.default,
      });
      return definition.default;
    }

    if (definition.min !== undefined && parsed < definition.min) {
      this.logger.warn("Numeric feature flag below minimum, using default", {
        key,
        rawValue,
        min: definition.min,
        defaultValue: definition.default,
      });
      return definition.default;
    }

    if (definition.max !== undefined && parsed > definition.max) {
      this.logger.warn("Numeric feature flag above maximum, using default", {
        key,
        rawValue,
        max: definition.max,
        defaultValue: definition.default,
      });
      return definition.default;
    }

    return parsed;
  }
}
