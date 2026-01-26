export type FeatureFlagDefinition =
  | {
      type: "boolean";
      default: boolean;
    }
  | {
      type: "number";
      default: number;
      min?: number;
      max?: number;
    };

export const FEATURE_FLAG_DEFINITIONS = {
  STREAMING_ENABLED: {
    type: "boolean",
    default: true,
  },
  PAGINATION_LIMIT: {
    type: "number",
    default: 20,
    min: 10,
    max: 100,
  },
  AI_TOOLS_ENABLED: {
    type: "boolean",
    default: false,
  },
  CHAT_HISTORY_ENABLED: {
    type: "boolean",
    default: true,
  },
  CHAT_HISTORY_LIMIT: {
    type: "number",
    default: 10,
    min: 1,
    max: 100,
  },
} as const satisfies Record<string, FeatureFlagDefinition>;

export type FeatureFlagKey = keyof typeof FEATURE_FLAG_DEFINITIONS;

type FlagValue<T extends FeatureFlagDefinition> = T["type"] extends "boolean" ? boolean : number;

export type FeatureFlagValues = {
  [K in FeatureFlagKey]: FlagValue<(typeof FEATURE_FLAG_DEFINITIONS)[K]>;
};

export type FeatureFlagBooleanKey = {
  [K in FeatureFlagKey]: (typeof FEATURE_FLAG_DEFINITIONS)[K]["type"] extends "boolean" ? K : never;
}[FeatureFlagKey];

export type FeatureFlagNumberKey = {
  [K in FeatureFlagKey]: (typeof FEATURE_FLAG_DEFINITIONS)[K]["type"] extends "number" ? K : never;
}[FeatureFlagKey];
