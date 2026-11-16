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

Pending.

## Part 3: the parts-email reader (`parts-email.ts`)

Pending.
