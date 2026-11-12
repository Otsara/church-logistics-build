---
id: ADR-007
title: Cold-chain items excluded from this build
status: Accepted
date: 2026-11-09
decided: owner, 2026-11-09
---

# ADR-007 Cold-chain items excluded from this build

## Context

Trips could choose to carry cold-chain items, but cold-chain donations seem unlikely, and handling them would need a cold-chain capability on each trip (formerly Q-10, now OD-010).

## Options

1. Add a trip field for cold-chain capability and block cold-chain lots unless it is set.
2. Block every cold-chain lot in this build.

## Decision

Option 2 (owner, 2026-11-09). Blocked lots stay visible with the reason, so nothing silently disappears.

## Consequences

- SYS-104, RC-104, TC-109. No Trip field is added.
- Revisit after the hackathon if cold-chain donations prove common.
