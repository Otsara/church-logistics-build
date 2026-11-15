---
id: DOC-070
title: Verification and validation plan
version: 0.17
status: Draft
effective_date:
---

# DOC-070 Verification and validation plan

How each requirement is shown to be met, how safety-critical code is verified, how the held-back set confirms a release, and how failures are reported. Test cases (TC) carried over from `docs/BUILD_SPEC.md` keep their wording; their numbers are worked so the expected result is exact (ADR-001).

## 1. Levels

| Level | What | Where |
| --- | --- | --- |
| Unit | Each function, including every branch of safety-critical code | `packages/*/tests` |
| Acceptance | Each TC below, as an automated test whose title starts with the TC ID | `packages/*/tests/*.acceptance.test.ts` |
| AI golden | 10–20 recorded examples per AI step, run without calling a model | `packages/ai/tests` |
| Confirmation | The full acceptance and golden suites against the held-back set (§5) | Pre-release only |
| Validation | The owner's preliminary confirmation of usefulness and safety for the prototype; external adjudication after the MVP (OD-006, OD-032) | Review records |

## 2. Rules for all tests

1. The failing test is written first, from the TC, then the code.
2. Every test title starts with the IDs it verifies in brackets, for example `it('[TC-101] Given ...')`.
3. Tests use synthetic data only and never call a real AI model or network service.
4. A test is never skipped, disabled or weakened to make a check pass.

## 3. Pass criteria

- All tests pass; `pnpm check` passes in CI on every pull request.
- Coverage of `packages/core` at 100% of branches, lines, functions and statements; 90% elsewhere.
- `pnpm docs:check` passes with no errors.

## 4. Safety-critical code (ADR-006)

A safety-critical unit (marked in DOC-020 and DOC-040) is verified only when all of these hold and are recorded:

1. 100% branch, line, function and statement coverage.
2. Mutation score of at least 80% (Stryker), measured on the changed code and critical paths (owner, 2026-11-10). `stryker.config.json` lists the safety-critical units to mutate, and CI runs `pnpm mutation` on every pull request. Incremental mode is off: on 2026-11-12 it reused stale results and under-reported the score (90.85% against 96.48% on a full run), and stale results could equally over-report.
3. The owner's line-by-line review in the build conversation, written up as a review record `docs/reviews/REV-nnn-*.md` naming the commit and files reviewed (owner, 2026-11-10).

## 5. Pre-release confirmation run

1. Check the held-back set's fingerprints against the committed manifest (DAT-002).
2. Run the acceptance and golden suites against it, with the owner present, at the release-candidate commit. No code or prompt changes during the run.
3. Record the results, commit and fingerprints in a review record.
4. Any failure stops the release. It is investigated under §6; the held-back set is then spent and a new one is generated before the next run.

## 6. Failures

Failures are reported with evidence: the command, the output, the commit. Every investigation follows the same order:

1. **Reproduce** the failure and record how.
2. **Causes:** find and state the root cause, with evidence. "Flaky" is not a cause.
3. **Remedy plan:** the fix, the tests that prove it, and the decisions the owner owes, added to DOC-003.

## 7. Test cases

**Both products**

### TC-001 Offline edits sync
- Product: Shared
- Traces to: SYS-007, SYS-008
- Formerly: X-1

Given edits made offline, when the connection returns, then all edits appear after sync and any conflict keeps both versions in the audit log (conflict handling: TC-023).

### TC-002 AI timeout falls back
- Product: Shared
- Traces to: SYS-009
- Formerly: X-2

Given an AI call times out, then the app keeps working and shows the manual entry path.

### TC-003 Invalid AI output discarded
- Product: Shared
- Traces to: SYS-001, SYS-008
- Formerly: X-3

Given an AI answer that fails the schema, then nothing is saved and the error is logged.

### TC-004 Names replaced before AI calls
- Product: Shared
- Traces to: SYS-006
- Formerly: X-4

Given pilot names, then they are replaced by ids before any AI call.

### TC-005 Same seed, same data
- Product: Shared
- Traces to: DAT-001
- Formerly: X-5

Given the same seed, then the synthetic data generator produces identical data.

### TC-006 Unreadable expiry stays null
- Product: Shared
- Traces to: SYS-002

