import { vercelAIManager } from "../../../common/ai-sdk";
import type { FeatureFlagService } from "../../../core/feature-flags";
import type { ChatCompletionResult } from "../types";

export interface ChatCompletionResponseStrategy {
  respond(result: ChatCompletionResult): Promise<Response | ChatCompletionResult>;
}

export class JsonCompletionResponseStrategy implements ChatCompletionResponseStrategy {
  async respond(result: ChatCompletionResult): Promise<ChatCompletionResult> {
    return result;
  }
}

export class StreamingCompletionResponseStrategy implements ChatCompletionResponseStrategy {
  async respond(result: ChatCompletionResult): Promise<Response> {
    const encoder = new TextEncoder();
    const { textStream } = await vercelAIManager.streamText(result.content, result.content);

    const stream = new ReadableStream({
      start(controller) {
        const send = (event: string, payload: unknown) => {
          const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        if (result.toolsUsed) {
          send("tool", { toolCalls: result.toolCalls });
        }

        void (async () => {
          try {
            for await (const chunk of textStream) {
              send("message", { chunk });
            }

            send("done", { chatId: result.chatId });
          } catch (error) {
            send("error", {
              message: error instanceof Error ? error.message : "Streaming error",
            });
          } finally {
            controller.close();
          }
        })();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }
}

export class ChatCompletionResponseSelector {
  private readonly featureFlags: FeatureFlagService;
  private readonly streaming: ChatCompletionResponseStrategy;
  private readonly json: ChatCompletionResponseStrategy;

  constructor(
    featureFlags: FeatureFlagService,
    streaming: ChatCompletionResponseStrategy,
    json: ChatCompletionResponseStrategy,
  ) {
    this.featureFlags = featureFlags;
    this.streaming = streaming;
    this.json = json;
  }

  async respond(result: ChatCompletionResult): Promise<Response | ChatCompletionResult> {
    const streamingEnabled = await this.featureFlags.isEnabled("STREAMING_ENABLED");
    return streamingEnabled ? this.streaming.respond(result) : this.json.respond(result);
  }
}
