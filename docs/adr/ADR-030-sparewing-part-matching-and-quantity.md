---
id: ADR-030
title: SpareWing part numbers compared without stray spaces or letter case, and the quantity needed noted
status: Accepted
date: 2026-11-15
decided: owner, 2026-11-15
---

# ADR-030 SpareWing part numbers compared without stray spaces or letter case, and the quantity needed noted

## Context

The line-by-line review of SpareWing part candidates (`parts.ts`, REV-008) found four gaps:

1. Part numbers were matched character for character, so "abc-123 " in stock missed a need for "ABC-123" and the screen said "No candidates found".
2. The local order lead time was shown as entered, even when negative or fractional, although transfer lead times were already checked.
3. A need had no quantity, so a base holding one of two needed parts looked sufficient.
4. A part has only a yes or no "serviceable" mark; shelf life, life limits and release paperwork are not checked.

## Options

1. Exact match; ignore spaces and letter case; also ignore dashes (rejected: a dash can mark a different part).
2. Show as entered; read an invalid value as not entered.
3. Add the quantity needed and note a base holding fewer; list only bases holding enough; defer.
4. Leave to the person signing off for the MVP; add a field now.

## Decision

All four as Claude recommended (owner, 2026-11-15):

1. Leading and trailing spaces and letter case are ignored; dashes and every other character must match.
2. A negative, fractional or missing order lead time reads "no order lead time entered".
3. A need carries the quantity needed. A base holding fewer is still listed, since parts from two bases can be combined, marked "holds 1 of 2 needed". Without a valid quantity, each candidate says "quantity needed not entered: check the base holds enough".
4. Deferred until after the hackathon; the person signing off checks these for the MVP. The owner signs off the MVP for the hackathon (OD-057).

## Consequences

- `parts.ts`: `PartNeed` gains `quantityNeeded`; `PartCandidate` gains `holdsEnough`. Stock part numbers are shown as entered; the needed number is shown without stray spaces.
- SYS-301, SYS-306, RC-301, ARC-301, new SYS-311, TC-317, TC-318 and TC-302 extended; OD-057 open, not blocking.
