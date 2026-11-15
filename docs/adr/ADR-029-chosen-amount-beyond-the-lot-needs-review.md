---
id: ADR-029
title: A chosen alternative entered beyond its lot needs review, and an ineligible lot is reported first
status: Accepted
date: 2026-11-15
decided: owner, 2026-11-15
---

# ADR-029 A chosen alternative entered beyond its lot needs review, and an ineligible lot is reported first

## Context

In the line-by-line review of comparable alternatives, part 2 (REV-007), two gaps were found in how `floor.ts` counts a chosen alternative (ADR-026):

1. The amount the clinician enters was not checked against what the chosen lot holds: a lot of 50 could be entered as covering 200 of the target. Units can differ between products, so the entry is not always wrong, but it may be.
2. A chosen lot that was not eligible and had no amount entered was reported as "no amount entered", asking the clinician for an amount for a lot that can never count. Accepted exchanges (SYS-115) had the same order.

## Options

For the first gap: make the item need review; cap the count at the lot's quantity; or trust the entry.
For the second: report the ineligible lot first, or keep the order.

## Decision

- The lead clinician sets the floor. If an alternative chosen to meet it falls short numerically, a further review is needed, and the floor is redefined if further donations are not found to meet it (owner, 2026-11-15). In code: an amount entered beyond the lot's quantity is not counted and the item needs review, with the reason "lot X (product) holds 50 but 200 is entered as covering Amoxicillin: review; find further donations, or the lead clinician redefines the floor". An amount equal to the lot's quantity counts.
- An ineligible lot is reported first, for both chosen alternatives and accepted exchanges, as Claude recommended (owner, 2026-11-15).

## Consequences

- `floor.ts`: the eligibility check comes before the amount check for exchanges and alternatives; chosen alternatives also check the amount against the lot's quantity.
- ADR-026 still holds: a chosen alternative counts exactly the amount entered, now only when that amount is no more than the lot holds.
- Accepted exchanges are not checked against their lot's quantity. Whether they should be is open (OD-056).
- SYS-108, SYS-115, RC-105 and new TC-136.
