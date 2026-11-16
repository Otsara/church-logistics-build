---
id: ADR-032
title: SpareWing pilots, missed flights, ranking and decisions treat missing or inconsistent data as data missing
status: Accepted
date: 2026-11-16
decided: owner, 2026-11-16
---

# ADR-032 SpareWing pilots, missed flights, ranking and decisions treat missing or inconsistent data as data missing

## Context

The line-by-line review of the SpareWing rules, parts 2 to 5 (REV-008), found nine points in `pilots.ts`, `missed.ts`, `rank.ts` and `decision.ts`. Two were safety gaps: an aircraft with no required ratings entered let every pilot pass, and a community with no flight schedule entered showed zero missed flights, so its option ranked first.

## Options and decision

All as Claude recommended (owner, 2026-11-16), except duty and rest limits, which the owner wants in the MVP:

1. Ratings: compared ignoring leading and trailing spaces and letter case, as part numbers are (ADR-030).
2. No required ratings entered for the aircraft: every pilot is "data missing: required ratings not entered for this aircraft", never a candidate.
3. Expected end before the date needed: every pilot is "data missing: expected end is before the date needed: check the dates". A known reason to rule a pilot out still excludes them.
4. Duty time and rest limits: the owner first preferred them checked in the MVP; once the published sources were set out, the owner deferred them until after the hackathon (owner, 2026-11-16; OD-059). Until then they stay with the person signing off.
5. Missed flights with an expected end before the start: "data missing: expected end is before the start: check the dates", missed flights unknown; no longer an error thrown.
6. No flight days entered: "data missing: flight schedule not entered", missed flights unknown, never zero; cover is still listed.
7. A cover aircraft counts only when entered as available over the disruption; not entered or not available, it is not counted, saying which.
8. A decision is refused when its time is not a valid UTC date and time (YYYY-MM-DDTHH:MM:SSZ, a real calendar date).
9. A decision is refused when its option is not in the ranked list.

The owner confirmed the ranking order (fewest missed flights, earliest return to service, fewest transfers; cost shown, not ranked) and the decision record as built.

## Consequences

- `pilots.ts`, `missed.ts` (`CoverOption.aircraftAvailable`; `missed` and `scheduled` may be null; `missingData`), `rank.ts` (`missedFlights` may be null, ranked last), `decision.ts` (`optionIds`).
- SYS-303, SYS-307, SYS-308, SYS-309, RC-303, RC-307, ARC-301; new TC-319 to TC-324; OD-059 open.
