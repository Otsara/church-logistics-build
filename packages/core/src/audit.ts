/** Audit entries: every AI call and every human sign-off is logged (ARC-011, SYS-006). */

export type AuditActor =
  | { readonly kind: "person"; readonly personId: string }
  | { readonly kind: "ai_step"; readonly stepId: string };

export interface AuditEntry {
  /** ISO 8601 date-time in UTC, supplied by the caller (core never reads the clock). */
  readonly time: string;
  readonly actor: AuditActor;
  readonly action: string;
  readonly before: unknown;
  readonly after: unknown;
}
