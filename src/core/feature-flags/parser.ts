import features from "../../../config/feature-flags.yaml";
import type { FeatureFlagRecord } from "./types";

export function parseYamlFlags(): FeatureFlagRecord {
  return features;
}
