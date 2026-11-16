/**
 * The server-side AI gateway (ARC-014; SEC-001, SEC-008). Runs in a Supabase Edge Function that
 * holds the AI key as a secret; the browser never sees it. A request is answered only for a
 * signed-in user, only by POST, and only for a known step, tier and non-empty prompt. Errors from
 * the AI service are not passed on, so nothing it said reaches the browser. Logs nothing about the
 * prompt or the answer (ADR-031). Never throws.
 */
import { z } from "zod";
import type { AiStepId, ModelTier } from "./step.ts";

const STEP_IDS = [
  "AIC-101",
  "AIC-102",
  "AIC-103",
  "AIC-301",
  "AIC-302",
  "AIC-303",
] as const satisfies readonly AiStepId[];

const requestSchema = z.strictObject({
  stepId: z.enum(STEP_IDS),
  tier: z.enum(["cheap", "strong"] satisfies readonly ModelTier[]),
  prompt: z.string().min(1),
});

export interface GatewayRequest {
  readonly method: string;
  /** The Authorization header as received; null when absent. */
  readonly authorization: string | null;
  /** The parsed JSON body; anything when it could not be parsed. */
  readonly body: unknown;
}

export interface GatewayResponse {
  readonly status: number;
  readonly body: { readonly text: string } | { readonly error: string };
}

export interface GatewayDeps {
  /** True when the token belongs to a signed-in user (Supabase Auth). */
  readonly verifyUser: (token: string) => Promise<boolean>;
  /** Calls the AI service with the key held server-side. */
  readonly complete: (request: {
    readonly tier: ModelTier;
    readonly prompt: string;
  }) => Promise<string>;
}

const BEARER = /^Bearer (\S+)$/;

async function signedIn(
  authorization: string | null,
  deps: GatewayDeps,
): Promise<boolean> {
  const token = BEARER.exec(authorization ?? "")?.[1];
  if (token === undefined) return false;
  try {
    return await deps.verifyUser(token);
  } catch {
    return false;
  }
}

/** Answers one gateway request. */
export async function handleGatewayRequest(
  request: GatewayRequest,
  deps: GatewayDeps,
): Promise<GatewayResponse> {
  if (request.method !== "POST") {
    return { status: 405, body: { error: "use POST" } };
  }
  if (!(await signedIn(request.authorization, deps))) {
    return { status: 401, body: { error: "sign in to use the AI steps" } };
  }
  const parsed = requestSchema.safeParse(request.body);
  if (!parsed.success) {
    return { status: 400, body: { error: "not a valid AI step request" } };
  }
  try {
    const text = await deps.complete({
      tier: parsed.data.tier,
      prompt: parsed.data.prompt,
    });
    return { status: 200, body: { text } };
  } catch {
    return { status: 502, body: { error: "the AI service did not answer" } };
  }
}
