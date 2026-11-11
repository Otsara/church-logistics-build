---
id: DOC-100
title: Implementation plan and submission requirements
version: 0.2
status: Draft
effective_date:
---

# DOC-100 Implementation plan and submission requirements

How both products are built in parallel to the hackathon deadline, with full rigour for both (owner, 2026-11-10), what each iteration must deliver, and the submission requirements. Dates are plans, not commitments; the owner decides any change of scope.

## 1. Deadline and streams

The build window closes on **November 27, 2026, 11:59 PM ET**. The plan aims to submit on November 26, leaving a day of margin.

Parallel streams work on their own branches and in their own number ranges (DOC-000 §3): `prepped/...` (100–299), `sparewing/...` (300–499) and `shared/...` or `build/...` (001–099).

## 2. Iterations

### IT-000 Iteration 0: foundations before feature code
- Dates: November 10 to 13

Proposed scope:

1. The controlled document set v0.1, the reconciliation check and its CI gate (this change). Owner review in chat, recorded as the first review record in `docs/reviews/`; approval of the documents the owner is ready to baseline.
2. Owner decisions that iteration 1 depends on: OD-009, OD-011 to OD-016, OD-022 to OD-026.
3. Stryker installed and configured for the safety-critical units, with per-unit coverage thresholds (ADR-006).
4. Data: the openFDA snapshot importer, the synthetic generators for both products (TC-005), and the held-back third split off and sealed (DAT-002; OD-034, OD-036).
5. Test cases and placeholder tests for the requirements added on 2026-11-10 (SYS-007 to SYS-010, SYS-108, SYS-308, SYS-309, SEC and DAT items).
6. Decisions on back end, key storage and hosting (OD-001, OD-018, OD-027, OD-028), and the two Lovable projects created.

Exit criteria: `pnpm docs:check` and `pnpm check` pass; the owner's review recorded; the held-back set sealed; Stryker runs on core; every decision iteration 1 needs is closed.

### IT-001 Iteration 1: safety cores in parallel
- Dates: November 13 to 17

`prepped/eligibility-rules`: TC-101 to TC-109 and SYS-108. `sparewing/candidate-rules`: TC-301 to TC-307, SYS-308 and SYS-309. Exit: ADR-006 criteria met and the owner's line-by-line review recorded for each unit.

### IT-002 Iteration 2: AI steps
- Dates: November 16 to 20

`shared/ai-wrapper`: ARC-008, ARC-013, ARC-014, AIC-101 to AIC-103 and AIC-301 to AIC-303 on Claude Haiku 5.5 (ADR-008), golden examples from the development partition, TC-002 to TC-004.

### IT-003 Iteration 3: screens, offline and live demo
- Dates: November 18 to 23

Both apps' screens from Lovable (ARC-102, ARC-302), as separate stand-alone projects (owner, 2026-11-11), sign-off flows (SYS-010), offline store and sync (TC-001), live demo hosting (OD-021).

Lovable credit plan for the 100 hackathon credits, approved (owner, 2026-11-11):

| Use | Credits |
| --- | --- |
| Prepped screens | 50 |
| SpareWing screens | 20 |
| Reserve for integration fixes and the demo | 30 |

A complete screen specification is written first, outside Lovable. Each project gets one plan-mode message to agree the approach, then a few batched build messages. The cost of the first build message is checked and the plan adjusted before more is spent. Lovable builds screens only, never business logic. Max mode is not used. Every message to Lovable is sent only with the owner's go-ahead.

### IT-004 Iteration 4: release candidate and submission
- Dates: November 23 to 26

Pre-release confirmation run on the held-back set (DOC-070 §5), the owner's validation, `pnpm docs:check --strict`, demo video, `docs/SUBMISSION.md` ticked, submission of the chosen product (Prepped by default; OD-031).

## 3. Review points and check-ins

- **Review points:** each pull request opened, each merge, and each baseline. At each, the changed documents are republished as review copies stamped with ID, version and commit (DOC-000 §9).
- **Check-ins:** every 4 hours between 08:00 and 23:59 Central time (owner, 2026-11-10), a status message lists open release blockers (DOC-003), decisions owed, pull request and CI state, and days left. Scheduled at 08:05, 12:05, 16:05 and 20:05 Central until the submission.

## 4. Hackathon submission requirements

From the AI for Church Hackathon 2026 rules (https://aiforchurch.com/hackathon#rules), as supplied by the owner on 2026-11-09. Each requirement is ticked, with its evidence, in `docs/SUBMISSION.md`.

### SUB-001 Deadline and build window
- Formerly: H-1

The build window is October 30 to November 27, 2026, 11:59 PM ET, and the submission is complete before it closes; submissions lock automatically. Judges evaluate only work done in the window. This is an entirely new standalone project, and its git history dates every change.

### SUB-002 Demo video
- Formerly: H-2

5 minutes or less, hosted on YouTube, Vimeo or Loom.

### SUB-003 AI made it and AI is in it
- Formerly: H-3

The project is built with AI tools (Claude Code, Lovable) and features AI in what it does. The demo shows the AI steps working, not only their manual fallback, and shows a person reviewing each draft (SYS-005).

### SUB-004 Honest, kind and safe
- Formerly: H-4

The description and demo claim only what the tests show: placeholder rule values are labelled, the lack of an external pharmacist or mechanic review is stated (OD-002, OD-032), and nothing is called approved. The project is not harmful, deceptive or manipulative, and reflects care for people and respect for Scripture.

### SUB-005 Sample data only
- Formerly: H-5

The demo, video, screenshots and live demo use synthetic data only, with no real personal information of church members, congregants, donors or pilots.

### SUB-006 Submission contents
- Formerly: H-6

Project name, written description, track, demo video link, and a live demo link, which the owner wants (OD-021, OD-018). The repository link is optional (OD-021). Licences and terms of the open-source code and AI tools used are followed.

### SUB-007 One project, Open Track
- Formerly: H-7

One project in one track, the Open Track. The description and demo address its four criteria: a clear ministry problem and who it serves; original thinking and fresh approaches; responsible and faithful use of AI; a working demo that shows real potential. Prepped fits the track's "missions and global church tools" idea.

## Revision history

| Version | Date | Change | By |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | First draft: iterations IT-000 to IT-004, review points and check-ins; submission requirements H-1..H-7 carried over as SUB-001..007 (ADR-001). | Claude, for owner review |
| 0.2 | 2026-11-11 | IT-003: two stand-alone Lovable projects and the approved credit plan (owner, 2026-11-11). | Claude, for owner review |
