export type FeatureFlagType = "boolean" | "number";

export interface FeatureFlagConfig {
  value?: string | number | boolean;
  type: FeatureFlagType;
  default: string | number | boolean;
  min?: number;
  max?: number;
  description?: string;
}

export type FeatureFlagRecord = Record<string, FeatureFlagConfig>;

export interface FeatureFlagProvider {
  getFlags(): Promise<FeatureFlagRecord>;
}
