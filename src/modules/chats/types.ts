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
