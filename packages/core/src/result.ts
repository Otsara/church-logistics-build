/**
 * Three-state results (BUILD_SPEC "Shared components"). Missing data gets its own state, so it
 * never silently passes or fails (SYS-105, SYS-304). No state means "approved" (CLAUDE.md rule 6).
 */

/**
 * Prepped lot eligibility (SYS-101 to SYS-105). "discard" is a lot already past its expiry on
 * the date of the check: listed separately, set aside and never eligible (SYS-116).
 */
export type PreppedStatus = "eligible" | "blocked" | "needs_review" | "discard";

/**
 * SpareWing part or pilot candidates (SYS-301 to SYS-306). "data_missing": something needed was
 * not entered, and the screen says what (owner, 2026-11-15).
 */
export type SpareWingStatus = "candidate" | "excluded" | "data_missing";

/** The outcome of applying rules to one item, with every reason a person needs to check it. */
export interface RuleOutcome<Status extends PreppedStatus | SpareWingStatus> {
  readonly status: Status;
  /** Plain-language reasons, for example "90 days remaining, 12 months required" (TC-101). */
  readonly reasons: readonly string[];
}
