---
id: ADR-020
title: Gases and unknown product types out of scope; controlled medicines labelled in the picker
status: Accepted
date: 2026-11-12
decided: owner, 2026-11-12
---

# ADR-020 Gases and unknown product types out of scope; controlled medicines labelled in the picker

## Context

The owner's line-by-line review of the iteration-0 safety-critical code (REV-001) raised three points: the route rules let in 180 compressed gases; a product without a recorded product type could be a biologic that the cold-chain rule cannot recognise; and controlled medicines stay in the catalogue, so the floor-list picker could offer one that can never be packed.

## Options

- Gases: keep them; or exclude dosage form GAS.
- Missing product type: treat as an ordinary product; or treat as out of scope.
- Controlled medicines: remove them from the catalogue; or keep them, so a donated controlled lot is recognised and blocked with its reason, and label them in the picker.

## Decision

All by the owner on 2026-11-12: dosage form GAS is outside scope (OD-051); a missing product type is outside scope; controlled medicines stay in the catalogue and the picker labels them "Controlled: cannot be packed in this build".

## Consequences

- `rules/prepped/route-scope.json` gains `excluded_dosage_forms`; ARC-015 checks the product type; SYS-109, RC-109, TC-123.
- New SYS-118 and TC-132 for the picker label; RC-103.
- The catalogue lost 180 gas entries (32,406 remain), so the corpus was rebuilt and a third held-back package handed to the owner (DAT-002).
