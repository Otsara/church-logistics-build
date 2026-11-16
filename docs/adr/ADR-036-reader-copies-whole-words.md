---
id: ADR-036
title: AI reader copies must be whole words, are kept as printed, and a quantity also written as a strength needs review
status: Accepted
date: 2026-11-16
decided: owner, 2026-11-16
---

# ADR-036 AI reader copies must be whole words, are kept as printed, and a quantity also written as a strength needs review

## Context

The line-by-line review of the readers' line checks (`packages/ai/src/steps/lines.ts`, REV-010 part 1) tested deliberately wrong copies against the line "Amoxicillin 500 mg CAPSULE x120 lot L123456 exp 06/2028". Four got through: a shortened lot number ("L1234"), a shortened name ("Amox") or date ("06/202"), because a copy only had to appear somewhere in the line; a copy in other letter case was stored in the AI's spelling ("l123456"); and a strength figure (500 from "500 mg") was accepted as a quantity, the limit ADR-035 recorded.

## Options

1. Accept a copy found anywhere in the line; or only as whole words.
2. Store the AI's copy; or the line's own text.
3. Leave strength-as-quantity to the person confirming; or also send the line to review when the quantity is written right before a unit.

## Decision

As Claude recommended (owner, 2026-11-16): 1 whole words only; 2 the line's own text; 3 option (b), review when the quantity is also written as a strength (before mg, mcg, µg, g, kg, mL, L, IU, mEq, mmol, % or a homeopathic [hp_...] unit). Letter case and spacing are still ignored when finding a copy. This replaces the last consequence of ADR-035, which stays as recorded.

## Consequences

- `lines.ts`: `findIn` matches whole words and returns the line's text; `keepText` keeps that text; `keepNumber` adds "quantity "500" is also written as a strength ("500 mg"): check".
- SYS-119 updated; tests in `packages/ai/tests/lines.acceptance.test.ts`.
