---
id: ADR-010
title: Readiness meter kept, wider routes, exchanges and discard of expired lots
status: Accepted
date: 2026-11-11
decided: owner, 2026-11-11
---

# ADR-010 Readiness meter kept, wider routes, exchanges and discard of expired lots

## Context

After ADR-009, four Prepped questions remained: whether to keep the weighted readiness meter beside the Go or No go indicator (OD-004), which further routes are in scope (OD-037), which lots count toward a floor item (OD-039), and what happens to lots that expire.

## Options

1. Keep the narrow scope and exact matches only, and retire the meter.
2. Keep the meter, widen the route scope, allow exchanges of formulation and strength for clinician acceptance, and set expired lots aside for discard.

## Decision

Option 2 (owner, 2026-11-11):

- **Meter:** keep the graphic meter, because the detail of each medicine's fulfilment is hard to see otherwise. Need coverage 70%, documents 30%; 75/25 or 80/20 is also acceptable if the screen layout favours it. Priority weights are open (OD-040).
- **Routes:** inhaled, nasal, vaginal, otic and ocular preparations join oral, sublingual, rectal, feeding-tube and topical, provided none needs a cold chain. Injection and infusion stay out.
- **Exchanges:** other formulations (liquid suspension, tablet, capsule, dissolvable) and strengths of the same medicine can be offered and exchanged to meet a floor item. An exchange counts only after the clinician accepts it; how much it counts is open (OD-041).
- **Expiry:** each lot number corresponds to one expiry date. Lots that have expired are set aside to be discarded.

## Consequences

- SYS-106, SYS-109 and SYS-113 updated; new SYS-115, SYS-116, SYS-117, HAZ-114, RC-114, RC-115, TC-118 to TC-121.
- RC-108 gains an implementing requirement (SYS-117).
