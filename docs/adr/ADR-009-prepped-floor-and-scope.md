---
id: ADR-009
title: Prepped minimum floor, Go or No go indicator and route scope
status: Accepted
date: 2026-11-10
decided: owner, 2026-11-10
---

# ADR-009 Prepped minimum floor, Go or No go indicator and route scope

## Context

A mission is a go or no-go decision. The owner sees the essential medicines as the floor from which a mission pharmacy is built, with supplements added to suit the lead clinician, and wants to limit this build to medicines that need no cold chain and are not injected (owner, 2026-11-10). The earlier readiness meter (SYS-106) did not say whether the essentials were met.

## Options

1. Keep the weighted readiness meter as the only readiness signal.
2. A floor list chosen by the lead clinician, with a Go or No go indicator, supplements kept apart, and a narrowed route scope.

## Decision

Option 2 (owner, 2026-11-10):

- **Floor:** the lead clinician picks a floor list for each mission from the essential medicines, with a target quantity for each. The tool never sets these numbers. It may offer an estimate from the anticipated caseload the team leader enters, for the clinician to accept or change; the method is open (OD-038).
- **Go or No go:** Go only when every floor item is covered by eligible stock, combining lots across donations, and the import documents for the destination are prepared; otherwise No go, listing what is short. The leader is shown how donations combine to meet the floor and where shortages remain. The indicator informs; the decision to deploy the team rests with the lead clinician or team leader alone.
- **Supplements:** medicines beyond the floor are added to suit the lead clinician's preferences and never affect Go or No go.
- **Scope:** oral, sublingual, rectal, feeding-tube, topical skin and ophthalmic preparations that need no cold chain. Everything else is blocked as "outside this build's scope". Other routes are open (OD-037).
- **Catalogue:** the in-scope part of the WHO Model List of Essential Medicines, recreated from FDA drug directory data. Licensing is open (OD-034).

## Consequences

- UN-106, UN-107; SYS-109 to SYS-114; HAZ-109 to HAZ-113 and RC-109 to RC-113; DAT-102; SOUP-102; TC-110 to TC-117.
- OD-013 is closed. Whether the 70/30 meter stays as extra detail is open, and the owner asked to be reminded before deciding (OD-004).
- Which lots count toward the same floor item is open (OD-039).
