---
id: ADR-021
title: A blocking issue means "No go"; "Not ready" is retired
status: Accepted
date: 2026-11-12
decided: owner, 2026-11-12
---

# ADR-021 A blocking issue means "No go"; "Not ready" is retired

## Context

The build spec's readiness levels included "Not ready", and SYS-107, RC-106, HAZ-106 and TC-105 still said a blocking issue such as a missing import permit caps readiness at "Not ready". OD-013 and ADR-009 replaced the readiness levels with the Go or No go indicator (SYS-112), and ADR-010 kept the meter as a graphic beside it (SYS-106). Two words for one state could confuse a team deciding whether to travel. Raised as OD-052 before TC-105 was built.

## Options

- (a) Retire "Not ready": a blocking issue makes the indicator "No go" and is listed there and in the draft paperwork; the meter shows its percentage as usual.
- (b) As (a), and the meter also shows a "Not ready" label while any blocking issue is open.
- (c) Cap the meter at a set value while any blocking issue is open; the value would be the owner's.

## Decision

Option (a), as Claude recommended (owner, 2026-11-12).

## Consequences

- SYS-107 and RC-106 are reworded and retitled; HAZ-106's control wording changes, and its rating does not.
- TC-105 now expects "No go" with the missing permit listed, the meter unchanged, and the draft listing the permit.
- The meter never hides a blocking issue on its own: the indicator beside it does. The meter's 30% document share already falls when a required document is missing (SYS-106).