Given a donor line whose expiry cannot be read, then the parsed expiry is null, never a guessed date, and the line is "needs review".

### TC-007 Regulations only from the rule card
- Product: Shared
- Traces to: SYS-004, AIC-102

Given a recorded draft that states an import requirement absent from the trip's rule card, then the statement is flagged and the draft is not accepted; a statement citing the rule card id passes.

### TC-008 Drafts marked until reviewed
- Product: Shared
- Traces to: SYS-005, SYS-008, AIC-102, AIC-302

Given any draft from AIC-102 or AIC-302, then it shows "Draft, human review required" until a person marks it reviewed, and marking it reviewed records the reviewer and time in the audit log.

### TC-009 Nothing final without sign-off
- Product: Shared
- Traces to: SYS-010

Given a packing list and a SpareWing proposal, then neither becomes final until the person with authority signs it off, and no screen, export or message uses the word "approved".

### TC-010 Explanations only restate computed results
- Product: Shared
- Traces to: AIC-103, AIC-303, SYS-003

Given computed readiness or candidates and a recorded explanation that mentions an item, number or status not in the computed results, then the explanation is rejected and the computed list is shown instead.

### TC-013 No AI key in the apps or repository
- Product: Shared
- Traces to: SEC-001

Given the built front-end bundles and the repository, then no AI service key appears, and the apps reach the AI only through the server-side gateway.

### TC-014 Synthetic data only
- Product: Shared
- Traces to: SEC-002, DAT-003

Given every fixture, golden example and demo data file, then every person, donor and pilot name is synthetic and every data file is marked synthetic.

### TC-015 HTTPS and security headers
- Product: Shared
- Traces to: SEC-003

Given the published apps, then they are served only over HTTPS and send the agreed security headers. Header set: TBD (OD-018).

### TC-016 Dependency audit on every pull request
- Product: Shared
- Traces to: SEC-004

Given the CI workflow, then every pull request runs a dependency audit that fails on high or critical advisories.

### TC-017 Only needed fields reach the AI
- Product: Shared
- Traces to: SEC-005, SYS-006

Given a record with names and extra fields, then each AI step's request contains only the fields that step needs and no names.

### TC-018 Data stored on devices protected
- Product: Shared
- Traces to: SEC-006

Given the protection for data stored on devices chosen in OD-033, then data at rest is protected as decided. Expected result: TBD (OD-033).

### TC-019 No secrets committed
- Product: Shared
- Traces to: SEC-007, SEC-001

Given the repository, then .env files are ignored and no tracked file contains a credential.

### TC-020 Held-back third split
- Product: Shared
- Traces to: DAT-002

Given 30 records and a split seed, then 10 are held back and 20 kept for development, no record is in both, the same seed gives the same split whatever the input order, and another seed gives a different one.

### TC-021 Held-back seal detects change
- Product: Shared
- Traces to: DAT-002

Given a sealed held-back set, then verification passes while it is unchanged, and names every changed, added or removed record, and a tampered set fingerprint.

### TC-022 Golden examples never from the held-back set
- Product: Shared
- Traces to: DAT-004

Given the golden example files and the held-back manifest, then no golden example comes from a held-back record.

**Prepped**

### TC-023 Sync conflict held for a person
- Product: Shared
- Traces to: SYS-007

Given the same lot's quantity changed on two devices while offline, when both sync, then the lot is marked "Conflict: check", is not counted toward coverage until a person chooses a version, and both versions are in the audit log (OD-017).

### TC-024 Sign-in and team separation
- Product: Shared
- Traces to: SEC-008

Given a device that has signed in and then goes offline, then work continues and its edits sync at the next connection with the editor recorded; given a person from another team, then that person cannot read or change this team's records; given unsynced edits, then signing out warns and keeps them (OD-001).

### TC-025 Corpus and held-back split
- Product: Shared
- Traces to: DAT-001, DAT-002

Given corpus and split seeds, then each product's scenarios are generated from derived seeds, one third of each product is held back and sealed, the same seeds give the same corpus, and a split seed equal to the corpus seed is refused.

### TC-026 No held-back record in the repository
- Product: Shared
- Traces to: DAT-002

