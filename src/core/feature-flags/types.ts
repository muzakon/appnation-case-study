export type RawFlagValue = string | number | boolean | null | undefined;

export type FeatureFlagRecord = Record<string, RawFlagValue>;

export interface FeatureFlagProvider {
  getFlags(): Promise<FeatureFlagRecord>;
}
