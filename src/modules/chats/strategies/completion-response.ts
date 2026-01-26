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
    const chunks = result.content.split(" ").filter(Boolean);

    const stream = new ReadableStream({
      start(controller) {
        const send = (event: string, payload: unknown) => {
          const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        if (result.toolsUsed) {
          send("tool", { toolCalls: result.toolCalls });
        }

        for (const chunk of chunks) {
          send("message", { chunk });
        }

        send("done", { chatId: result.chatId });
        controller.close();
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