Given the committed development data and the held-back manifest, then one third of each product is held back, no committed development record shares an id or fingerprint with a held-back record, and no data file carries the held-back package marker.

### TC-027 Data script checks
- Product: Shared
- Traces to: DAT-002, DAT-101

Given the snapshot file, then it is read only when its SHA-256 and export date match `data/fda/source.json`; given the route rule file, then it is used only when valid and verified, with every problem listed; given a path for the held-back package, then any path inside the repository, including a folder inside it whose name starts with two dots, or the repository itself, is refused (REV-002).

### TC-101 Lot blocked below minimum shelf life
- Product: Prepped
- Traces to: SYS-101, SYS-102, ARC-005
- Formerly: P-1

Given a lot expiring 2027-03-01 and a trip arriving 2026-12-01, when eligibility runs with the 12-month rule, then the lot is blocked with the reason "90 days remaining, 365 required" (OD-009).

### TC-102 Lot eligible above minimum shelf life
- Product: Prepped
- Traces to: SYS-101, SYS-102, ARC-005
- Formerly: P-2

Given a lot expiring 2028-01-15 and the same trip, then it is eligible with 410 days remaining.

### TC-103 Controlled substance blocked
- Product: Prepped
- Traces to: SYS-103
- Formerly: P-3

Given a lot marked controlled, then it is blocked whatever its expiry.

### TC-104 Unknown expiry needs review
- Product: Prepped
- Traces to: SYS-105, SYS-106
- Formerly: P-4

Given a lot with no expiry date, then it is "needs review" and excluded from readiness; an expiry that cannot be read, such as 2028-02-30, is treated the same way.

### TC-105 Missing import permit means No go
- Product: Prepped
- Traces to: SYS-107, AIC-102
- Formerly: P-5

Given a destination card that requires an import permit and no permit marked obtained, then the indicator shows "No go" and lists the missing permit, the meter shows its percentage as usual, and the document draft lists the missing permit (OD-052).

### TC-106 Item coverage
- Product: Prepped
- Traces to: SYS-106
- Formerly: P-6

Given a target of 200 courses and 150 eligible, then item coverage is 75%.

### TC-107 Duplicate donor lines merge
- Product: Prepped
- Traces to: AIC-101
- Formerly: P-7

Given two donor lines with the same lot number, generic name, strength, form and expiry from different donors, then they merge into one lot with summed quantity that lists both donors (OD-011).

### TC-108 Arrival change recalculates without AI
- Product: Prepped
- Traces to: SYS-101, SYS-003
- Formerly: P-8

Given the arrival date moves 30 days later, then eligibility recalculates without calling any AI step.

### TC-109 Cold-chain lot blocked
- Product: Prepped
- Traces to: SYS-104
- Formerly: P-9

Given a lot marked cold chain that would otherwise be eligible (expiring 2028-01-15, trip arriving 2026-12-01), then it is blocked with the reason "cold-chain items are not handled in this build".

### TC-110 Out-of-scope route blocked
- Product: Prepped
- Traces to: SYS-109

Given a lot for injection (route: intravenous), needing no cold chain, expiring 2028-01-15, and a trip arriving 2026-12-01, then it is blocked with the reason "outside this build's scope".

### TC-111 Topical and eye preparations in scope
- Product: Prepped
- Traces to: SYS-109

Given a skin cream lot and an eye-drop lot, neither needing a cold chain, both expiring 2028-01-15, and a trip arriving 2026-12-01, then both are eligible.

### TC-112 Floor item met by combining donations
- Product: Prepped
- Traces to: SYS-112, SYS-113

Given a floor item with a target of 100 and two eligible lots of the same medicine, strength and form, from different donors, of 60 and 50, then the item is covered and both lots are listed against it.

### TC-113 Shortage listed and No go
- Product: Prepped
- Traces to: SYS-112, SYS-113

Given a floor item with a target of 100 and 70 eligible, and every other floor item covered, then the indicator shows "No go" and lists that item as 30 short.

### TC-114 Missing required document means No go
- Product: Prepped
- Traces to: SYS-112

Given every floor item covered, and a destination rule card that requires an import permit not yet prepared, then the indicator shows "No go" and lists the permit.

### TC-115 Supplements never change the indicator
- Product: Prepped
- Traces to: SYS-114, SYS-112

