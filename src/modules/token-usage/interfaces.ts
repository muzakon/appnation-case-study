export type CreateTokenUsageData = {
  userId: string;
  chatId: string;
  messageId?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
};
