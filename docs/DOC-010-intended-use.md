---
id: DOC-010
title: Intended use, users and regulatory position
version: 0.4
status: Draft
effective_date:
---

# DOC-010 Intended use, users and regulatory position

Prepped and SpareWing are decision-support aids for missionary work in two high-risk fields, pharmacy and flight. They propose and explain; a qualified person decides (ADR-002). This document states what each product is for, who uses it, what it must never do, and the regulatory position the owner has taken.

## 1. Both products

### IU-001 Decision support only
- Product: Shared

Both products are decision-support aids. Every list, candidate, proposal and draft they produce is a suggestion until the responsible qualified person reviews and confirms it. Neither product ever states that something is approved, safe to dispense, airworthy or confirmed (owner, 2026-11-10; ADR-002).

### IU-002 Scope of this build
- Product: Shared

For the AI for Church Hackathon 2026, both products are prototypes and minimum viable products that demonstrate proof of utility. They are not used with real patients, real medicines, real aircraft or real people's data (owner, 2026-11-10). Real-world use needs the open decisions marked `real-world use` in DOC-003 closed first.

### IU-003 Language and setting
- Product: Shared

English only for now (owner, 2026-11-10; OD-030). Users work in places with poor or intermittent connectivity, so both products must keep working offline apart from the AI steps. Phone, tablet and laptop, with one responsive layout, phone first; accessibility target WCAG 2.2 level AA (owner, 2026-11-12); OD-035.

## 2. Prepped

### IU-101 Prepped intended use
- Product: Prepped

Prepped helps a medical mission team prepare its mission pharmacy from donated medicines. The lead clinician chooses the mission's minimum floor list from the essential medicines and sets a target quantity for each. Prepped checks each donated lot against the trip's arrival date and rules, shows which lots are eligible, blocked or need review and why, shows how lots from different donations can be combined to meet the floor and where shortages remain, offers comparable available alternatives within a therapeutic class for a clinician to consider, lets the clinician add supplemental medicines beyond the floor, drafts the import paperwork for the destination, and shows a Go or No go indicator. A pharmacist or clinician makes every final decision, and the decision to deploy the team rests with the lead clinician or team leader alone (owner, 2026-11-10; ADR-009).

In scope for this build: medicines taken by mouth, under the tongue or rectally; topical skin and eye preparations (owner, 2026-11-10); and inhaled, nasal, vaginal and ear preparations (owner, 2026-11-11); none needing a cold chain. Feeding tube was dropped as a route category (owner, 2026-11-12); OD-045. Injections, infusions and any route not named are shown as blocked, "outside this build's scope". Lots of the same medicine in other formulations or strengths can be offered as exchanges to meet the floor, and expired lots are set aside for discard (owner, 2026-11-11).

### IU-102 What Prepped must never do
- Product: Prepped

Prepped never presents a comparable alternative as equivalent and never swaps one medicine for another by itself (ADR-003). It never decides whether the team deploys: Go and No go are indicators only (owner, 2026-11-10). It never sets a floor list or a target quantity; it may offer an estimate for the clinician to accept or change (SYS-111). It never calculates a dose, never gives advice about a specific patient, and never marks a packing list final without a pharmacist or clinician (owner, 2026-11-12); OD-025, ADR-016.

### IU-103 Prepped users
- Product: Prepped

- **Trip coordinator:** enters donations and trip details, and prepares drafts.
- **Pharmacist or clinician:** reviews eligibility, chooses among comparable alternatives, and signs off the mission pharmacy. Holds final authority (owner, 2026-11-10).

## 3. SpareWing

### IU-301 SpareWing intended use
- Product: SpareWing

SpareWing helps a mission aviation program respond when an aircraft is grounded or a pilot is unavailable. From the parts, pilots, bases and lead times the program has entered, it finds candidate parts and pilots, estimates the community flights that will be missed, proposes the best plan it can find, and drafts messages to bases or communities. The flight base director, mechanic or pilot reviews and verifies every proposal (owner, 2026-11-10).

### IU-302 What SpareWing must never do
- Product: SpareWing

SpareWing never approves a schedule change and never confirms that an aircraft is flightworthy (owner, 2026-11-10). It never decides that two parts are interchangeable, never judges a pilot fit to fly, and never sends a message without a person sending it (owner, 2026-11-12); OD-026, ADR-016.

### IU-303 SpareWing users
- Product: SpareWing

- **Flight base director:** reviews proposals and decides schedule changes.
- **Mechanic:** verifies part candidates and decides airworthiness.
- **Pilot:** confirms availability and currency.

Each holds final authority within their role (owner, 2026-11-10).

## 4. Regulatory position

The owner's position: neither product is a medical device or a regulated maintenance record system, and standards such as IEC 62304 and DO-178C do not apply (owner, 2026-11-10; ADR-004). The products are intended for worldwide use beyond the United States, so this position is to be confirmed for each country before real-world use (OD-029). Regardless of classification, the build follows the controlled, traceable process in DOC-000 because flight and pharmacy are high-risk activities.

No other regulatory classification, standard clause or clinical claim is made in these documents.

## Revision history

| Version | Date | Change | By |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | First draft from the owner's answers of 2026-11-10. | Claude, for owner review |
| 0.2 | 2026-11-10 | IU-101 and IU-102: minimum floor list, Go or No go indicator, supplements and route scope (owner, 2026-11-10; ADR-009). | Claude, for owner review |
| 0.3 | 2026-11-11 | IU-101: wider route scope, exchanges across formulations and strengths, discard of expired lots (owner, 2026-11-11; ADR-010). | Claude, for owner review |
| 0.4 | 2026-11-12 | IU-003 devices and accessibility (OD-035); IU-002 feeding tube dropped (OD-045); IU-102 and IU-302 limits confirmed (OD-025, OD-026) (owner, 2026-11-12). | Claude, for owner review |
