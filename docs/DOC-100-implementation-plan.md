---
id: DOC-100
title: Implementation plan and submission requirements
version: 0.27
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

Status on 2026-11-12: Stryker runs in CI with a score of 97.84% on the safety-critical code after the OD-044 change (136 of 139 mutants killed; the 3 survivors are equivalent); the openFDA importer, the synthetic data generators for both products and the held-back split and seal are built and tested; the 26 missing test cases are written (TC-005, TC-016, TC-019 to TC-021, TC-123 and TC-312 implemented). The owner closed the decisions iteration 1 needs, and the back-end and hosting decisions (owner, 2026-11-12). The FDA snapshot of 2026-11-11 is imported (32,601 in-scope entries; OD-034), and the corpus is built with its held-back third sealed and handed to the owner (OD-036), rebuilt after biologics (OD-049) and compressed gases (OD-051) were excluded. The owner's line-by-line review of the iteration-0 safety-critical code is recorded in REV-001. Still open: the owner's review, rating the hazards (OD-047) and the Lovable projects.

Exit criteria: `pnpm docs:check` and `pnpm check` pass; the owner's review recorded; the held-back set sealed; Stryker runs on core; every decision iteration 1 needs is closed.

### IT-001 Iteration 1: safety cores in parallel
- Dates: November 13 to 17

`prepped/eligibility-rules`: TC-101 to TC-122, TC-125, TC-127 to TC-129, TC-131 and TC-132, with SYS-108; TC-126 waits for OD-038. `sparewing/candidate-rules`: TC-301 to TC-309 and TC-313 to TC-316, with SYS-308 and SYS-309. Scope widened to every core-tested case whose rules are decided (owner, 2026-11-12); the first plan named only TC-101 to TC-109 and TC-301 to TC-307. Exit: ADR-006 criteria met and the owner's line-by-line review recorded for each unit.

Status on 2026-11-15: Prepped lot eligibility (TC-101 to TC-104, TC-108 to TC-111, TC-118, TC-120, TC-128, TC-129, TC-133) and the shelf-life rule file, verified by the owner for the prototype (external review: OD-002), are reviewed (REV-003) and merged. Floor coverage, exchanges, Go or No go and the meter (TC-106, TC-112 to TC-117, TC-119, TC-122, TC-131) are reviewed (REV-004) and merged. SpareWing candidate rules (TC-301 to TC-309, TC-313 to TC-316), started in parallel with the owner's go-ahead (owner, 2026-11-13), are merged; the owner decided their interpretations on 2026-11-15 (ADR-025), and the owner's line-by-line review of the SpareWing code is still to be recorded. Donor-line merging (TC-107, TC-121, TC-127) is merged and its line-by-line review recorded in REV-006 (owner, 2026-11-15). The picker label is reviewed by the owner (owner, 2026-11-15). Still to build or review: comparable alternatives (TC-125; in review), the owner's line-by-line review of the SpareWing code, and SpareWing's two rule files, citing the synthetic data file as their source (owner, 2026-11-15; OD-005).

### IT-002 Iteration 2: AI steps
- Dates: November 16 to 20

`shared/ai-wrapper`: ARC-008, ARC-013, ARC-014, AIC-101 to AIC-103 and AIC-301 to AIC-303 on Claude Haiku 5.5 (ADR-008), golden examples from the development partition, TC-002 to TC-004.

Status on 2026-11-16: started with the owner's go-ahead (owner, 2026-11-16), in parallel with the SpareWing review. Built: the step runner and name replacement (ARC-008, ARC-013; TC-002 to TC-004), with ADR-031 accepted and the AI call time limit set at 30 seconds per attempt (owner, 2026-11-16; OD-058). The server-side gateway (ARC-014, TC-028 to TC-030) is built, tested and deployed (owner, 2026-11-16), and checked without an AI call; a signed-in call waits for sign-in in the apps (iteration 3). Next: the six steps with their golden examples.

### IT-003 Iteration 3: screens, offline and live demo
- Dates: November 18 to 23

Both apps' screens from Lovable (ARC-102, ARC-302), as separate stand-alone projects (owner, 2026-11-11), sign-off flows (SYS-010), offline store and sync (TC-001), live demo hosting (OD-021).

Lovable credit plan for the 100 hackathon credits, approved (owner, 2026-11-11):

| Use | Credits |
| --- | --- |
| Prepped screens | 50 |
| SpareWing screens | 20 |
| Reserve for integration fixes and the demo | 30 |

