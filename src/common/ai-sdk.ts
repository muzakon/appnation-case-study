import { streamText as aiStreamText, generateText, simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";

class VercelAIManager {
  private buildResponseText(prompt: string): string {
    if (!prompt.trim()) {
      return "Mocked completion response.";
    }
    return `Thanks for sharing this! I’ve reviewed the details and everything looks good on my end. I like the direction this is heading, and I think with a bit of fine-tuning we can make it even stronger.

Let me know if you’d like me to take the next step or if there’s anything specific you want me to adjust. Happy to iterate 👍`;
  }

  private countTokens(text: string): number {
    const tokens = text.trim().split(/\s+/).filter(Boolean);
    return tokens.length === 0 ? 1 : tokens.length;
  }

  private buildUsage(prompt: string, output: string) {
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
        usage: this.buildUsage(prompt, text),
      },
    ];
  }

  async generateText(prompt: string) {
    const responseText = this.buildResponseText(prompt);
    const result = await generateText({
      model: new MockLanguageModelV3({
        doGenerate: async () => ({
          content: [{ type: "text", text: responseText }],
          finishReason: { unified: "stop", raw: undefined },
          usage: this.buildUsage(prompt, responseText),
          warnings: [],
        }),
      }),
      prompt,
    });

    return result.text;
  }

  async streamText(prompt: string, responseText?: string) {
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
    };
  }
}

export const vercelAIManager = new VercelAIManager();
