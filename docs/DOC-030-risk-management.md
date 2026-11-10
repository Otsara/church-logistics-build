---
id: DOC-030
title: Risk management file
version: 0.1
status: Draft
effective_date:
---

# DOC-030 Risk management file

Flight and pharmacy are high-risk activities. This file lists what could go wrong when people rely on Prepped or SpareWing, how harm could follow, and the controls that reduce it. Each hazard traces to the intended use it comes from; each risk control traces to its hazard and is implemented by requirements (SYS, SEC, DAT) that are verified by tests (DOC-070). The traceability matrix (DOC-080) shows the full chain.

## 1. Method

1. Hazards are identified from the intended use (DOC-010), the requirements (DOC-020) and the owner's knowledge of mission pharmacy and aviation. The list is reviewed at each iteration.
2. Each hazard records the sequence of events, the possible harm, and severity and probability estimates.
3. **Severity scale, probability scale and acceptability criteria: TBD (OD-024).** Until the owner sets them, no hazard is rated and no residual risk is declared acceptable.
4. Controls are preferred in this order: design out the hazard, protect against it in code, then inform the user. Every control ends in a qualified person's decision (ADR-002).
5. Residual risk and the benefit-risk conclusion are recorded per product once OD-024 is closed.

## 2. Hazards and controls for both products

### HAZ-001 A suggestion is acted on as if it were a decision
- Product: Shared
- Traces to: IU-001

Sequence: a user trusts a list, candidate or draft without checking it (automation bias). Harm: an unsuitable medicine is dispensed, or a flight goes ahead without proper verification. Severity: TBD. Probability: TBD (OD-024).

### RC-001 Suggestions are labelled and need sign-off
- Product: Shared
- Traces to: HAZ-001

Every output is labelled as a suggestion or draft, the model never decides, and nothing becomes final until the person with authority signs it off. The word "approved" is never used for a part, pilot, medicine or document.

### HAZ-002 AI output is wrong and accepted
- Product: Shared
- Traces to: IU-001

Sequence: an AI step misreads a medicine, strength, quantity, expiry or part number from a messy list, and the error is accepted. Harm: wrong medicine or quantity packed; wrong part sought. Severity: TBD. Probability: TBD.

### RC-002 AI output is validated, never trusted
- Product: Shared
- Traces to: HAZ-002

AI output must pass a schema; unknown values stay null; every parsed line shows its source line and confidence for the user to check; all eligibility, candidate and readiness decisions are computed by code.

### HAZ-003 A regulation is stated that is not from a verified source
- Product: Shared
- Traces to: IU-001

Sequence: a draft states an import or aviation rule that the model made up or got wrong. Harm: shipment seized, team delayed, or an unsafe practice followed. Severity: TBD. Probability: TBD.

### RC-003 Regulations only from sourced rule cards
- Product: Shared
- Traces to: HAZ-003

The model may state a regulation only if it appears in a rule card with a source link and verified date, and must cite the card.

### HAZ-004 Personal data is disclosed
- Product: Shared
- Traces to: IU-001, IU-002

Sequence: names or personal details are sent to an AI service or exposed in the repository or demo. Harm: privacy breach. Severity: TBD. Probability: TBD.

### RC-004 Personal data kept out
- Product: Shared
- Traces to: HAZ-004

Names are replaced by ids before any AI call; only the fields a step needs are sent; only synthetic data is used in the build, tests and demo.

### HAZ-005 Data is lost or silently overwritten
- Product: Shared
- Traces to: IU-003

Sequence: offline edits are lost, or a sync conflict overwrites a correction without trace. Harm: a decision is made on stale or wrong data. Severity: TBD. Probability: TBD.

### RC-005 Offline queue and audited conflicts
- Product: Shared
- Traces to: HAZ-005

Edits are queued offline; on sync, conflicts keep both versions in the audit log; every AI call and sign-off is logged.

