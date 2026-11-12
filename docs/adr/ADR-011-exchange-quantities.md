---
id: ADR-011
title: The clinician sets how much an exchange covers
status: Accepted
date: 2026-11-11
decided: owner, 2026-11-11
---

# ADR-011 The clinician sets how much an exchange covers

## Context

ADR-010 lets other formulations and strengths of the same medicine be exchanged toward a floor item. Counting them needs a conversion between strengths and forms, and a wrong conversion could leave the team short (HAZ-114).

## Options

1. Prepped converts between strengths and forms with a built-in table.
2. The clinician enters how much of the target each accepted exchange covers.

## Decision

Option 2 (owner, 2026-11-11). Prepped never converts doses; it counts exactly what the clinician enters when accepting an exchange.

## Consequences

- SYS-115, RC-114, TC-122; OD-041 closed.
- No dose-conversion table is built, sourced or verified.
