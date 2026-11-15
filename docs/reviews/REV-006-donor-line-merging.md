---
id: REV-006
title: Line-by-line review of the Prepped donor-line merging
date: 2026-11-15
---

# REV-006 Line-by-line review of the Prepped donor-line merging

Status: in progress. Part 2 is still to be reviewed.

## Reviewed

`packages/core/src/prepped/merge.ts` (ARC-101; OD-011, OD-054, SYS-117), merged before this review, reviewed part by part in the build conversation:

| Part | Unit | Verdict |
| --- | --- | --- |
| 1 | How lines are matched | Accepted, with F-1 to F-3 (owner, 2026-11-15) |
| 2 | Flags and expiry conflicts | Pending |

## Findings

| ID | Finding | Resolution |
| --- | --- | --- |
| F-1 | Lot numbers and makers are compared ignoring capitals and spaces; the merged lot kept only the first spelling, losing traceability. | Option (a): still matched, and every line's lot number is kept as entered (ADR-027). |
| F-2 | Lines without a lot number or readable expiry stayed separate without a flag. | They need review: clarify with the donor before accepting the donation (ADR-027). |
| F-3 | Claude's own gap: merging's review mark was never passed to eligibility, so a lot with one lot number and two expiry dates could still be counted. | Eligibility now reads the merge's review reasons; such a lot is "needs review" until resolved (ADR-027). |

The same expiry written two ways (01/15/2028 and 2028-01-15) matches, as accepted by the owner (owner, 2026-11-15).

## Decision

To be recorded when part 2 is reviewed.
