import { streamText as aiStreamText, generateText, simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";

export type AIChatMessage = {
  role: "user" | "assistant";
  content: Array<{ type: "text"; text: string }>;
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type GenerateTextResult = {
  text: string;
  usage: TokenUsage;
  model: string;
};

export type StreamTextResult = {
  text: string;
  textStream: AsyncIterable<string>;
  usage: TokenUsage;
  model: string;
};

const DEFAULT_MODEL = "mock-gpt-4";

class VercelAIManager {
  private buildResponseText(prompt: string): string {
    if (!prompt.trim()) {
      return "Mocked completion response.";
    }
    return `Thanks for sharing this! I've reviewed the details and everything looks good on my end. I like the direction this is heading, and I think with a bit of fine-tuning we can make it even stronger.

Let me know if you'd like me to take the next step or if there's anything specific you want me to adjust. Happy to iterate 👍`;
  }

  private countTokens(text: string): number {
    // Simple word-based token estimation (roughly 1 token per word)
    // In production, use a proper tokenizer like tiktoken
    const tokens = text.trim().split(/\s+/).filter(Boolean);
    return tokens.length === 0 ? 1 : tokens.length;
  }

  private calculateUsage(prompt: string, output: string): TokenUsage {
    const inputTokens = this.countTokens(prompt);
    const outputTokens = this.countTokens(output);
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }

  private buildInternalUsage(prompt: string, output: string) {
    const inputTokens = this.countTokens(prompt);
    const outputTokens = this.countTokens(output);
    return {
      inputTokens: {
        total: inputTokens,
        noCache: inputTokens,
        cacheRead: undefined,
        cacheWrite: undefined,
      },
      outputTokens: {
        total: outputTokens,
        text: outputTokens,
        reasoning: undefined,
      },
    };
  }

  private hashSeed(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  private createRng(seed: number) {
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let result = state;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  private nextChunkSize(rng: () => number, minWords: number, maxWords: number, chunkIndex: number) {
    const base = Math.floor(rng() * (maxWords - minWords + 1)) + minWords;
    if (chunkIndex % 5 === 4) {
      return base + Math.floor(rng() * 10);
    }
    return base;
  }

  private splitIntoChunks(text: string, prompt: string): string[] {
    const tokens = text.match(/\s+|\S+/g) ?? [];
    const rng = this.createRng(this.hashSeed(`${prompt}:${text.length}`));
    const minWords = 3;
    const maxWords = 12;
    const chunks: string[] = [];
    let current = "";
    let wordCount = 0;
    let chunkIndex = 0;
    let targetWords = this.nextChunkSize(rng, minWords, maxWords, chunkIndex);

    for (const token of tokens) {
      current += token;
      if (!/\s+/.test(token)) {
        wordCount += 1;
        if (/[.!?]$/.test(token) && wordCount >= minWords && rng() < 0.35) {
          chunks.push(current);
          current = "";
          wordCount = 0;
          chunkIndex += 1;
          targetWords = this.nextChunkSize(rng, minWords, maxWords, chunkIndex);
          continue;
        }
      }

      if (wordCount >= targetWords) {
        chunks.push(current);
        current = "";
        wordCount = 0;
        chunkIndex += 1;
        targetWords = this.nextChunkSize(rng, minWords, maxWords, chunkIndex);
      }
    }

    if (current) {
      chunks.push(current);
    }

    return chunks;
  }

  private buildStreamChunks(text: string, prompt: string) {
    const deltas = this.splitIntoChunks(text, prompt);

    return [
      { type: "text-start" as const, id: "text-1" },
      ...deltas.map((delta) => ({
        type: "text-delta" as const,
        id: "text-1",
        delta,
      })),
      { type: "text-end" as const, id: "text-1" },
      {
        type: "finish" as const,
        finishReason: { unified: "stop" as const, raw: undefined },
        logprobs: undefined,
        usage: this.buildInternalUsage(prompt, text),
      },
    ];
  }

  async generateText(options: {
    prompt: string;
    messages?: AIChatMessage[];
  }): Promise<GenerateTextResult> {
    const { prompt, messages } = options;
    const responseText = this.buildResponseText(prompt);
    const input = messages && messages.length > 0 ? { messages } : { prompt };
    const result = await generateText({
      model: new MockLanguageModelV3({
        doGenerate: async () => ({
          content: [{ type: "text", text: responseText }],
          finishReason: { unified: "stop", raw: undefined },
          usage: this.buildInternalUsage(prompt, responseText),
          warnings: [],
        }),
      }),
      ...input,
    });

    return {
      text: result.text,
      usage: this.calculateUsage(prompt, responseText),
      model: DEFAULT_MODEL,
    };
  }

  async streamText(prompt: string, responseText?: string): Promise<StreamTextResult> {
    const text = responseText ?? this.buildResponseText(prompt);
    const result = aiStreamText({
      model: new MockLanguageModelV3({
        doStream: async () => ({
          stream: simulateReadableStream({
            chunks: this.buildStreamChunks(text, prompt),
            chunkDelayInMs: 500,
          }),
        }),
      }),
      prompt,
    });

    return {
      text,
      textStream: result.textStream,
      usage: this.calculateUsage(prompt, text),
      model: DEFAULT_MODEL,
    };
  }

  async *streamTextGenerator(prompt: string, responseText?: string): AsyncGenerator<string> {
    const { textStream } = await this.streamText(prompt, responseText);
    for await (const chunk of textStream) {
      yield chunk;
    }
  }

  /**
   * Calculate token usage for a given prompt and response
   * Useful for pre-calculating usage before storage
   */
  calculateTokenUsage(prompt: string, response: string): TokenUsage {
    return this.calculateUsage(prompt, response);
  }

  getModel(): string {
    return DEFAULT_MODEL;
  }
}

export const vercelAIManager = new VercelAIManager();
