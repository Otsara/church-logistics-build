---
id: ADR-049
title: The packing list is built by core from stock shared across brigades, soonest expiry first, packing only what is needed
status: Accepted
date: 2026-11-18
decided: owner, 2026-11-18
---

# ADR-049 The packing list is built by core from stock shared across brigades

## Context

The owner's line-by-line review of the packing list sign-off (REV-014) found that nothing in core builds the packing list. The screen would therefore have to choose the lines, against CLAUDE.md rule 2.

Reading `floor.ts` showed two things:

- Floor coverage counts every eligible lot of a floor item's own medicine in full. A lot of 700 covers a target of 300.
- Exchanges and alternatives count the share of the target the clinician enters, in target units. Prepped never converts doses (SYS-115), so it cannot tell how much of such a lot to pack.

The owner anticipated that when only part of a lot is needed, the rest remains available for another brigade.

## Options

1. **Which lots are packed first:**
   - (a) soonest expiry first;
   - (b) largest lot first;
   - (c) the clinician picks each lot.
2. **What happens to the rest of a lot:**
   - (a) it is shown on the trip's list only;
   - (b) stock is shared across trips, so the rest is available to the next brigade.
3. **Splitting packs:**
   - (a) the list gives the amount, and the pharmacist or clinician decides how packs are split;
   - (b) whole lots only.
4. **Exchanges and alternatives** (asked as A and B, the second question set in REV-014):
   - (a) the lead clinician enters the amount to pack, in the lot's own units, and the list cannot be signed off until it is entered;
   - (b) pack the whole lot.

## Decision

Owner, 2026-11-18:

- **1 (a): soonest expiry first.**
- **2 (b): stock shared across trips.** The owner preferred it "if this doesn't add tremendous complexity". Claude assessed it as moderate, scoped as below, and the owner agreed (answer "A yes").
- **3 (a), with the owner's words:** "clinicians and pharmacists only make determinations at the point of care of splitting doses, volumes, packs, etc. But a lot might be split because only a certain amount of medicine is needed which is less than what is in the lot … the brigade's clinician or pharmacist lead is able to make this determination in the app."
- **4 (a).**

From the same review:

- Sign-off is allowed while the indicator shows No go (ADR-009).
- A quantity must be a whole number of 1 or more, and a line must name its lot.

**What is built (SYS-121):**

- **`buildPackingList`.**
  - For a floor item, its own medicine is packed soonest expiry first (same expiry: by lot id). Only as much is packed as the target needs after what exchanges and alternatives cover. The last lot may be packed in part.
  - Exchanges and alternatives are packed at the amount the lead clinician enters. Supplements are packed at the amount entered.
  - The lead clinician may change any floor line's amount, from 1 to what remains in the lot, and the line is marked as changed.
  - Each line shows what is left of its lot.
  - Every problem is listed, and any one stops the sign-off:
    - an amount not entered or out of range;
    - a supplement not eligible or not in stock;
    - more taken from a lot than remains;
    - a floor item without a target;
    - a lot the assessment names but the stock lacks;
    - a change or amount for the wrong item.
- **`availableStock`.** Stock is shared by one team's trips. A lot's available amount is its quantity less what other trips' **signed-off** packing lists take.
- **`stockConflicts`.** Signed-off lists that together take more of a lot than it holds, as after two trips signed off offline, put the lot in conflict. It counts for neither, and both lists show "Conflict: check" until a person resolves it (OD-017).

## Consequences

- Floor coverage still counts eligible lots in full: readiness answers "is there enough?", and the packing list answers "what do we take?". A trip's coverage uses the stock available to it, after other trips' signed-off lists.
- Screen P4 shows the team's stock rather than one trip's donations. P10 shows the lines, the amounts to enter or change, what remains, and conflicts (DOC-045).
- The offline store, not yet built, is designed around shared stock from the start (ARC-006).
- Signing off one trip's list can change what another trip may pack. That trip's list then changes, and any sign-off on it is cleared ("changed since sign-off").
