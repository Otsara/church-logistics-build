---
id: REV-011
title: Line-by-line review of the AI drafts and explanations
date: 2026-11-17
---

# REV-011 Line-by-line review of the AI drafts and explanations

## Reviewed

The shared draft rules, the explanations and the message to a base or community, in `packages/ai/src/steps/` (`drafts.ts`, `grounding.ts`, `explain.ts`, `message.ts`; ARC-008; AIC-103, AIC-302, AIC-303; SYS-003, SYS-005, SYS-309, SYS-310). They came from the pull request "AI wrapper: readiness and plan explanations and base messages are checked against computed results and labelled as drafts" (#29), which was merged on 2026-11-17 before the review finished. The review took place in the build conversation on 2026-11-16 and 2026-11-17, in three parts. Before presenting each part, Claude fed deliberately wrong text to the checks.

## Part 1: the draft rules (`drafts.ts`)

| # | Finding | Decision |
|---|---|---|
| 1 | "flight-worthy", "safe-to-fly", "safe  to fly", "approve", "approval", "airworthiness" and "ready to fly" were all accepted. | (a): any spacing or hyphens and every form of each word; add "ready to fly" and "fit to fly". |
| 2 | Marking reviewed accepted an empty person id and the time "not a time", and a second reviewer overwrote the first. | Yes: refuse both, and refuse a second mark. |
| 3 | Any person id could mark a draft reviewed. | (a): anyone on the team; reviewing is not a sign-off. The owner noted that only people in the sign-off roles are expected to use the product. |
| 4 | An edited draft kept its reviewed mark. | (a): any edit puts the label back, needs review again, and is audit logged. |

## Part 2: the explanations (`explain.ts`, `grounding.ts`)

| # | Finding | Decision |
|---|---|---|
| 1 | "19 missed flights" passed because 19 is part of the date 2026-11-19, and "USD 2026" passed the same way. | Yes: figures must be whole values. |
| 2 | "Amoxicillin (F1) is not short" passed, though F1 is short. | Yes: refuse a negated status. |
| 3 | A sentence naming F1 and F2 could swap their values. | (a): one item per sentence; another item's name or plain ref is refused. |
| 4 | "Short by three hundred" passed. | Yes: refuse numbers in words. |
| 5 | "Has expired" and "the best and safest option" passed. | Yes: check the apps' status words, and refuse judgements. |

## Part 3: the message to a base or community (`message.ts`)

Part 1, answer 1 already refuses "ready to fly", and part 2, answer 1 already refuses numbers taken from a part number.

| # | Finding | Decision |
|---|---|---|
| 1 | "The part arrives tomorrow" passed. | Yes: refuse relative dates and weekdays; use the dates given. |
| 2 | "Pastor Juan will collect the part" passed. | (a): refuse a title followed by a name; refer to people by id. |
| 3 | "20 November" passed. | Yes: write dates as given. Part 2's whole-figures rule now refuses it. |
| 4 | "Flights resume 20 November" states an expected date as fact. | Yes: refuse "confirmed", "guaranteed", "definitely" and "promise"; the prompt says dates are expected or estimated, and never that flights will resume. |

## Outcome

All decisions recorded in ADR-040 (owner, 2026-11-17), and built with tests that start with the IDs they verify, on the branch `shared/ai-draft-checks-review-fixes`. The changed files have full line and branch coverage, and a mutation score of 97.58% (the threshold is 80%, ADR-006). The 10 surviving mutants are equivalent, or are pattern variants with the same effect.
