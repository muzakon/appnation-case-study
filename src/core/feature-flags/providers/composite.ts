import type { FeatureFlagProvider, FeatureFlagRecord } from "../types";

export class CompositeFeatureFlagProvider implements FeatureFlagProvider {
  private readonly providers: FeatureFlagProvider[];

  constructor(providers: FeatureFlagProvider[]) {
    this.providers = providers;
  }

  async getFlags(): Promise<FeatureFlagRecord> {
    const merged: FeatureFlagRecord = {};

    for (const provider of this.providers) {
      const flags = await provider.getFlags();
      Object.assign(merged, flags);
    }

    return merged;
  }
}
