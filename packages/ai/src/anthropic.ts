/**
 * The gateway's call to the AI service (ARC-014, ADR-008): Claude Haiku 5.5, the lowest-cost
 * model, for every step and tier, at low effort so it thinks as little as the task needs. The
 * SDK's own retries are off, because the runner already retries once (ARC-008), and its time
 * limit is the owner's 30 seconds (OD-058). Only a finished answer is returned; one that was cut
 * off, refused or paused fails, and the runner sends the person to manual entry.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { AI_CALL_TIME_LIMIT_MS } from "./limits.ts";
import type { ModelTier } from "./step.ts";

export const MODEL = "claude-haiku-5-5";

/**
 * Room for the longest answer a step gives (a parsed donor list or a draft letter). A technical
 * setting, not a safety limit: an answer that reaches it is cut off and fails (TC-029).
 */
export const MAX_OUTPUT_TOKENS = 4096;

/** Returns the gateway's `complete` for an SDK client built with the server-side key. */
export function anthropicComplete(client: Anthropic) {
  return async (request: {
    readonly tier: ModelTier;
    readonly prompt: string;
    readonly signal?: AbortSignal;
  }): Promise<string> => {
    const message = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        output_config: { effort: "low" },
        messages: [{ role: "user", content: request.prompt }],
      },
      {
        timeout: AI_CALL_TIME_LIMIT_MS,
        maxRetries: 0,
        ...(request.signal === undefined ? {} : { signal: request.signal }),
      },
    );
    if (message.stop_reason !== "end_turn") {
      throw new Error(`AI answer not finished: ${String(message.stop_reason)}`);
    }
    return message.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("");
  };
}