### HAZ-006 The AI service is unavailable when needed
- Product: Shared
- Traces to: IU-003

Sequence: no connection or an AI outage blocks work at a critical moment. Harm: delay to a trip or a disruption response. Severity: TBD. Probability: TBD.

### RC-006 Manual path always available
- Product: Shared
- Traces to: HAZ-006

Each AI step retries once and then falls back to manual entry or a blank template; rule logic never depends on AI.

### HAZ-007 Service credentials are exposed
- Product: Shared
- Traces to: IU-001

Sequence: an AI service key is placed in the browser app or the repository and copied. Harm: misuse of the service in the program's name, unexpected cost, loss of service. Severity: TBD. Probability: TBD.

### RC-007 Keys held server-side only
- Product: Shared
- Traces to: HAZ-007

Keys never appear in front-end code or the repository; they are held as server-side secrets and used only by a server function (OD-027).

## 3. Prepped hazards and controls

### HAZ-101 A medicine expires before or during the trip
- Product: Prepped
- Traces to: IU-101

Sequence: a lot with too little shelf life at arrival is packed. Harm: patients receive expired or degraded medicine. Severity: TBD. Probability: TBD.

### RC-101 Shelf life checked by code against arrival
- Product: Prepped
- Traces to: HAZ-101

Code computes days remaining at the arrival date and blocks lots below the minimum, with the reason shown; a change of arrival date recalculates immediately.

### HAZ-102 A lot with unknown expiry is counted as usable
- Product: Prepped
- Traces to: IU-101

Harm: as HAZ-101. Severity: TBD. Probability: TBD.

### RC-102 Unknown expiry needs review
- Product: Prepped
- Traces to: HAZ-102

A lot with no expiry date is marked "needs review" and never counts toward readiness.

### HAZ-103 A controlled substance is packed
- Product: Prepped
- Traces to: IU-101

Harm: legal consequences for the team, diversion risk, harm to patients. Severity: TBD. Probability: TBD.

### RC-103 Controlled substances always blocked
- Product: Prepped
- Traces to: HAZ-103

Lots marked controlled are always blocked, whatever their expiry.

### HAZ-104 A cold-chain item is packed without a cold chain
- Product: Prepped
- Traces to: IU-101

Harm: loss of potency; patients receive ineffective medicine. Severity: TBD. Probability: TBD.

### RC-104 Cold-chain items always blocked
- Product: Prepped
- Traces to: HAZ-104

Cold-chain items are blocked in this build (ADR-007).

### HAZ-105 A comparable alternative is taken as equivalent
- Product: Prepped
- Traces to: IU-101, IU-102

Sequence: a medicine from the same class is packed in place of the intended one as if interchangeable. Harm: wrong agent for the clinical purpose. Severity: TBD. Probability: TBD.

### RC-105 Alternatives only for clinician choice
- Product: Prepped
- Traces to: HAZ-105

Alternatives are shown only for a clinician to consider, labelled "Comparable, not equivalent", with their class source; they are added only when the clinician chooses them; never substituted automatically (ADR-003).

### HAZ-106 A required import document is missing
- Product: Prepped
- Traces to: IU-101

Harm: medicines seized or delayed at the border; patients go without. Severity: TBD. Probability: TBD.

### RC-106 Blocking issues stop "ready"
- Product: Prepped
- Traces to: HAZ-106

Any blocking issue, such as a missing import permit, caps readiness at "Not ready" and is listed in the draft paperwork.

### HAZ-107 Readiness is overstated
- Product: Prepped
- Traces to: IU-101

Sequence: coverage is computed wrongly and the team leaves short of needed medicines. Severity: TBD. Probability: TBD.

### RC-107 Readiness computed by tested code
- Product: Prepped
- Traces to: HAZ-107

Coverage and readiness are computed by safety-critical code to the rules in SYS-106, with exact worked tests.

### HAZ-108 Donor lines are double-counted or wrongly merged
- Product: Prepped
- Traces to: IU-101

