---
id: ADR-018
title: No WHO list, biologics as cold chain, and only the clinician accepts exchanges
status: Accepted
date: 2026-11-12
decided: owner, 2026-11-12
---

# ADR-018 No WHO list, biologics as cold chain, and only the clinician accepts exchanges

## Context

The floor catalogue was to recreate the in-scope part of the WHO Model List of Essential Medicines from FDA data (ADR-009), but the WHO list's licence statements conflict (OD-046). The FDA directory has no storage field, and the in-scope catalogue included biologics that usually need refrigeration (OD-049). The owner's note that the team lead may accept tablets or a suspension raised who accepts an exchange (OD-048).

## Options

- WHO list: resolve its licence and use it; or do not use it.
- Biologics: rely on each lot's cold-chain flag; or treat biologic product types as cold chain.
- Exchanges: the clinician only; or also a team leader who is not a clinician.

## Decision

All by the owner on 2026-11-12: the WHO list is not used, and the floor catalogue is the in-scope FDA catalogue; biologic product types are treated as cold chain, and so outside this build's scope, whatever the lot says; only the clinician accepts an exchange.

## Consequences

- Amends the catalogue clause of ADR-009: no WHO list. SOUP-102 and TC-124 are retired; DAT-102 is rewritten.
- SYS-104, RC-104, ARC-015, TC-123, `rules/prepped/route-scope.json`: six biologic product types out of scope; 15 entries left the catalogue.
- The corpus was rebuilt from the new catalogue and a new held-back package handed to the owner; the first, never opened, is superseded (DAT-002).
- SYS-115 is unchanged: the clinician accepts each exchange and enters how much it covers.
