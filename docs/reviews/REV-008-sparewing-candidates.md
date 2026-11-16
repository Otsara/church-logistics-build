---
id: REV-008
title: Line-by-line review of the SpareWing candidate rules
date: 2026-11-15
---

# REV-008 Line-by-line review of the SpareWing candidate rules

## Reviewed

The SpareWing rules in `packages/core/src/sparewing/` (ARC-301; SYS-301 to SYS-309), from the pull request "SpareWing: candidate rules" (merged before this review), reviewed in the build conversation, one file at a time.

## Part 1: part candidates (`parts.ts`), 2026-11-15

Findings and the owner's decisions (owner, 2026-11-15):

| # | Finding | Decision |
|---|---|---|
| 1 | Part numbers matched character for character: a stray space or lowercase letter missed a real candidate. | Ignore leading and trailing spaces and letter case; dashes and every other character still match (ADR-030, TC-317). |
| 2 | An invalid order lead time was shown as entered. | A negative, fractional or missing value reads "no order lead time entered" (ADR-030, TC-302). |
| 3 | A need had no quantity, so a base holding too few looked sufficient. | The need carries the quantity needed; a base holding fewer is listed and marked "holds 1 of 2 needed" (SYS-311, ADR-030, TC-318). |
| 4 | Shelf life, life limits and release paperwork are not checked. | Left to the person signing off for the MVP; the owner signs off the MVP for the hackathon. Deferred until after the hackathon (OD-057). |

Results after the fixes: 100% line and branch coverage; Stryker mutation score 98.73% on `parts.ts`. The one survivor is equivalent: folding part numbers to lower case instead of upper case still ignores letter case.

## Parts 2 to 5: pilots, missed flights, ranking and decision, 2026-11-16

Findings and the owner's decisions (owner, 2026-11-16; ADR-032):

| # | File | Finding | Decision |
|---|---|---|---|
| 1 | `pilots.ts` | Ratings matched character for character. | Ignore leading and trailing spaces and letter case (TC-319). |
| 2 | `pilots.ts` | With no required ratings entered, every pilot passed the ratings check. | Every pilot is "data missing: required ratings not entered for this aircraft" (TC-320). |
| 3 | `pilots.ts` | An expected end before the date needed checked no days and passed. | Every pilot is "data missing: expected end is before the date needed: check the dates" (TC-321). |
| 4 | `pilots.ts` | Duty time and rest limits are not checked. | Wanted in the MVP; limits and source owed by the owner (OD-059). |
| 5 | `missed.ts` | An expected end before the start threw an error. | Data missing, missed flights unknown (TC-321). |
| 6 | `missed.ts` | No flight days entered showed zero missed flights, ranking the option first. | Data missing, missed flights unknown, ranked last (TC-322). |
| 7 | `missed.ts` | The cover aircraft's own availability was not checked. | Counts only when entered as available (TC-323). |
| — | `rank.ts` | Ranking order and reasons. | Confirmed as built; unknown missed flights rank last (TC-322). |
| 8 | `decision.ts` | The time of a decision was not checked. | Refused unless a valid UTC date and time (TC-324). |
| 9 | `decision.ts` | A decision could name an option not in the ranked list. | Refused (TC-324). |
| — | `decision.ts` | Who may decide, and the audit entry. | Confirmed as built. |

Results after the fixes: 100% line and branch coverage; Stryker mutation score 100% on `missed.ts`, `rank.ts` and `decision.ts`, and 98.61% on `pilots.ts`. The one survivor is equivalent: folding ratings to lower case instead of upper case still ignores letter case.
