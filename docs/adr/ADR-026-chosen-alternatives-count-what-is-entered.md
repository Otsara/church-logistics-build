---
id: ADR-026
title: A chosen comparable alternative counts only what the clinician enters
status: Accepted
date: 2026-11-15
decided: owner, 2026-11-15
---

# ADR-026 A chosen comparable alternative counts only what the clinician enters

## Context

SYS-108 and ADR-003 let the clinician browse comparable alternatives (another medicine in the same FDA established pharmacologic class) for a short floor item, "added only when the clinician chooses them", but did not say whether a chosen alternative counts toward the floor item's target and so toward "Go". HAZ-105, an alternative taken as equivalent, is rated critical. Raised as OD-055.

## Options

- (a) Never counts: packed as a supplement; the floor item stays short.
- (b) Counts exactly the share of the target the clinician enters when choosing it, as an exchange does (ADR-011), and the item says so.
- (c) Counts the alternative lot's full quantity.

## Decision

Option (b), as Claude recommended (owner, 2026-11-15). The owner noted that an injectable form (for example intravenous ampicillin) would be an unusual choice for an oral floor item; in this build injectables are outside scope and never eligible, so never offered (SYS-109).

## Consequences

- `floor.ts` takes `chosenAlternatives`, each with the amount the clinician entered; it counts only an eligible lot of another medicine sharing a class with the floor item, and says on the item that it is covered partly by a comparable alternative chosen by the clinician. The same medicine, no shared class, or no amount entered makes the item need review; a missing or ineligible lot is not counted; a lot counted twice makes both items need review (ADR-023).
- The control for HAZ-105 is both in code (only the entered share, only within a class, always labelled) and a person's check (the clinician chooses and enters the share), as the acceptability rule for critical risks requires (ADR-016).
- SYS-108, RC-105 and new TC-134.
