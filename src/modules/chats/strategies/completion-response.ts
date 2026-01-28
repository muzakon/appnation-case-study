import type { FeatureFlagService } from "../../../core/feature-flags";
import type { ChatCompletionResult, TokenUsageInfo, ToolCall } from "../types";

export type SSEEvent =
  | { event: "thinking"; data: { status: string } }
  | {
      event: "tool_execution";
      data: { tool: string; status: "start" | "complete"; input?: unknown; output?: unknown };
    }
  | { event: "tool"; data: { toolCalls: ToolCall[] } }
  | { event: "message"; data: { chunk: string } }
  | { event: "done"; data: { chatId: string; usage: TokenUsageInfo } }
  | { event: "error"; data: { message: string; code?: string } };

export type CompletionResponse =
  | { type: "json"; result: ChatCompletionResult }
  | { type: "stream"; result: ChatCompletionResult };

export interface CompletionResponseStrategy {
  getResponseType(): "json" | "stream";
  prepareResponse(result: ChatCompletionResult): CompletionResponse;
}

export class JsonCompletionResponseStrategy implements CompletionResponseStrategy {
  getResponseType(): "json" {
    return "json";
  }

  prepareResponse(result: ChatCompletionResult): CompletionResponse {
    return { type: "json", result };
  }
}

export class StreamingCompletionResponseStrategy implements CompletionResponseStrategy {
  getResponseType(): "stream" {
    return "stream";
  }

  prepareResponse(result: ChatCompletionResult): CompletionResponse {
    return { type: "stream", result };
  }
}

export class ChatCompletionResponseSelector {
  private readonly featureFlags: FeatureFlagService;
  private readonly streaming: CompletionResponseStrategy;
  private readonly json: CompletionResponseStrategy;

  constructor(
    featureFlags: FeatureFlagService,
    streaming: CompletionResponseStrategy,
    json: CompletionResponseStrategy,
  ) {
    this.featureFlags = featureFlags;
    this.streaming = streaming;
    this.json = json;
  }

  async isStreamingEnabled(): Promise<boolean> {
    return this.featureFlags.isEnabled("STREAMING_ENABLED");
  }

  async prepareResponse(result: ChatCompletionResult): Promise<CompletionResponse> {
    const streamingEnabled = await this.isStreamingEnabled();
    const strategy = streamingEnabled ? this.streaming : this.json;
    return strategy.prepareResponse(result);
  }
}
