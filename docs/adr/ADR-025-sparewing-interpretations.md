---
id: ADR-025
title: SpareWing candidate rules as the owner decided them
status: Accepted
date: 2026-11-15
decided: owner, 2026-11-15
---

# ADR-025 SpareWing candidate rules as the owner decided them

## Context

Building the SpareWing candidate rules (ARC-301) needed seven interpretations the requirements did not settle (S1 to S7). They were built as proposals and merged before the owner had decided them; the owner decided them in the build conversation on 2026-11-15.

## Options and decisions

| # | Question | Decision (owner, 2026-11-15) |
| --- | --- | --- |
| S1 | Do listed alternates count both ways? | One way only: B counts for A only when the program lists B as an alternate for A, even where interchange in practice runs both ways. An alternate also needs the interchange confirmed by the pilot, mechanic or flight base director, shown as a separate note on the candidate. |
| S2 | Do parts with none in stock appear? | No. |
| S3 | Must availability cover every day? | Yes, from the date needed to the expected end; the first missing day is named. |
| S4 | A negative lead time? | Treated as not entered: ETA "unverified". |
| S5 | A pilot whose data is incomplete? | The pilot is always known; the check says "data missing" and names what (for example "availability not entered"). Such a pilot is shown as possible cover but not counted until the data is entered. The status "unknown" is renamed "data missing". |
| S6 | An unknown return to service in the ranking; full ties? | Ranks after every known date; full ties keep the order entered and say so. |
| S7 | Who records a decision? | Only the flight base director, mechanic or pilot, identified; anyone else, or an AI step, is refused. |

## Consequences

- SYS-301 to SYS-309, SYS-304's title and wording, TC-301, TC-304 and the glossary updated; `parts.ts` adds the interchange note, `pilots.ts` and `missed.ts` report what data is missing.
- The word chosen for the interchange note avoids "approve", which the build forbids in any output (CLAUDE.md, SYS-305).
- The owner's line-by-line review of the SpareWing code is still to be recorded (ADR-006).
