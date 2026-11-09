/**
 * The contract every AI step follows (F-8, F-9, AR-1 to AR-6).
 *
 * This file fixes the interface only. The runner that implements it (schema validation, one
 * retry, manual fallback, audit logging) is built by the AI wrapper stream against X-2 to X-4.
 */
import type { AuditEntry } from "@church-logistics/core";
import type { z } from "zod";

/** The six AI steps in BUILD_SPEC "AI interface contracts". */
export type AiStepId =
  "AI-P1" | "AI-P2" | "AI-P3" | "AI-S1" | "AI-S2" | "AI-S3";

/** Cheap model for parsing, stronger model for drafts and explanations, set by config (F-9). */
export type ModelTier = "cheap" | "strong";

export interface AiStep<Input, Output> {
  readonly id: AiStepId;
  readonly tier: ModelTier;
  /** Output that fails this schema is discarded (AR-1). Unknown values are null (AR-2). */
  readonly outputSchema: z.ZodType<Output>;
  /** Builds the prompt from input whose names have already been replaced by ids (AR-6). */
  readonly buildPrompt: (input: Input) => string;
}

/** A model behind a single call, so tests can use recorded or fake responses (F-10). */
export interface ModelClient {
  complete(request: {
    readonly tier: ModelTier;
    readonly prompt: string;
    readonly signal: AbortSignal;
  }): Promise<string>;
}

export interface AiDependencies {
  readonly client: ModelClient;
  /** Every call is logged (AR-6, F-11). */
  readonly audit: (entry: AuditEntry) => void;
  readonly timeoutMs: number;
  /** Supplies the audit time; the runner never reads the clock itself. */
  readonly now: () => string;
}

/** Either a validated value, or the reason the person is sent to manual entry (X-2, X-3). */
export type AiOutcome<Output> =
  | { readonly kind: "ok"; readonly value: Output; readonly attempts: 1 | 2 }
  | {
      readonly kind: "manual_entry";
      readonly reason: "timeout" | "invalid_output" | "error";
      readonly attempts: 1 | 2;
    };

/** Validate, retry once, then fall back to manual entry. A failed step never blocks work. */
export type RunAiStep = <Input, Output>(
  step: AiStep<Input, Output>,
  input: Input,
  dependencies: AiDependencies,
) => Promise<AiOutcome<Output>>;
