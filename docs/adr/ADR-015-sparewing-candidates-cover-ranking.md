---
id: ADR-015
title: SpareWing candidates, cover and ranking
status: Accepted
date: 2026-11-12
decided: owner, 2026-11-12
---

# ADR-015 SpareWing candidates, cover and ranking

## Context

SpareWing's candidate rules are safety-critical (HAZ-303): a pilot who is not qualified or current must never appear as a candidate. The aircraft record has no requirement field, the reference date was open, the flights that can be covered were undefined, and the proposal needed a ranking (SYS-308). OD-014, OD-015, OD-016 and OD-023.

## Options

- Requirement: per aircraft type; per aircraft; type plus extras per aircraft.
- Reference date: today; date needed; date needed and through the expected end of the disruption.
- Cover: any base; same base; bases listed by the program.
- Ranking: strict order of criteria; or a weighted score.

## Decision

All by the owner on 2026-11-12: requirements come from a rule file per aircraft type plus extras on an individual aircraft; currency is checked on the date needed and must last through the expected end of the disruption; only aircraft and pilots at bases the program lists for a community can cover its flights; options are ranked in strict order by fewest missed flights, then earliest return to service, then fewest transfers, with cost shown but not ranked.

## Consequences

- SYS-303, SYS-307, SYS-308, RC-308, TC-313 to TC-316.
- The program enters two new rule files: requirements per aircraft type, and cover bases per community; both cite their source and a verified date.
- A strict order needs no weights, so there are no numbers to tune; the reasons shown follow the order.
