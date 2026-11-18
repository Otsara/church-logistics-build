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
| 4 | Nothing in core builds the packing list, so the screen would choose the lines (against CLAUDE.md rule 2). | Yes: a core function builds the packing lines. The owner anticipates that when only part of a lot is needed, the rest remains available for another brigade. |

## Follow-up questions on building the packing list

| # | Question | Decision |
|---|---|---|
| 1 | Which lots are packed first? | (a): soonest expiry first. |
| 2 | What happens to the rest of a lot? | (b): stock shared across trips, scoped to one team's data, with the rest available to the next brigade once a list is signed off. The owner confirmed that a target of 300 met from a lot of 700 leaves 400 for another brigade. |
| 3 | Splitting packs? | (a): the list gives the amount. Splitting doses, volumes and packs is decided at the point of care, and the brigade's clinician or pharmacist lead decides in the app how much of a lot is packed. |
| A | Is shared stock worth its cost (about a day, moderate)? | Yes. |
| B | How much of an exchange or alternative is packed, when the app never converts doses? | (a): the lead clinician enters it, and the list cannot be signed off until then. |

## Outcome

- All decisions are recorded in ADR-049 (owner, 2026-11-18) and built: `sign-off.ts` and the new `packing.ts` (SYS-010, SYS-121; TC-009, TC-140, TC-141).
- Building them found one more gap, fixed: a change entered for a floor item not on the list was silently ignored, and is now listed as a problem.
- Full line and branch coverage. Mutation score: `sign-off.ts` 100%, `packing.ts` 97.06% (the threshold is 80%, ADR-006). The 5 surviving mutants are equivalent.
