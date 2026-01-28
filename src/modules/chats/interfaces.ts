import type { RedisManager } from "../../common/redis";
import type { FeatureFlagService } from "../../core/feature-flags";
import type { ChatService } from "./service";
import type { ChatCompletionResponseSelector } from "./strategies";

export type ChatRouterDeps = {
  chatService: ChatService;
  completionResponder: ChatCompletionResponseSelector;
  redis: RedisManager;
  featureFlags: FeatureFlagService;
};

export type PaginationParams = {
  cursor?: string;
  limit?: number | string;
};

export type CursorPage<T> = {
  count: number;
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  cursor: {
    next?: string;
    prev?: string;
  };
  data: T[];
};

export type ToolCall = {
  name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
};

export type TokenUsageInfo = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
};

export type ChatCompletionResult = {
  chatId: string;
  content: string;
  toolsUsed: boolean;
  toolCalls: ToolCall[];
  usage: TokenUsageInfo;
};
