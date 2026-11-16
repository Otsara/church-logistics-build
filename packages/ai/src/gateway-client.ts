/**
 * The browser's model client (ARC-014, ARC-008): posts a step's prompt to the AI gateway with the
 * signed-in user's token and returns the text. It never holds the AI key (SEC-001). Any failure
 * throws, and the runner retries once, then sends the person to manual entry (SYS-009).
 */
import type { AiStepId, ModelClient } from "./step.ts";

export interface GatewayClientOptions {
  /** The Edge Function's URL. */
  readonly url: string;
  readonly stepId: AiStepId;
  /** The signed-in user's access token; null when not signed in. */
  readonly accessToken: () => Promise<string | null>;
  readonly fetch: (url: string, init?: RequestInit) => Promise<Response>;
}

/** A model client that goes through the gateway. */
export function gatewayClient(options: GatewayClientOptions): ModelClient {
  return {
    async complete({ tier, prompt, signal }) {
      const token = await options.accessToken();
      if (token === null) throw new Error("not signed in");
      const response = await options.fetch(options.url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ stepId: options.stepId, tier, prompt }),
        signal,
      });
      if (response.status !== 200) {
        throw new Error(`AI gateway answered ${String(response.status)}`);
      }
      const body = (await response.json()) as { text?: unknown };
      if (typeof body.text !== "string") {
        throw new Error("AI gateway answer has no text");
      }
      return body.text;
    },
  };
}
