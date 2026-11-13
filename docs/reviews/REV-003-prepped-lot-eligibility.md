---
id: REV-003
title: Line-by-line review of the Prepped lot-eligibility code
date: 2026-11-13
---

# REV-003 Line-by-line review of the Prepped lot-eligibility code

Status: in progress. Parts 2 to 4 are still to be reviewed.

## Reviewed

The safety-critical code in the pull request "Prepped: lot eligibility (discard, blocked, needs review, eligible) and the shelf-life rule file from WHO guidance" (`prepped/eligibility-rules`), reviewed part by part in the build conversation:

| Part | Unit | Verdict |
| --- | --- | --- |
| 1 | `packages/core/src/prepped/expiry.ts` (ARC-101): reading an expiry date | Accepted, with F-1 and F-2 (owner, 2026-11-13) |
| 2 | `packages/core/src/prepped/eligibility.ts` (ARC-101): lot eligibility | Pending |
| 3 | `packages/core/src/prepped/shelf-life.ts` and `rules/prepped/shelf-life.json` (SYS-102) | Pending; the rule file's content was verified by the owner (owner, 2026-11-13; ADR-022) |
| 4 | `packages/core/src/dates.ts` `lastDayOfMonth` (ARC-005) | Pending |

## Findings

| ID | Finding | Resolution |
| --- | --- | --- |
| F-1 | Only YYYY-MM-DD and MM/YYYY were read; labels print many other formats. The owner favours reading all known valid label formats. | Every unambiguous format is read and the reading is shown; a two-digit year or a day and month that could be read either way needs review (ADR-022, TC-133). |
| F-2 | An expiry that cannot be read should be treated like a missing one. | Agreed by the owner: "needs review", never counted (SYS-105). |

## Decision

To be recorded when all four parts are reviewed.
