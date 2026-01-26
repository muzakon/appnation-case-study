export type ToolCall = {
  name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
};

export type ChatCompletionResult = {
  chatId: string;
  content: string;
  toolsUsed: boolean;
  toolCalls: ToolCall[];
};
