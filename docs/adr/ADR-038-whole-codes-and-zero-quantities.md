---
id: ADR-038
title: Part and lot numbers read by AI must match a whole code, and a quantity of 0 is accepted
status: Accepted
date: 2026-11-16
decided: owner, 2026-11-16
---

# ADR-038 Part and lot numbers read by AI must match a whole code, and a quantity of 0 is accepted

## Context

The line-by-line review of the parts-email reader (REV-010 part 3) tested two suspected gaps, both shared with the donor-list reader. The whole-word rule of ADR-036 treats a dash, slash or dot as a word's end, so "SWP-1155" was accepted from "SWP-1155-6" and "L-12" from "L-12-B"; a shortened part number could match a different part in stock. And the answers' schema allowed only quantities of 1 or more, so one line reading "qty 0" made the whole answer invalid, sending every line to manual entry.

## Options

1. Keep the whole-word rule for codes; or require part and lot numbers to match a whole code.
2. Keep quantities of 1 or more; or accept 0.

## Decision

Both as Claude recommended (owner, 2026-11-16). A part or lot number must start and end where the line's code does: at a space, a comma, semicolon or colon, a bracket, "#" before it, a full stop ending a sentence after it, or the ends of the line. A quantity of 0 is accepted: a part with 0 in stock is kept as read and never appears as a candidate (SYS-302); a donor line with 0 needs review ("quantity 0: check").

## Consequences

- `lines.ts` adds `findCode` and `keepCode`; both readers use them for lot and part numbers, and accept 0 in the schema.
- SYS-119 and SYS-313 updated; REV-010 complete.
