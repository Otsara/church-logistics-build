---
id: REV-003
title: Line-by-line review of the Prepped lot-eligibility code
date: 2026-11-13
---

# REV-003 Line-by-line review of the Prepped lot-eligibility code

## Reviewed

The safety-critical code in the pull request "Prepped: lot eligibility (discard, blocked, needs review, eligible) and the shelf-life rule file from WHO guidance" (`prepped/eligibility-rules`), reviewed part by part in the build conversation:

| Part | Unit | Verdict |
| --- | --- | --- |
| 1 | `packages/core/src/prepped/expiry.ts` (ARC-101): reading an expiry date | Accepted as revised, with F-1 to F-3 (owner, 2026-11-13) |
| 2 | `packages/core/src/prepped/eligibility.ts` (ARC-101): lot eligibility | Accepted (owner, 2026-11-13): discard comes before blocked, and blocked before needs review, with every reason listed; a lot expiring on the day of the check is not yet expired; the reason wording stands |
| 3 | `packages/core/src/prepped/shelf-life.ts` and `rules/prepped/shelf-life.json` (SYS-102) | Accepted (owner, 2026-11-13); the rule file's content verified by the owner against WHO Article 6 (ADR-022) |
| 4 | `packages/core/src/dates.ts` `lastDayOfMonth` (ARC-005) | Accepted (owner, 2026-11-13) |

## Findings

| ID | Finding | Resolution |
| --- | --- | --- |
| F-1 | Only YYYY-MM-DD and MM/YYYY were read; labels print many other formats. The owner favours reading all known valid label formats. | Every unambiguous format is read and the reading is shown; a two-digit year or a day and month that could be read either way needs review (ADR-022, TC-133). |
| F-2 | An expiry that cannot be read should be treated like a missing one. | Agreed by the owner: "needs review", never counted (SYS-105). |
| F-3 | A two-digit year written last means 20YY (owner). | Read after a named month, a numeric month or a numeric day and month (15 MAR 28, 03/28, 27/12/30). Claude raised that a year-first label (YY-MM-DD) would then be misread and overstate shelf life; the owner chose to read it as 20YY, with the reading always shown (HAZ-101, RC-101, ADR-022, TC-133). |

## Results reviewed

100% line and branch coverage of the safety-critical units. Stryker mutation scores on the changed files: `expiry.ts` 100%, `eligibility.ts` 100%, `shelf-life.ts` 92.31% (one equivalent survivor: a field path joined with "" instead of "." can only differ for nested fields, and every field is one level deep), `dates.ts` 96.30% (one equivalent survivor, known since iteration 0: an impossible day always changes the month as well).

## Decision

Accepted, with the changes F-1 to F-3 (owner, 2026-11-13). The owner is asked to confirm that HAZ-101's rating stands after F-3.
