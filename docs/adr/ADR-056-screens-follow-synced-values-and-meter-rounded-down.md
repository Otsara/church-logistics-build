---
id: ADR-056
title: Screens follow synced values unless the person is editing, and meter values are shown rounded down
status: Accepted
date: 2026-11-25
decided: owner, 2026-11-25
---

# ADR-056 Screens follow synced values, and the meter is rounded down

## Context

The two-device test of 2026-11-24 (TC-023) failed at step 6. The lead clinician's open floor list kept showing a target of 300 after the pharmacist's change to 320 had synced. The box had copied the value once, when it opened. Clicking into the box and out again would have saved the old number over the new one. That save is made from the latest version, so no conflict appears and the other person's change is silently undone (HAZ-115). Lovable found the same pattern in three other places:

- the trip details form;
- the packing-list amount box;
- the covering-letter text, where a synced draft replaced unsaved typing.

The same test showed the meter's raw values on screen, such as 0.5249999999999999. The screen specification forbids screens from rounding what core returns.

## Options

- **F1 and F5, open screens and sync:**
  - (a) A field nobody is editing follows the stored value; only what the person changed is saved; a change arriving while they edit keeps their input and names the other device's change.
  - (b) Lock a field while another device has unsynced changes.
  - (c) Leave it, and rely on reopening the page.
- **F3, meter values:**
  - (a) Core returns the shown text, rounded down to 2 decimal places.
  - (b) Rounded to the nearest hundredth.
  - (c) Shown as now.

## Decision

F1 and F5: option (a) (owner, 2026-11-25). F3: option (a), rounded down so a screen never shows more readiness than computed (owner, 2026-11-25). Arithmetic can leave a value a hair below a whole hundredth, so a tiny allowance (1e-9) shows 0.8999999999999999 as 0.90.

## Consequences

- RC-116 controls HAZ-115, verified by TC-145 and TC-147 to TC-149 in the Prepped app. The owner's own two-device run is still owed (OD-065).
- `meterText` in `packages/core` is safety-critical with SYS-106. It has a test (TC-150), a mutation score of 100%, and needs the owner's line-by-line review (ADR-006).
- The screens call `meterText` once the rules folder is rebuilt.
- The audit log is sorted by time, newest first (TC-146).
- The conflict card's display is left until after the submission (owner, 2026-11-25, F4).