Harm: quantities overstated or understated; readiness wrong. Severity: TBD. Probability: TBD.

### RC-108 Deterministic merge rule
- Product: Prepped
- Traces to: HAZ-108

Donor lines are merged by a deterministic rule in core, never by the AI step. The rule itself: TBD (OD-011).

## 4. SpareWing hazards and controls

### HAZ-301 A non-interchangeable part is proposed
- Product: SpareWing
- Traces to: IU-301

Harm: an incorrect part is fitted; airworthiness compromised. Severity: TBD. Probability: TBD.

### RC-301 Only entered part numbers and alternates
- Product: SpareWing
- Traces to: HAZ-301

Only parts with the same part number or an alternate the program entered are candidates; the tool never infers interchangeability.

### HAZ-302 An unserviceable part is proposed
- Product: SpareWing
- Traces to: IU-301

Harm: as HAZ-301. Severity: TBD. Probability: TBD.

### RC-302 Unserviceable parts excluded
- Product: SpareWing
- Traces to: HAZ-302

Parts marked not serviceable never appear.

### HAZ-303 A pilot without valid ratings or currency is proposed
- Product: SpareWing
- Traces to: IU-301

Harm: a flight is assigned to a pilot not qualified for it. Severity: TBD. Probability: TBD.

### RC-303 Pilot rules checked by code
- Product: SpareWing
- Traces to: HAZ-303

A pilot is a candidate only when entered ratings and currency meet the requirement and availability is known; a lapsed pilot is excluded with the reason shown.

### HAZ-304 Missing data passes or hides an option silently
- Product: SpareWing
- Traces to: IU-301

Harm: an unverified option is treated as valid, or a valid option is never seen. Severity: TBD. Probability: TBD.

### RC-304 Unknown shown as unknown
- Product: SpareWing
- Traces to: HAZ-304

Missing data is shown as "unknown" and unverified lead times as "unverified"; if nothing qualifies, the result says so.

### HAZ-305 A proposal is taken as an approval
- Product: SpareWing
- Traces to: IU-301, IU-302

Sequence: a proposed plan or candidate is treated as approval of a schedule change or of airworthiness. Severity: TBD. Probability: TBD.

### RC-305 Sign-off flag and no approvals
- Product: SpareWing
- Traces to: HAZ-305

Every candidate carries the sign-off flag; the tool never approves a schedule change or states that an aircraft is flightworthy; decisions are recorded only by the director, mechanic or pilot.

### HAZ-306 An arrival time is understated
- Product: SpareWing
- Traces to: IU-301

Sequence: an ETA built on a guessed lead time is trusted. Harm: plans fail; communities miss flights. Severity: TBD. Probability: TBD.

### RC-306 Unverified ETAs marked
- Product: SpareWing
- Traces to: HAZ-306

ETAs use only entered lead times; without one the ETA shows "unverified".

### HAZ-307 The impact on communities is misstated
- Product: SpareWing
- Traces to: IU-301

Harm: a community loses service without warning. Severity: TBD. Probability: TBD.

### RC-307 Missed flights computed by tested code
- Product: SpareWing
- Traces to: HAZ-307

Missed community flights are computed by safety-critical code to SYS-307, with exact worked tests.

### HAZ-308 Ranking hides a safer option
- Product: SpareWing
- Traces to: IU-301

Sequence: the "best" proposal favours speed over safety, or pushes other options out of sight. Severity: TBD. Probability: TBD.

### RC-308 Transparent ranking
- Product: SpareWing
- Traces to: HAZ-308

Ranking criteria are set by the program and shown with each proposal; ranking never removes a candidate from view (OD-023).

## Revision history

| Version | Date | Change | By |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | First draft: hazards HAZ-001..007, HAZ-101..108, HAZ-301..308 with controls. Severity, probability and acceptability left TBD (OD-024). | Claude, for owner review |
