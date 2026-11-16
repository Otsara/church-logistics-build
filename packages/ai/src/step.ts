/**
 * The contract every AI step follows (ARC-008, ARC-009, SYS-001 to SYS-006).
 *
 * The runner that implements it (schema validation, one retry, manual fallback, audit logging)
 * is `runner.ts`, built against TC-002 to TC-004.
 */
import type { AuditEntry } from "@church-logistics/core";
import type { z } from "zod";

/** The six AI steps in BUILD_SPEC "AI interface contracts". */
export type AiStepId =
  "AIC-101" | "AIC-102" | "AIC-103" | "AIC-301" | "AIC-302" | "AIC-303";

/** Cheap model for parsing, stronger model for drafts and explanations, set by config (ARC-009). */
export type ModelTier = "cheap" | "strong";

export interface AiStep<Input, Output> {
  readonly id: AiStepId;
  readonly tier: ModelTier;
  /** Output that fails this schema is discarded (SYS-001). Unknown values are null (SYS-002). */
  readonly outputSchema: z.ZodType<Output>;
  /** Builds the prompt from input whose names have already been replaced by ids (SYS-006). */
  readonly buildPrompt: (input: Input) => string;
}

/** A model behind a single call, so tests can use recorded or fake responses (ARC-010). */
export interface ModelClient {
  complete(request: {
    readonly tier: ModelTier;
    readonly prompt: string;
    readonly signal: AbortSignal;
  }): Promise<string>;
}

export interface AiDependencies {
  readonly client: ModelClient;
  /** Every call is logged (SYS-006, ARC-011). */
  readonly audit: (entry: AuditEntry) => void;
  readonly timeoutMs: number;
  /** Supplies the audit time; the runner never reads the clock itself. */
  readonly now: () => string;
  /** Names that must never reach the model; a prompt containing one is refused (ARC-013). */
  readonly names: readonly string[];
}

/** Either a validated value, or the reason the person is sent to manual entry (TC-002, TC-003). */
export type AiOutcome<Output> =
  | { readonly kind: "ok"; readonly value: Output; readonly attempts: 1 | 2 }
  | {
      readonly kind: "manual_entry";
      readonly reason: "timeout" | "invalid_output" | "error" | "names_present";
      /** 0 when the call was refused before it was made. */
      readonly attempts: 0 | 1 | 2;
    };
