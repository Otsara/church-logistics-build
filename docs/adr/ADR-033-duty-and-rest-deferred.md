---
id: ADR-033
title: Pilot duty time and rest limits deferred until after the hackathon
status: Accepted
date: 2026-11-16
decided: owner, 2026-11-16
---

# ADR-033 Pilot duty time and rest limits deferred until after the hackathon

## Context

ADR-032, item 4, recorded the owner's preference to check pilot duty time and rest limits in the MVP, with the limits and their source owed by the owner (OD-059). Claude then set out where such limits are published: in the United States, 14 CFR Part 135, Subpart F (§§ 135.261 to 135.273) for commuter and on-demand operators and 14 CFR Part 117 for airlines, with no fixed duty limits for private flying under Part 91; internationally, ICAO Annex 6 and ICAO Doc 9966, and EASA's ORO.FTL in Europe; the rules of the country flown in; and, usually, the program's own operations manual. Which applies depends on where the aircraft are registered and how they are operated, which only the owner can say.

## Options

- (a) The owner names the regulation or manual; Claude quotes its limits from the official text for the owner to verify, and the check is built into the MVP.
- (b) Defer until after the hackathon.

## Decision

Option (b) (owner, 2026-11-16). This replaces item 4 of ADR-032, which stays as recorded.

## Consequences

- For the MVP, duty time and rest are checked by the person signing off (SYS-305); SpareWing says nothing about them.
- OD-059 stays open, deferred: after the hackathon the owner names the source, its limits are quoted for verification, a rule file is written, a pilot who would break a limit during the disruption is excluded with the reason, and one with no duty record entered is "data missing" (SYS-304).
- SYS-303 updated.
