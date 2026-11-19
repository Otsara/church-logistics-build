---
id: ADR-050
title: Go and No go are shown as the logo's capsule, in two fixed positions, always with the words
status: Accepted
date: 2026-11-19
decided: owner, 2026-11-19
---

# ADR-050 Go and No go are shown as the logo's capsule

## Context

After reviewing Lovable's batch 3, the owner asked for the readiness indicator (SYS-112) to use the capsule from the Prepped logo (DOC-045 §3.6):

- **No go:** the red half bright and pointing to 45 degrees, the other half a dull off-white at −135 degrees.
- **Go:** the capsule turned so the half that was red becomes a dull ochre at −45 degrees, and the other half a vivid green at 135 degrees.

The owner also asked whether the turn could show relative readiness. The indicator is a yes or no answer from core (SYS-112), and the meter shows readiness as numbers (SYS-106, OD-063). The display must never rely on colour alone, and red and green are the pair most often confused (DOC-045 §2 rule 9, §3.2).

## Options

1. **Where the capsule appears:**
   - (a) large on P8 Readiness and small beside each trip on P1 Trips, with the header logo unchanged;
   - (b) the header logo itself changes with the trip's status.
2. **What the turn shows:**
   - (i) two fixed positions only, No go and Go, with the meter's numbers shown as now;
   - (ii) a continuous turn between them, driven by a meter value.

## Decision

Owner, 2026-11-19: **1 (a)** and **2 (i)**.

- The capsule appears large on P8 and small on P1. The header logo never changes, so one trip's status is never read from another screen.
- Two fixed positions only, set by core's Go or No go. The meter keeps showing its numbers.
- The words "Go" or "No go" are always beside the capsule, with the indicator label (SYS-112). The capsule never stands alone.
- Colours, chosen to differ in lightness as well as hue, with a thin outline #5B6B62 (5.0:1 on the page) so the pale half shows:

| State | Bright half | Dull half |
|---|---|---|
| No go | red #C8102E at 45°, 5.3:1 on the page | off-white #E4DFD0 at −135°; 4.4:1 against the red |
| Go | green #13893F at 135°, 4.0:1 on the page | ochre #D4C08F at −45°; 2.5:1 against the green |

## Consequences

- Someone who cannot tell red from green still reads the state from the words and the 90-degree turn.
- A capsule never tilts part of the way toward Go, so it cannot suggest "nearly ready to pack" while the answer is No go.
- The screen draws one of two fixed pictures from core's answer; it computes nothing (CLAUDE.md rule 2).