Adjusted after the first build message (owner, 2026-11-19). Prepped's first build message (batch 1: shell, shared components, demo data, placeholders and P1 to P3) cost 19.1 credits, and about 21.6 of Prepped's credits were used by then. Batches 2 and 3 at that rate would need about 60 for Prepped. Up to 20 credits move from the reserve to Prepped:

| Use | Credits |
| --- | --- |
| Prepped screens | up to 70 |
| SpareWing screens | 20 |
| Reserve for integration fixes and the demo | at least 10 |

Fixes to built screens are folded into the next build message rather than sent alone (owner, 2026-11-19).

A complete screen specification is written first, outside Lovable: DOC-045, Prepped first (owner, 2026-11-18; ADR-046). Each project gets one plan-mode message to agree the approach, then a few batched build messages. The cost of the first build message is checked and the plan adjusted before more is spent. Lovable builds screens only, never business logic. Max mode is not used. Every message to Lovable is sent only with the owner's go-ahead.

Offline store and sync (owner, 2026-11-21; ADR-052): full sync as ADR-012 says, with a checkpoint at the end of 2026-11-24 (Central time). If two devices do not yet sync and hold conflicts as TC-001 and TC-023 require, the build switches to device-only storage and the owner is told. The SpareWing screens move after the submission unless time allows ("should there prove bandwidth and time to work on SpareWing screens, tack it on").

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

The demo, video, screenshots and live demo use synthetic data only, with no real personal information of church members, congregants, donors or pilots. The demo screens use hand-written made-up examples; the tests and the confirmation run use `packages/synth` data with recorded seeds (owner, 2026-11-27; OD-071, ADR-062).

### SUB-006 Submission contents
- Formerly: H-6

Project name, written description, track, demo video link, and a live demo link on lovable.app (OD-018). The written description reuses a one-page executive summary; the repository is made public for judging and its link submitted, then returned to private (owner, 2026-11-12); OD-021. That is `Otsara/church-logistics-build`, public from the submission until judging ends after a secret scan; `Otsara/prepped` stays private; the video's limits card names the repository (owner, 2026-11-25; OD-066, ADR-058). Licences and terms of the open-source code and AI tools used are followed.

### SUB-007 One project, Pioneer Track
- Formerly: H-7
- Submitted product: Prepped (owner, 2026-11-23, D1; ADR-054)

One project in one track, the Pioneer Track (owner, 2026-11-27; OD-072, ADR-062; it replaces the Open Track chosen in OD-020). The description and demo address the four judging criteria: a clear ministry problem and who it serves; original thinking and fresh approaches; responsible and faithful use of AI; a working demo that shows real potential.

## 5. Future work after submission

These ideas are not part of this build. No requirements, tests or code exist for them, and nothing in the submission claims them. Both reuse parts of the shared core and are to be revisited after the submission (owner, 2026-11-16). The demo video shows them once, on the slide "One tested core, more ministries", each labelled "An idea for after the hackathon", with SpareWing labelled "Rules built and tested; screens not yet built". The narration says only what they could do (owner, 2026-11-26).

- **Food pantry stock sharing between churches**, named **Provisioned** (owner, 2026-11-07; name 2026-11-26). Logo draft: a navy chi-rho P, as in Prepped, with gold points at the P's top-left corner, the middle of its curve, where the curve meets the spine, the centre of the X and the X's four tips; the X sits clear of the curve. The name is in navy Barlow Condensed, with Psalm 103:2 beneath it, in SpareWing's colours (owner, 2026-11-26). Reuses expiry-aware matching, the messy-list parser, offline storage, and draft messages that a person reviews.
- **Pastoral visit scheduling**, named **NotForgotten** (owner, 2026-11-14; name 2026-11-26). Logo draft: an N and F monogram sharing one upright in navy, its small open gap filled with a gold six-point star. The name is NOT in navy and FORGOTTEN in gold Barlow Condensed, with Psalm 9:18 beneath it, in SpareWing's colours (owner, 2026-11-26). It serves shut-ins, hospital patients and others who need a visit outside Sunday, for a solo pastor, two pastors, or a congregation with a dedicated pastoral minister. Reuses the rule files, results that keep "unknown" apart from pass or fail, offline storage, the audit log and name replacement, and follows SpareWing's coverage model. New work it would need: stronger privacy for pastoral and health information, urgency flagged only by a person, calendar sync, and a check of church management tools that already offer care features.

## Revision history

