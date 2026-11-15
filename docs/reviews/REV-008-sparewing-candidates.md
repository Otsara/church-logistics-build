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

## Parts 2 to 5: pilots, missed flights, ranking, decision

Pending: to be reviewed in the build conversation.
