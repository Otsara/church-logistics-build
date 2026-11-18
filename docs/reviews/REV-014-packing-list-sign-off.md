---
id: REV-014
title: Line-by-line review of the packing list sign-off
date: 2026-11-18
---

# REV-014 Line-by-line review of the packing list sign-off

## Reviewed

The packing list sign-off (`packages/core/src/prepped/sign-off.ts`; SYS-010, TC-009), from the pull request "Prepped: packing list sign-off by the lead clinician, cleared by any later change" (#37). Reviewed in the build conversation on 2026-11-18.

Claude walked through the code line by line and checked it against the requirements.

## Findings and decisions

| # | Finding | Decision |
|---|---|---|
| 1 | A quantity of 0, a negative number or a fraction would be signed off as given. | Yes: refuse unless every quantity is a whole number of 1 or more. Built. |
| 2 | A blank lot id was not refused. | Yes: refuse it, naming the line. Built. |
| 3 | Sign-off is allowed while the indicator shows No go. | (a): allowed. Deploying is the lead clinician's decision (ADR-009), and P10 shows every open problem beside the button. |
| 4 | Nothing in core builds the packing list, so the screen would choose the lines (against CLAUDE.md rule 2). | Yes: a core function builds the packing lines. The owner anticipates that when only part of a lot is needed, the rest remains available for another brigade. Three questions on how the lines are built are with the owner. |

## Outcome

- Findings 1 to 3 are built. `sign-off.ts` keeps full coverage and a mutation score of 100% (ADR-006).
- Finding 4 is in progress.