| Version | Date | Change | By |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | First draft: iterations IT-000 to IT-004, review points and check-ins; submission requirements H-1..H-7 carried over as SUB-001..007 (ADR-001). | Claude, for owner review |
| 0.2 | 2026-11-11 | IT-003: two stand-alone Lovable projects and the approved credit plan (owner, 2026-11-11). | Claude, for owner review |
| 0.3 | 2026-11-12 | IT-000 status on 2026-11-12. | Claude, for owner review |
| 0.4 | 2026-11-12 | IT-000 status: mutation score corrected from 97.18% to 97.14%, as in the Stryker report (owner, 2026-11-12). | Claude, for owner review |
| 0.5 | 2026-11-12 | IT-000 status after the owner's decisions of 2026-11-12; SUB-006 demo and repository link (OD-018, OD-021). | Claude, for owner review |
| 0.6 | 2026-11-12 | IT-000 status: snapshot imported; held-back third sealed and handed over. | Claude, for owner review |
| 0.7 | 2026-11-12 | IT-000 status after OD-046, OD-048 and OD-049. | Claude, for owner review |
| 0.8 | 2026-11-12 | IT-000 status: REV-001 recorded; catalogue without gases. | Claude, for owner review |
| 0.9 | 2026-11-12 | IT-001 status: lot eligibility built; scope widened to every core-tested case whose rules are decided (owner, 2026-11-12). | Claude, for owner review |
| 0.11 | 2026-11-13 | IT-001 status: SpareWing candidate rules built. Numbered 0.11 because the floor-coverage branch takes 0.10. | Claude, for owner review |
| 0.12 | 2026-11-13 | IT-001 status: eligibility reviewed (REV-003); floor coverage built. (prepared as 0.10 on the floor-coverage branch, renumbered after the SpareWing merge) | Claude, for owner review |
| 0.13 | 2026-11-15 | IT-001 status: SpareWing interpretations decided (ADR-025). Numbered 0.13 because the floor-coverage branch takes 0.12. | Claude, for owner review |
| 0.14 | 2026-11-15 | IT-001 status: donor-line merging built. Numbered 0.14 because the SpareWing decisions branch takes 0.13. | Claude, for owner review |
| 0.15 | 2026-11-15 | IT-001 status: donor-line merging reviewed (REV-006), picker label reviewed by the owner; SpareWing rule files to cite the synthetic data file (owner, 2026-11-15). | Claude, for owner review |
| 0.16 | 2026-11-16 | IT-002 started (owner, 2026-11-16): step runner and name replacement built. | Claude, for owner review |
| 0.17 | 2026-11-16 | IT-002: ADR-031 accepted, AI time limit 30 seconds (OD-058). | Claude, for owner review |
| 0.18 | 2026-11-16 | IT-002: AI gateway built, not yet deployed. | Claude, for owner review |
| 0.19 | 2026-11-16 | IT-002: AI gateway deployed. | Claude, for owner review |
| 0.20 | 2026-11-16 | Section 5: future work after submission, food pantry stock sharing and pastoral visit scheduling (owner, 2026-11-16). | Claude, for owner review |
| 0.21 | 2026-11-18 | IT-003 status: screen specification DOC-045 drafted for Prepped (ADR-046). | Claude, for owner review |
| 0.22 | 2026-11-19 | IT-003: Lovable credit plan adjusted after the first build message cost 19.1 credits; up to 20 credits move from the reserve to Prepped, and fixes are folded into build messages (owner, 2026-11-19). | Claude, for owner review |
| 0.23 | 2026-11-21 | IT-003: offline store and sync with a checkpoint on 2026-11-24; SpareWing screens after the submission unless time allows (owner, 2026-11-21; ADR-052). | Claude, for owner review |
| 0.24 | 2026-11-23 | SUB-007 names the submitted product, Prepped, which the release gate reads (owner, 2026-11-23, D1; ADR-054). | Claude, for owner review |
| 0.25 | 2026-11-25 | SUB-006: which repository is made public, and for how long (owner, 2026-11-25; OD-066, ADR-058). | Claude, for owner review |
| 0.26 | 2026-11-26 | Section 5: the future-work ideas named Provisioned and NotForgotten, with their logo drafts and verses, and shown once in the demo video labelled as ideas (owner, 2026-11-26). | Claude, for owner review |
| 0.27 | 2026-11-27 | SUB-005 names where the synthetic data comes from; SUB-007 the Pioneer Track (owner, 2026-11-27; OD-071, OD-072, ADR-062). | Claude, for owner review |
