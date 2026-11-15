---
id: ADR-028
title: A comparable alternative brings no class the floor item lacks, and is offered when the item is short
status: Accepted
date: 2026-11-15
decided: owner, 2026-11-15
---

# ADR-028 A comparable alternative brings no class the floor item lacks, and is offered when the item is short

## Context

In the line-by-line review of comparable alternatives (REV-007, part 1), two gaps were found in SYS-108 as built:

1. An alternative needed only to share one established pharmacologic class (EPC) with the floor item. A combination product (for example amoxicillin with clavulanate, which adds a beta-lactamase inhibitor) shares the penicillin class with amoxicillin, so it would have been offered for a single agent, bringing a second medicine the clinician did not ask for. HAZ-105 (an alternative taken as equivalent) is rated critical.
2. SYS-108 said alternatives are listed "for a need that eligible lots do not cover", but the code listed them for one item at a time without saying whether the item was short.

## Options

For the first gap:

- (a) Share at least one class (as built).
- (b) Share a class and bring no class the floor item lacks.
- (c) Match every class exactly.

For the second gap: list alternatives only for short items, or list them for every item and mark those of a short item as offered.

## Decision

- Option (b), "No extra classes", as Claude recommended (owner, 2026-11-15). The owner's reasoning: sharing a class makes agents sufficiently similar to be reasonably presumed exchangeable for the clinician's consideration, but a product that adds another agent is not the same kind of choice.
- Alternatives are listed for every floor item, so the clinician can look early, and offered when the item is found to be short (owner, 2026-11-15). An item that needs review is treated as short for this purpose. They count only if chosen, as decided in ADR-026.

## Consequences

- `alternatives.ts`: `comparableAlternatives` skips a lot with any class the floor item lacks; `alternativesForFloor` lists every item's alternatives with `offered` true when the item's coverage is short or needs review, and false when covered or not in the assessment.
- `floor.ts`: a chosen alternative that brings an extra class is not counted and makes the item "needs review", naming the extra classes, so the list and the count cannot disagree.
- SYS-108, RC-105, ARC-101 and new TC-135.
