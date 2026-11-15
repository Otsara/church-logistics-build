---
id: REV-007
title: Line-by-line review of comparable alternatives
date: 2026-11-15
---

# REV-007 Line-by-line review of comparable alternatives

## Reviewed

`packages/core/src/prepped/alternatives.ts` and the chosen-alternatives part of `packages/core/src/prepped/floor.ts` (ARC-101; SYS-108), from the pull request "Prepped: comparable alternatives for clinician choice" (merged before this review), reviewed in the build conversation on 2026-11-15, in two parts.

## Part 1: which lots are listed as alternatives (`alternatives.ts`)

Findings and the owner's decisions (owner, 2026-11-15):

| # | Finding | Decision |
|---|---|---|
| 1 | A lot sharing one class was listed even when it brought another class, so a combination product could be offered for a single agent. | Fixed: an alternative brings no class the floor item lacks; one chosen anyway makes the item need review (ADR-028, TC-135). |
| 2 | Whether alternatives are listed for every item or only short ones was not settled. | Listed for every floor item; marked as offered when the item is short or needs review (ADR-028, TC-135). |
| 3 | Whether anything else in part 1 needed changing. | No. |

Results after the fixes: 100% line and branch coverage; Stryker mutation score 100% on `alternatives.ts` and 99.17% on `floor.ts`; the two survivors are equivalent (a missing class list replaced by a made-up class, which still matches nothing).

## Part 2: counting a chosen alternative (`floor.ts`)

Pending: to be reviewed in the build conversation.
