---
id: REV-010
title: Line-by-line review of the donor-list and parts-email AI readers
date: 2026-11-16
---

# REV-010 Line-by-line review of the donor-list and parts-email AI readers

## Reviewed

The readers in `packages/ai/src/steps/` (ARC-008; AIC-101, AIC-301; SYS-119, SYS-313), from the pull request "AI steps: donor-list and parts-email readers where the AI copies, code checks, and a person confirms" (#27), reviewed in the build conversation on 2026-11-16, in three parts.

## Part 1: the line checks (`lines.ts`)

Claude tested deliberately wrong copies against a sample line before presenting it. Findings and the owner's decisions (owner, 2026-11-16; ADR-036):

| # | Finding | Decision |
|---|---|---|
| 1 | A shortened lot number, name or date was accepted, because a copy only had to appear somewhere in the line. | Whole words only. |
| 2 | A copy in other letter case was stored in the AI's spelling. | Keep the line's own text. |
| 3 | A strength figure could pass as a quantity. | (b): keep it, but send the line to review when the quantity is also written as a strength. |

## Part 2: the donor-list reader (`donor-list.ts`)

Claude walked through the prompt, the schema and the checks, and noted that text in a pasted line that tries to instruct the AI can at most produce copies of text in the lines, which code checks and a person confirms. Findings and the owner's decisions (owner, 2026-11-16; ADR-037):

| # | Finding | Decision |
|---|---|---|
| 1 | A line with no dosage form did not need review, though the form is needed to match the catalogue and its route. | Yes: a missing form sends the line to review; a missing strength alone does not. |
| 2 | With two medicines on one line, the first answer was kept and the second set aside. | Yes: every answer for that line is set aside and the line is entered by hand (applies to parts emails too). |
| — | A quantity printed with a comma ("1,200") does not match the AI's 1200, so the line goes to review. | Left as is: a comma can be a decimal mark. |

## Part 3: the parts-email reader (`parts-email.ts`)

Claude walked through the prompt, the schema (no base or serviceability field) and the checks, and tested two suspected gaps before presenting them. Findings and the owner's decisions (owner, 2026-11-16; ADR-038):

| # | Finding | Decision |
|---|---|---|
| 1 | A part or lot number cut short at a dash was accepted ("SWP-1155" from "SWP-1155-6", "L-12" from "L-12-B"), because the whole-word rule treats a dash as a word's end. | Yes: part and lot numbers must match a whole code. |
| 2 | One line with quantity 0 made the whole answer invalid, sending every line to manual entry. | Yes: 0 is accepted; a part with 0 is kept as read, a donor line with 0 needs review. |

## Results after the fixes

100% line and branch coverage on `packages/ai/src/steps/`. Stryker mutation score 98.61% (`donor-list.ts` and `parts-email.ts` 100%, `lines.ts` 97.50%); the two survivors are equivalent: folding to upper case instead of lower case, and splitting on single spaces where empty pieces are dropped anyway. The review of #27 is complete.