Given every floor item covered and every required document prepared, when the clinician adds a supplement with no eligible stock, then the indicator still shows "Go".

### TC-116 Indicator label always shown
- Product: Prepped
- Traces to: SYS-112

Given any Go or No go result, then the indicator shows "Indicator only: deploying the team is the lead clinician's or team leader's decision".

### TC-117 No target means not covered
- Product: Prepped
- Traces to: SYS-110

Given a floor item with no target quantity entered, then it is "needs review", counts as not covered, and the indicator shows "No go".

### TC-118 More routes in scope
- Product: Prepped
- Traces to: SYS-109

Given inhaled, nasal, vaginal, ear and eye lots, none needing a cold chain, all expiring 2028-01-15, and a trip arriving 2026-12-01, then all are eligible.

### TC-119 Exchange offered but not counted until accepted
- Product: Prepped
- Traces to: SYS-115

Given a floor item for a 500 mg capsule with a target of 100, 40 eligible capsules, and an eligible lot of the same medicine as an oral suspension, then the suspension is offered as an exchange and the item stays 60 short until the clinician accepts the exchange.

### TC-120 Expired lot set aside for discard
- Product: Prepped
- Traces to: SYS-116

Given a lot expiring 2026-11-01 and a check made on 2026-11-11, then the lot is listed as "Discard: expired" and is never eligible.

### TC-121 Conflicting expiry for one lot number
- Product: Prepped
- Traces to: SYS-117

Given two donor lines with the same lot number and medicine but expiry dates of 2027-06-30 and 2027-09-30, then they are not merged and both are "needs review".

### TC-122 Accepted exchange counts what the clinician enters
- Product: Prepped
- Traces to: SYS-115

Given a floor item with a target of 100 and 40 eligible capsules, when the clinician accepts an oral suspension exchange and enters that it covers 60 of the target, then the item is covered; when the clinician enters 30, the item stays 30 short. Prepped performs no dose conversion in either case.

### TC-123 openFDA record to catalog entry
- Product: Prepped
- Traces to: DAT-101, SYS-103, SYS-109

Given an openFDA record for an oral capsule without a dea_schedule, then the catalog entry has its name, form, strength, route "oral", in scope, controlled "no" and the basis "FDA drug directory: no DEA schedule recorded (US scheduling only)" (OD-044); with dea_schedule "CII" it is controlled "yes" with the basis "FDA drug directory: DEA schedule CII"; its classes are its established pharmacologic classes (EPC), without the tag, and none when it has none; a biologic product type such as VACCINE makes it out of scope with the reason "biologic, treated as cold chain" (OD-049); a missing or blank product type gives "product type not recorded", and a dosage form beginning with GAS, such as "GAS, COMPRESSED", gives "outside this build's scope: dosage form …" while GRANULE stays in scope (REV-001, REV-002, OD-051), the reasons taking precedence in that order; an INTRAVENOUS route, an unmapped route such as BUCCAL, or ENTERAL (OD-045) makes it out of scope, with the reason.

### TC-124 Floor catalogue from the WHO list and FDA data
- Product: Prepped
- Traces to: DAT-102
- Status: Retired
- Reason: the WHO list is not used (owner, 2026-11-12); OD-046

Given WHO list items and FDA directory entries, then matched catalog entries carry both references, and each unmatched WHO item stays listed, marked "No FDA directory entry: enter details by hand" (OD-034).

### TC-125 Comparable alternatives for clinician choice
- Product: Prepped
- Traces to: SYS-108

Given a floor item that is short and eligible lots of another medicine in the same class, then those lots are listed as "Comparable, not equivalent: clinician review required" with their class and its source, and none is added until the clinician chooses it.

### TC-126 Caseload estimate never applied by itself
- Product: Prepped
- Traces to: SYS-111

Given an anticipated caseload, then any estimated quantity is labelled as an estimate and the target stays empty until the clinician accepts or changes it.

**SpareWing**

### TC-127 Same lot number, different details
- Product: Prepped
- Traces to: AIC-101

Given two donor lines with the same lot number and generic name but different expiry dates, then they stay separate lots, both flagged "Same lot number, different details: check" (OD-011).

