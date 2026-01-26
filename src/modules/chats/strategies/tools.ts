import type { FeatureFlagService } from "../../../core/feature-flags";
import type { ToolCall } from "../types";

export type ToolExecutionContext = {
  chatId: string;
  userId: string;
};

export type ToolExecutionResult = {
  toolsUsed: boolean;
  toolCalls: ToolCall[];
};

export interface ToolStrategy {
  execute(context: ToolExecutionContext): Promise<ToolExecutionResult>;
}

export class ToolsEnabledStrategy implements ToolStrategy {
  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const toolCalls: ToolCall[] = [
      {
        name: "mock.search",
        input: {
          query: `latest updates for chat ${context.chatId}`,
        },
        output: {
          summary: "Mocked search result for demo purposes.",
        },
      },
    ];

    return {
      toolsUsed: true,
      toolCalls,
    };
  }
}

export class ToolsDisabledStrategy implements ToolStrategy {
  async execute(): Promise<ToolExecutionResult> {
    return {
      toolsUsed: false,
      toolCalls: [],
    };
  }
}

export class ToolStrategySelector {
  private readonly featureFlags: FeatureFlagService;
  private readonly enabled: ToolStrategy;
  private readonly disabled: ToolStrategy;

  constructor(featureFlags: FeatureFlagService, enabled: ToolStrategy, disabled: ToolStrategy) {
    this.featureFlags = featureFlags;
    this.enabled = enabled;
    this.disabled = disabled;
  }

  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const toolsEnabled = await this.featureFlags.isEnabled("AI_TOOLS_ENABLED");
    return toolsEnabled ? this.enabled.execute(context) : this.disabled.execute(context);
  }
}
