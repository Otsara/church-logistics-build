/**
 * How long one AI call attempt may take before it counts as timed out: 30 seconds (owner,
 * 2026-11-16; OD-058, ADR-031). With the one retry, a person waits at most about a minute before
 * manual entry is shown; the manual entry path stays available throughout (SYS-009).
 */
export const AI_CALL_TIME_LIMIT_MS = 30_000;
