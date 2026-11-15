---
id: ADR-027
title: Donor lines without a lot number or expiry need clarification, and merge review reasons reach eligibility
status: Accepted
date: 2026-11-15
decided: owner, 2026-11-15
---

# ADR-027 Donor lines without a lot number or expiry need clarification, and merge review reasons reach eligibility

## Context

Part 1 of the owner's line-by-line review of donor-line merging (REV-006) asked how lines without a lot number or a readable expiry should be treated, and whether lot numbers are matched ignoring capitals. Building the answer showed a gap: merging marked some lots "needs review" (for example one lot number with two expiry dates, SYS-117, TC-121), but eligibility never read that mark, so such a lot could still be counted.

## Options

- Lines without a lot number or readable expiry: keep them as separate lots with no flag; or flag them for clarification with the donor, needing review.
- Lot numbers differing only in capitals: (a) match them, keeping every line's lot number as entered; (b) compare exactly; (c) match them, keeping only the first spelling.
- The merge's review mark: leave it for the screens; or carry it into eligibility.

## Decision

By the owner on 2026-11-15: without a lot number or a readable expiry, the donation's viability is in question and must be clarified with the donor before it is accepted; option (a) for lot numbers. Claude carries the merge's review reasons into eligibility, so such a lot is "needs review" and never counted until a person resolves it; a block, short shelf life or expiry already passed still decides first.

## Consequences

- `merge.ts` flags such lines "no lot number recorded …" or "no readable expiry date: clarify with the donor before accepting this donation" and keeps each line's lot number as entered.
- `eligibility.ts` takes `reviewReasons` on a lot.
- SYS-117, RC-108; tests under SYS-117 and TC-107.