### TC-128 Exactly 365 days of shelf life
- Product: Prepped
- Traces to: SYS-102

Given a trip arriving 2026-12-01, then a lot expiring 2027-12-01 (365 days) is eligible, and a lot expiring 2027-11-30 is blocked with the reason "364 days remaining, 365 required" (OD-009).

### TC-129 Expiry printed as month and year
- Product: Prepped
- Traces to: SYS-102

Given a lot whose expiry is entered as 03/2028, then its expiry is read as 2028-03-31 and shown as read from a month-only date (OD-043).

### TC-130 Snapshot catalogue
- Product: Prepped
- Traces to: DAT-101, SYS-109

Given a snapshot, then only products whose every reading is in scope are kept, sorted, with the source and counts; a file whose record count differs from its source, or a malformed source description, is refused.

### TC-131 Tablets and suspension together
- Product: Prepped
- Traces to: SYS-115

Given a floor item with a target of 100 and 40 eligible tablets, when the clinician accepts an oral suspension exchange covering 30 and another tablet strength covering 30, then the item is covered, each part counting what was entered for it.

### TC-133 Expiry formats printed on labels
- Product: Prepped
- Traces to: SYS-105, SYS-102

Given expiries in label formats, then every unambiguous one is read and the reading shown: full dates with the year first, with a named month, or with numeric day and month where only one order is a real date; month-and-year dates as the month's last day; any of these after a label word such as "EXP"; a two-digit year written last as 20YY (15 MAR 28, MAR 28, 03/28, 27/12/30). A day and month that could be read either way, an impossible date, an unknown month name, or extra text before or after the date needs review, with the reason (owner, 2026-11-13).

### TC-132 Controlled medicines labelled in the picker
- Product: Prepped
- Traces to: SYS-118

Given a catalogue with a controlled medicine, when the lead clinician picks floor items, then that medicine is labelled "Controlled: cannot be packed in this build" with its basis.

### TC-301 Alternate part found
- Product: SpareWing
- Traces to: SYS-301, SYS-305
- Formerly: S-1

Given a grounded aircraft needing part A, a listed alternate B, and one B at base 2, then B appears as a candidate with source base, transfer mode, ETA and the sign-off flag.

### TC-302 No candidates
- Product: SpareWing
- Traces to: SYS-306
- Formerly: S-2

Given no stock and no alternate, then the result says no candidates were found, to ask a human, and shows any entered order lead time.

### TC-303 Lapsed pilot excluded
- Product: SpareWing
- Traces to: SYS-303
- Formerly: S-3

Given a pilot whose entered currency lapsed, then the pilot is excluded with the reason shown.

### TC-304 Unknown availability shown
- Product: SpareWing
- Traces to: SYS-303, SYS-304
- Formerly: S-4

Given a pilot with no availability data, then the pilot shows as "unknown", not excluded.

### TC-305 Missed community flights
- Product: SpareWing
- Traces to: SYS-307
- Formerly: S-5

Given a community with flights on Tuesday and Friday and a five-day grounding starting Monday (Monday to Friday counts as five days inclusive), then two missed flights are reported.

### TC-306 Unverified ETA
- Product: SpareWing
- Traces to: SYS-304
- Formerly: S-6

Given a transfer mode with no entered lead time, then the ETA shows "unverified".

### TC-307 Unserviceable part never appears
- Product: SpareWing
- Traces to: SYS-302
- Formerly: S-7

Given a part marked not serviceable, then it never appears.

### TC-308 Ranking never hides a candidate
- Product: SpareWing
- Traces to: SYS-308

Given five candidates, then the ranked proposal lists all five with the reasons for their order, and none is removed.

### TC-309 No approvals or airworthiness statements
- Product: SpareWing
- Traces to: SYS-309

Given any proposal, then nothing approves a schedule change or states that an aircraft is flightworthy, and a decision is recorded only when the flight base director, mechanic or pilot records it.

### TC-310 Messages drafted, never sent automatically
- Product: SpareWing
- Traces to: SYS-310, AIC-302

Given a disruption and a chosen candidate, then the drafted message is marked as a draft, carries pilot ids instead of names to the AI step, and is not sent until a person sends it.

### TC-311 Parts emails parsed against golden examples
- Product: SpareWing
- Traces to: AIC-301

