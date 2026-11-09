/**
 * Three-state results (BUILD_SPEC "Shared components"). Missing data gets its own state, so it
 * never silently passes or fails (PE-5, SC-4). No state means "approved" (CLAUDE.md rule 6).
 */

/** Prepped lot eligibility (PE-1 to PE-5). */
export type PreppedStatus = "eligible" | "blocked" | "needs_review";

/** SpareWing part or pilot candidates (SC-1 to SC-6). */
export type SpareWingStatus = "candidate" | "excluded" | "unknown";

/** The outcome of applying rules to one item, with every reason a person needs to check it. */
export interface RuleOutcome<Status extends PreppedStatus | SpareWingStatus> {
  readonly status: Status;
  /** Plain-language reasons, for example "90 days remaining, 12 months required" (P-1). */
  readonly reasons: readonly string[];
}