Given the recorded golden parts emails, then the parsed parts match the expected results, each with its source line and confidence, and an invalid output leads to manual entry.

### TC-312 SpareWing data recognisably synthetic
- Product: SpareWing
- Traces to: DAT-301

Given generated SpareWing data, then every part number and aircraft id uses the made-up format and every pilot name comes from the synthetic word lists.

### TC-313 Currency must last through the disruption
- Product: SpareWing
- Traces to: SYS-303

Given a pilot whose currency is valid on the date needed but lapses before the expected end of the disruption, then the pilot is not a candidate, with the reason naming the lapse date (OD-015).

### TC-314 Requirement from aircraft type and aircraft
- Product: SpareWing
- Traces to: SYS-303

Given an aircraft type whose rule file requires rating R1 and an aircraft that adds rating R2, then a pilot holding only R1 is not a candidate for that aircraft, with the reason "missing R2" (OD-014).

### TC-315 Cover only from listed bases
- Product: SpareWing
- Traces to: SYS-307

Given a community whose rule file lists only base 1, and an available aircraft with a qualified pilot at base 2, then their flights do not reduce the missed-flight count (OD-016).

### TC-316 Ranking order
- Product: SpareWing
- Traces to: SYS-308

Given two options with the same number of missed flights, then the one with the earlier return to service ranks first; given two with the same missed flights and return date, then the one with fewer transfers ranks first; every option stays visible with its reasons (OD-023).

## Revision history

| Version | Date | Change | By |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | First draft. Acceptance tests X-1..X-5, P-1..P-9, S-1..S-7 carried over as TC-001..005, TC-101..109, TC-301..307, wording unchanged (ADR-001). Safety-critical criteria (ADR-006), confirmation run (ADR-005), failure procedure. | Claude, for owner review |
| 0.2 | 2026-11-10 | New TC-110 to TC-117 for route scope, floor coverage, Go or No go indicator and supplements (ADR-009). | Claude, for owner review |
| 0.3 | 2026-11-11 | New TC-118 to TC-121 for wider routes, exchanges, discard of expired lots and one expiry per lot number (ADR-010). | Claude, for owner review |
| 0.4 | 2026-11-11 | New TC-122: an accepted exchange counts what the clinician enters (ADR-011). | Claude, for owner review |
| 0.5 | 2026-11-12 | New TC-006 to TC-010, TC-013 to TC-022, TC-123 to TC-126 and TC-308 to TC-312, closing every coverage gap; §4 records how mutation testing runs. | Claude, for owner review |
| 0.6 | 2026-11-12 | Owner decisions of 2026-11-12: TC-001, TC-101, TC-107, TC-123 and TC-124 updated; new TC-023, TC-024, TC-127 to TC-129, TC-313 to TC-316. | Claude, for owner review |
| 0.7 | 2026-11-12 | TC-123 classes; new TC-025, TC-026, TC-130, TC-131. | Claude, for owner review |
| 0.8 | 2026-11-12 | TC-123 biologics (OD-049); TC-124 retired (OD-046). | Claude, for owner review |
| 0.9 | 2026-11-12 | TC-123 missing product type and gases; new TC-027 data script checks, TC-132 picker label (REV-001). | Claude, for owner review |
| 0.10 | 2026-11-12 | TC-123 dosage-form prefix; TC-027 folder named with two dots (REV-002). | Claude, for owner review |
| 0.11 | 2026-11-12 | TC-104 covers an unreadable expiry (SYS-105). TC-105: "No go" in place of "Not ready" (OD-052). New TC-133 expiry formats on labels (owner, 2026-11-13). Implemented: TC-101 to TC-104, TC-108 to TC-111, TC-118, TC-120, TC-128, TC-129. | Claude, for owner review |
| 0.13 | 2026-11-13 | Implemented: TC-301 to TC-309 and TC-313 to TC-316, with tests of the proposed rules (SYS-301, SYS-303, SYS-304, SYS-307). Numbered 0.13 because the floor-coverage branch takes 0.12. | Claude, for owner review |
| 0.17 | 2026-11-15 | Implemented: TC-132 picker label. Numbered 0.17 because open branches take 0.14 to 0.16. | Claude, for owner review |
