---
id: DOC-070
title: Verification and validation plan
version: 0.50
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
2. Mutation score of at least 80% (Stryker), measured on the changed code and critical paths (owner, 2026-11-10). `stryker.config.json` lists the safety-critical units to mutate, and CI runs `pnpm mutation` on every pull request or push that changes them or what builds and tests them; a manual run always runs it (owner, 2026-11-20; ADR-051). Incremental mode is off: on 2026-11-12 it reused stale results and under-reported the score (90.85% against 96.48% on a full run), and stale results could equally over-report.
3. The owner's line-by-line review in the build conversation, written up as a review record `docs/reviews/REV-nnn-*.md` naming the commit and files reviewed (owner, 2026-11-10).

## 5. Pre-release confirmation run

1. Check the held-back set's fingerprints against the committed manifest (DAT-002), with `node packages/synth/scripts/confirm-held-back.ts <package> [--with-ai]`, which stops on any difference (TC-034).
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

Given a signed-in device with nothing waiting to sync, when the person signs out, then the device store is cleared. Given edits waiting or a conflict held, then signing out warns with the counts and offers to stay signed in or discard them, and nothing is cleared until the person chooses (OD-033; owner, 2026-11-23, D3).

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

The server's part is also checked against the database with `supabase/tests/two_account_conflict.sql`, which acts as the demo team's two accounts and rolls back. Run on 2026-11-23: all six checks as expected (the lead creates version 1; the pharmacist pulls it; the lead edits to version 2; the pharmacist's edit made from version 1 is refused, and the server answers with version 2, the lead's data and editor; the pharmacist's choice is accepted as version 3; the lead pulls version 3, edited by the pharmacist). Recorded results count as verification (owner, 2026-11-23, D2; ADR-054). Run through the screens on 2026-11-24 with the two recording accounts in two browser windows, the pharmacist's offline: steps 1 to 5 and 7 as expected (the conflict card within a second of reconnecting; the pharmacist's choice saved as version 5; both versions and the choice in the audit log); step 6 failed: the lead's open floor list kept the old target until the page was reopened (HAZ-115). After the fix (TC-145), rerun on 2026-11-25: the open page showed the new target within 23 seconds. The owner's own two-device run on 2026-11-27 (05:33 to 06:14 UTC), Chrome 157.0.8103.79 as the lead and Microsoft Edge 157.0.4341.60 as the pharmacist, through the screens: all seven steps passed, each checked against the server (version 32, by the lead, target 250; the offline edit held with nothing sent; "Conflict: check" with both versions on reconnecting; the pharmacist's choice saved as version 33, target 300; the lead's open floor list showed 300 without reopening the page, and clicking into the box and out again saved nothing; the four audit entries newest first). Two display findings: the audit log's Trip column shows "Team stock" for the conflict entries, and before-and-after shows raw record text (left until after the submission, F4).

### TC-024 Sign-in and team separation
- Product: Shared
- Traces to: SEC-008

Given a device that has signed in and then goes offline, then work continues and its edits sync at the next connection with the editor recorded; given a person from another team, then that person cannot read or change this team's records; given unsynced edits, then signing out warns, and they are kept until they sync unless the person chooses to discard them (OD-001, OD-033).

The team separation and the person check are tested against the database with `supabase/tests/team_separation.sql`, which acts as the demo team's accounts and rolls back. Run on 2026-11-21 after the owner approved the migrations: all nine checks as expected (new record accepted as version 1, edit as version 2, a stale edit refused with the current row, a change under another person refused, a push into another team refused, another team's records invisible by pull and by direct read, nothing deletable, only one's own membership visible and one's own roles unchangeable, and the second account pulls the first's record). Recorded results count as verification (owner, 2026-11-23, D2; ADR-054); the script is rerun after any migration and in the pre-release confirmation run.

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


### TC-028 AI gateway answers only signed-in, valid requests
- Product: Shared
- Traces to: ARC-014, SEC-001, SEC-008

Given a request without a signed-in user's token, by a method other than POST, or with a body that is not a known step, tier and non-empty prompt, then it is refused (401, 405 or 400) and the AI service is never called; given a valid request, the AI service is called once and its text returned; given an AI service failure, then 502 is returned with no detail of the failure.

### TC-029 AI gateway calls the lowest-cost model once
- Product: Shared
- Traces to: ARC-014, ARC-009

Given a prompt, then Claude Haiku 5.5 is called once at low effort with the SDK's own retries off, and only the answer's text is returned; given an answer cut off, refused or paused, or a server error, then the call fails once without retrying.

### TC-030 Browser client sends the user's token, never the key
- Product: Shared
- Traces to: ARC-014, SEC-001

Given a signed-in user, then the browser's client posts the step to the gateway with the user's token and returns the text; given no sign-in, a refusal or an answer without text, then it fails, and the runner sends the person to manual entry.
### TC-031 Rules folder for the screens matches the source and holds no server code
- Product: Shared
- Traces to: ARC-003, SEC-001

Given the generated rules folder, then it holds the core rules, the AI steps and their checks, and the rule files as text; every file is an exact, stamped copy of its source; the folder type-checks on its own with only zod from outside it; it holds no call to the AI service and no gateway handler; and the check reports any edited, missing or extra file.

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

Given two donor lines with the same lot number, generic name, strength, form, expiry and manufacturer from different donors, then they merge into one lot with summed quantity that lists both donors (OD-011).

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

Given two donor lines with the same lot number, medicine and manufacturer but expiry dates of 2027-06-30 and 2027-09-30, then they are not merged and both are "needs review".

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
- Status: Deferred (owner, 2026-11-23, D4; ADR-054)

Given an anticipated caseload, then any estimated quantity is labelled as an estimate and the target stays empty until the clinician accepts or changes it.

**SpareWing**

### TC-127 Same lot number, different details
- Product: Prepped
- Traces to: AIC-101

Given two donor lines with the same lot number and generic name but different expiry dates, or different manufacturers, then they stay separate lots, both flagged "Same lot number, different details: check" (OD-011).

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

### TC-134 Chosen comparable alternative counts what the clinician enters
- Product: Prepped
- Traces to: SYS-108, SYS-112

Given a floor item with a target of 300 and 100 eligible, when the clinician chooses a comparable alternative in the same class and enters that it covers 200, then the item is covered and shows that it is covered partly by a comparable alternative the clinician chose; when the clinician enters 120, the item stays 80 short; without a choice, nothing is counted (OD-055; owner, 2026-11-15).

### TC-135 Alternatives bring no extra class and are offered when the item is short
- Product: Prepped
- Traces to: SYS-108

Given a single-agent floor item in the penicillin class, then a combination product that shares the class but adds another (for example a beta-lactamase inhibitor) is not listed as an alternative, and if the clinician chooses it anyway the item needs review with the extra classes named. Given two floor items, one covered and one short, then both show their alternatives and only the short item's are marked as offered (owner, 2026-11-15; ADR-028).

### TC-136 A chosen amount beyond the lot, and an ineligible lot before a missing amount
- Product: Prepped
- Traces to: SYS-108, SYS-115

Given a floor item of 300 with 100 eligible, when the clinician chooses a comparable alternative whose lot holds 50 and enters that it covers 200, then the item needs review, the choice is not counted, and the reason says to find further donations or have the lead clinician redefine the floor; entered as 50, it counts. Given a chosen alternative or an accepted exchange whose lot is not eligible and has no amount entered, then it is reported as not eligible and not counted, not as needing an amount (owner, 2026-11-15; ADR-029).


### TC-137 Donor lists read against golden examples
- Product: Prepped
- Traces to: AIC-101, SYS-119

Given the recorded golden donor lists, then each expected line is read with its quantity, lot number, expiry and review flag, its name starting with the expected word, after the same runner and checks as in the app; an invalid recorded answer leads to manual entry.
### TC-138 Destination rule cards labelled as synthetic
- Product: Prepped
- Traces to: SYS-120, DAT-103

Given the destination rule cards for Honduras, Ethiopia, Nigeria and the Philippines, then each reads as a placeholder whose every item is labelled "Synthetic example for the demo: not a real import rule"; a placeholder card with an unlabelled item, an item named twice, a badly formed item or a key named twice is refused, listing each problem.

### TC-139 Covering letter names only the shipment's medicines and the items it cites
- Product: Prepped
- Traces to: AIC-102, SYS-120

Given a covering letter that names a medicine from the catalogue that is not in the shipment, or cites a card item without mentioning what it asks for, or names a document without citing an item, then it is not accepted and the blank template is shown with the medicine list and the checklists.

### TC-140 Packing list built soonest expiry first, only what is needed
- Product: Prepped
- Traces to: SYS-121, SYS-010

Given eligible stock beyond a floor item's target, then the item's own medicine is packed soonest expiry first and only as much as the target needs after exchanges and alternatives, the last lot in part, with what remains of each lot shown; exchanges and alternatives are packed only at the amounts the lead clinician enters; supplements at the amounts entered; the lead clinician's changes are used and marked; and any missing or wrong amount, a supplement not eligible, more taken than remains, or a floor item without a target is listed as a problem and stops the sign-off.

### TC-141 Stock shared across brigades
- Product: Prepped
- Traces to: SYS-121

Given another trip's signed-off packing list takes part of a lot, then only the rest is available to this trip (a 700 lot covering a target of 300 leaves 400); given signed-off lists that together take more of a lot than it holds, then the lot is in conflict, counts for neither, and both lists show "Conflict: check".

### TC-142 Team stock shows what remains of each lot
- Product: Prepped
- Traces to: SYS-121

Given the team's lots as recorded, not checked against any trip, and every signed-off packing list, then each lot shows what remains (a 700 lot after a list taking 300 shows 400); given lists that together take more of a lot than it holds, then the lot is in conflict, counts for none and shows "Conflict: check".

### TC-143 Covering letter template without an AI draft
- Product: Prepped
- Traces to: AIC-102, SYS-009

Given no AI draft at all, then the blank template is available on its own: a place for the team's letter, then the medicine list and the checklists, the same text shown when a draft is not accepted.

### TC-032 The device store survives a reload, and the demo resets
- Product: Shared
- Traces to: SYS-007, ARC-019

Given records, waiting edits, conflicts and audit entries saved on a device, when the app reloads, then all of them are as they were; given demo mode, when a person resets the demo data, then the device store is empty again and nothing was sent anywhere.

### TC-144 Reasons name a lot by its printed lot number
- Product: Prepped
- Traces to: SYS-113, SYS-121

Given a lot with a printed lot number, then every reason and packing problem about it (an alternative chosen or beyond what the lot holds, a lot counted toward two floor items, an amount beyond what the lot holds, an overdrawn lot in signed-off lists) names it by that number, for example "lot AMP8820"; given a lot with no lot number, or one not in the stock list, then its id.

### TC-133 Expiry formats printed on labels
- Product: Prepped
- Traces to: SYS-105, SYS-102

Given expiries in label formats, then every unambiguous one is read and the reading shown: full dates with the year first, with a named month, or with numeric day and month where only one order is a real date; month-and-year dates as the month's last day; any of these after a label word such as "EXP"; a two-digit year written last as 20YY (15 MAR 28, MAR 28, 03/28, 27/12/30). A day and month that could be read either way, an impossible date, an unknown month name, or extra text before or after the date needs review, with the reason (owner, 2026-11-13).

### TC-132 Controlled medicines labelled in the picker
- Product: Prepped
- Traces to: SYS-118

Given a catalogue with a controlled medicine, when the lead clinician picks floor items, then that medicine is labelled "Controlled: cannot be packed in this build" with its basis.

### TC-033 Number words quoted from the cited rule item
- Product: Shared
- Traces to: SYS-004, AIC-102

Given a covering-letter sentence that cites a rule card item and writes a number in words together with the word before or after it exactly as that item writes them (WHO-05: "at least one year"), then it is accepted; given the same number word next to other words ("one box"), or in a sentence that does not cite an item writing it, then it is not accepted: numbers are written in digits (owner, 2026-11-25).

### TC-145 A synced target replaces a stale one on an open screen
- Product: Prepped
- Traces to: SYS-110, SYS-007
- Recorded run: 2026-11-25, Otsara/prepped 218895c: 62 of 62 tests passed (vitest), including this test case's

Given the floor list open on a device showing a target of 250, when another device's change to 300 arrives by sync, then the box shows 300 without the page being reopened; given that change, when a person clicks into the box and leaves it without typing, then nothing is saved; given a person part-way through typing 280 when 300 arrives, then 280 is kept, a note says "Changed on another device to 300. Saving will replace it.", and leaving the box saves 280 (owner, 2026-11-25; HAZ-115). Screen tests in the Prepped app; on screen with two signed-in windows, 2026-11-25: the open page showed the new target within 23 seconds, and clicking in and out saved nothing.

### TC-146 The audit log in time order
- Product: Prepped
- Traces to: SYS-008
- Recorded run: 2026-11-25, Otsara/prepped 218895c: 62 of 62 tests passed (vitest), including this test case's

Given audit entries that arrived on the device out of time order, as after a sync, then the audit log lists them by time, newest first, ties by id (owner, 2026-11-25).

### TC-147 Trip details keep another device's changes
- Product: Prepped
- Traces to: SYS-007
- Recorded run: 2026-11-25, Otsara/prepped 218895c: 62 of 62 tests passed (vitest), including this test case's

Given the trip details form open and not edited, when another device's change arrives, then the form shows it; given a person who edited one field, when another device changes a different field and the person saves, then both changes are kept; given both changed the same field, then a note names the other device's change and saving keeps the person's value (owner, 2026-11-25; HAZ-115).

### TC-148 Packing-list amounts follow sync until edited
- Product: Prepped
- Traces to: SYS-121, SYS-007
- Recorded run: 2026-11-25, Otsara/prepped 218895c: 62 of 62 tests passed (vitest), including this test case's

Given a packing-list amount box not edited, when another device's change arrives, then the box shows it; given an edited box, then the edited value is kept and a note names the other device's change (owner, 2026-11-25; HAZ-115).

### TC-149 Unsaved letter text is not overwritten by sync
- Product: Prepped
- Traces to: AIC-102, SYS-007
- Recorded run: 2026-11-25, Otsara/prepped 218895c: 62 of 62 tests passed (vitest), including this test case's

Given covering-letter text the person has typed and not saved, when a new draft arrives from another device, then the typed text is kept and a note offers "Show the new version"; given no unsaved edits, then the new draft is shown (owner, 2026-11-25).

### TC-150 Meter values shown rounded down to 2 decimal places
- Product: Prepped
- Traces to: SYS-106

Given meter values of 0.8999999999999999, 0.5249999999999999, 0.999, 1 and 0, then they are shown as 0.90, 0.52, 0.99, 1.00 and 0.00: never more readiness than computed, and a value a hair below a whole hundredth because of computer arithmetic is shown as that hundredth (owner, 2026-11-25).

### TC-034 Confirmation-run checks
- Product: Shared
- Traces to: DAT-002, SYS-102, SYS-103, SYS-106, SYS-107, AIC-101

Given a set of synthetic Prepped scenarios, then for every lot and trip: an expired lot is set aside; a controlled, cold-chain or short-dated lot never goes; every lot that cannot go has a reason; Go appears only when nothing stands in the way; meter values stay between 0 and 1; and only eligible lots count toward the floor. Each broken rule is reported, and a rule that throws is a failure, not a crash. Given the AI's checked reading of the donor lines, in every line the check accepts a quantity, lot number or expiry other than the label's fails the run; a name, strength or form other than the label's is counted and reported, since a person chooses the catalogue entry for every line before it becomes stock (owner, 2026-11-26; OD-068, ADR-059). A line the check flags or cannot read goes to a person and is neither. Run by `packages/synth/scripts/confirm-held-back.ts`: on the development two thirds in rehearsal, and on the held-back third only at the confirmation run (§5). Confirmation run on 2026-11-26 at commit 32cee1d, with the owner present: fingerprints matched; 10 scenarios, 30 trips and 1,200 lot checks with 0 failures; 400 AI-read lines with 0 silent errors in quantity, lot number or expiry (13 exact, 18 flagged, 73 unread, 104 sent to manual entry, 225 name, strength or form differences); pass (REV-022).

### TC-301 Alternate part found
- Product: SpareWing
- Traces to: SYS-301, SYS-305
- Formerly: S-1

Given a grounded aircraft needing part A, a listed alternate B, and one B at base 2, then B appears as a candidate with source base, transfer mode, ETA, the sign-off flag, and the interchange to be confirmed by the pilot, mechanic or flight base director (owner, 2026-11-15).

### TC-302 No candidates
- Product: SpareWing
- Traces to: SYS-306
- Formerly: S-2

Given no stock and no alternate, then the result says no candidates were found, to ask a human, and shows any entered order lead time. A negative, fractional or missing order lead time reads "no order lead time entered"; 0 days is shown (owner, 2026-11-15; ADR-030).

### TC-303 Lapsed pilot excluded
- Product: SpareWing
- Traces to: SYS-303
- Formerly: S-3

Given a pilot whose entered currency lapsed, then the pilot is excluded with the reason shown.

### TC-304 Unknown availability shown
- Product: SpareWing
- Traces to: SYS-303, SYS-304
- Formerly: S-4

Given a pilot with no availability data, then the pilot shows as "data missing: availability not entered", not excluded (owner, 2026-11-15).

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
- Traces to: AIC-301, SYS-313

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


### TC-317 Part numbers matched without stray spaces or letter case
- Product: SpareWing
- Traces to: SYS-301

Given a needed part number and stock entered with leading or trailing spaces or in another letter case, then they match, as the same part number or a listed alternate; a part number differing by a dash or any other character does not (owner, 2026-11-15; ADR-030).

### TC-318 Quantity of a part needed
- Product: SpareWing
- Traces to: SYS-311

Given two of a part needed, then a base holding one is still listed and marked "holds 1 of 2 needed", and a base holding two is not marked; given no valid quantity needed, every candidate says "quantity needed not entered: check the base holds enough" (owner, 2026-11-15; ADR-030).

### TC-319 Ratings matched without stray spaces or letter case
- Product: SpareWing
- Traces to: SYS-303

Given required ratings and a pilot's ratings entered with leading or trailing spaces or in another letter case, then they match; a rating differing by any other character does not (owner, 2026-11-16; ADR-032).

### TC-320 No required ratings entered
- Product: SpareWing
- Traces to: SYS-303, SYS-304

Given an aircraft with no required ratings entered, then every pilot shows "data missing: required ratings not entered for this aircraft", never "candidate"; a pilot ruled out on another ground is still excluded (owner, 2026-11-16; ADR-032).

### TC-321 Expected end before the start
- Product: SpareWing
- Traces to: SYS-303, SYS-304, SYS-307

Given an expected end before the date needed, then every pilot shows "data missing: expected end is before the date needed: check the dates", and missed flights are unknown with "expected end is before the start: check the dates"; nothing is thrown (owner, 2026-11-16; ADR-032).

### TC-322 Flight schedule not entered
- Product: SpareWing
- Traces to: SYS-307, SYS-308

Given a community with no flight days entered, then missed flights are unknown, shown as "data missing: flight schedule not entered", never zero, and such an option ranks after every option with a known count, saying so (owner, 2026-11-16; ADR-032).

### TC-323 Cover aircraft availability
- Product: SpareWing
- Traces to: SYS-307

Given a cover aircraft at a listed base whose availability is not entered, or is entered as not available, then it does not reduce missed flights, and the reason says which (owner, 2026-11-16; ADR-032).

### TC-324 Decision time and option checked
- Product: SpareWing
- Traces to: SYS-309

Given a decision whose time is not a valid UTC date and time, or whose option is not in the ranked list, then it is refused with the reason; a valid one is recorded (owner, 2026-11-16; ADR-032).

### TC-325 Aircraft-type ratings rule file
- Product: SpareWing
- Traces to: SYS-303, ARC-004

Given `rules/sparewing/aircraft-type-ratings.json`, then it is a placeholder citing the synthetic data, each synthetic aircraft type requires the rating named after it, a type not listed requires nothing (shown by the pilot check as data missing), and a file with the wrong id, product or data is refused with every problem listed.

### TC-326 Cover-bases rule file
- Product: SpareWing
- Traces to: SYS-307, ARC-004, DAT-002

Given `rules/sparewing/cover-bases.json`, then it is a placeholder citing the synthetic data, lists each development scenario's communities with the base serving them, lists no held-back scenario, gives nothing for a scenario or community not listed, and a file with the wrong id, product or data is refused with every problem listed.

### TC-327 Aircraft types matched without stray spaces or letter case
- Product: SpareWing
- Traces to: SYS-303, SYS-312

Given an aircraft type asked for with leading or trailing spaces or in another letter case, then its ratings are found; given a ratings file with two entries that name the same type that way, then the file is refused naming both (owner, 2026-11-16; ADR-034).

### TC-328 Rule file naming a key twice refused
- Product: SpareWing
- Traces to: SYS-312, ARC-004

Given a rule file's text that names an aircraft type, a community or any field twice in one object, then the file is refused, listing each repeat and where it is, instead of the later entry silently replacing the earlier; text that is not JSON is refused (owner, 2026-11-16; ADR-034).

### TC-329 Placeholder rules shown on screen
- Product: SpareWing
- Traces to: SYS-312

Given a SpareWing result that relies on a placeholder rule file, then the screen shows "Placeholder rules: not for real flight decisions" beside it (owner, 2026-11-16; ADR-034). Built with the screens in iteration 3.
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
| 0.14 | 2026-11-13 | TC-107, TC-121, TC-127: manufacturer (OD-054); TC-112 lots shown with their maker. Implemented: TC-106, TC-112 to TC-117, TC-119, TC-122, TC-131, with tests of the proposed safety rules (SYS-106, SYS-112, SYS-113, SYS-115). TC-105 waits for the document draft (AIC-102, iteration 2). (prepared as 0.12 on the floor-coverage branch, renumbered after the SpareWing merge) | Claude, for owner review |
| 0.15 | 2026-11-15 | TC-301 interchange note; TC-304 "data missing" (owner, 2026-11-15; ADR-025). Numbered 0.15 because the floor-coverage branch takes 0.14. | Claude, for owner review |
| 0.16 | 2026-11-15 | Implemented: TC-107, TC-121, TC-127, with tests of lines without a manufacturer, lot number or readable expiry (SYS-117). Numbered 0.16 because the SpareWing decisions branch takes 0.15. | Claude, for owner review |
| 0.17 | 2026-11-15 | Implemented: TC-132 picker label. Numbered 0.17 because open branches take 0.14 to 0.16. | Claude, for owner review |
| 0.18 | 2026-11-15 | Implemented: TC-125 comparable alternatives. New TC-134 chosen alternatives count what the clinician enters (OD-055). | Claude, for owner review |
| 0.19 | 2026-11-15 | Tests for SYS-117: lines without a lot number or readable expiry, lot numbers kept as entered, merge review reasons at eligibility (ADR-027). Numbered 0.19 because the open alternatives branch takes 0.18. | Claude, for owner review |
| 0.20 | 2026-11-15 | New TC-135 alternatives bring no extra class and are offered when the item is short (ADR-028), implemented. Numbered 0.20 because the merge follow-ups branch takes 0.19. | Claude, for owner review |
| 0.21 | 2026-11-15 | New TC-136 a chosen amount beyond the lot needs review, and an ineligible lot is reported before a missing amount (ADR-029), implemented. | Claude, for owner review |
| 0.22 | 2026-11-15 | New TC-317 part numbers matched without stray spaces or letter case, TC-318 quantity of a part needed; TC-302 invalid order lead time, all implemented (ADR-030). | Claude, for owner review |
| 0.23 | 2026-11-16 | New TC-319 to TC-324 from the SpareWing review decisions (ADR-032), implemented. | Claude, for owner review |
| 0.24 | 2026-11-16 | New TC-325 and TC-326 for the SpareWing rule files, implemented. Numbered 0.24 because the SpareWing review branch takes 0.23. | Claude, for owner review |
| 0.25 | 2026-11-16 | New TC-327 and TC-328, implemented; TC-329 placeholder rules on screen, a placeholder test until the screens (ADR-034). | Claude, for owner review |
| 0.26 | 2026-11-16 | New TC-028 to TC-030 for the AI gateway, implemented. Numbered 0.26 because the rule-files review branch takes 0.25. | Claude, for owner review |
| 0.27 | 2026-11-16 | New TC-137 donor lists read against golden examples; TC-022 and TC-311 implemented except the recordings (OD-062). | Claude, for owner review |
| 0.28 | 2026-11-16 | TC-010 and TC-310 implemented; TC-008 implemented for AIC-302, AIC-102 to follow (ADR-039). | Claude, for owner review |
| 0.29 | 2026-11-17 | TC-008, TC-010, TC-310: tests added for the owner's review decisions (REV-011, ADR-040). | Claude, for owner review |
| 0.30 | 2026-11-17 | TC-010, TC-310: tests that the wording rules apply to explanations and messages alike (ADR-041). | Claude, for owner review |
| 0.31 | 2026-11-17 | New TC-138 rule cards checked and labelled, and TC-139 covering letter names only the shipment's medicines and the items it cites, both implemented. TC-007, TC-008 for AIC-102 and the draft part of TC-105 implemented (SYS-120, ADR-042, ADR-044). | Claude, for owner review |
| 0.32 | 2026-11-17 | TC-138: tests of the verified WHO card (ten items, notes) and of item notes in the checklist (ADR-045). | Claude, for owner review |
| 0.33 | 2026-11-18 | TC-009 implemented for the Prepped packing list sign-off; new TC-140 packing list built soonest expiry first and TC-141 stock shared across brigades, implemented (SYS-121, ADR-049). | Claude, for owner review |
| 0.34 | 2026-11-18 | New TC-031 the rules folder for the screens, implemented (ADR-048). | Claude, for owner review |
| 0.35 | 2026-11-19 | New TC-142 team stock shows what remains of each lot and TC-143 covering letter template without an AI draft, both implemented, so the screens take both from core (SYS-121, AIC-102). | Claude, for owner review |
| 0.36 | 2026-11-20 | §4: CI runs mutation testing only when safety-critical code or what builds it changes (ADR-051). | Claude, for owner review |
| 0.37 | 2026-11-21 | New TC-032 device store survives a reload and the demo resets; TC-024 tested against the database on 2026-11-21 (ARC-019, ADR-052, ADR-053). | Claude, for owner review |
| 0.38 | 2026-11-22 | New TC-144 reasons name a lot by its printed lot number, implemented (SYS-113). | Claude, for owner review |
| 0.39 | 2026-11-22 | TC-144 also covers chosen alternatives, packing problems and lots not in stock. | Claude, for owner review |
| 0.40 | 2026-11-22 | Release-gate placeholders replaced: TC-009 (rule files and lint), TC-013 (repository and the apps' rules folder; the published bundle is checked when published), TC-014, TC-017 (cover letter and readiness prompts), TC-105 (card, assessment, meter and checklist together); stale duplicates of TC-002 to TC-008, TC-010 and TC-022 removed, their tests being implemented. | Claude, for owner review |
| 0.41 | 2026-11-23 | TC-126 deferred (D4); TC-023 and TC-024 database checks recorded as verification (D2); ADR-054. | Claude, for owner review |
| 0.42 | 2026-11-23 | TC-018 states the expected result decided in OD-033; TC-024's sign-out wording follows it (owner, 2026-11-23, D3). | Claude, for owner review |
| 0.43 | 2026-11-25 | New TC-145 to TC-150 (sync on open screens, audit order, meter text); TC-023 screen run of 2026-11-24 and 2026-11-25 recorded. Numbered 0.43 because the device-store branch takes 0.42. | Claude, for owner review |
| 0.45 | 2026-11-25 | TC-145 to TC-149: recorded run of the Prepped project's tests (owner, 2026-11-25, OD-067; ADR-058). Numbered 0.45 because the covering-letter branch takes 0.44. | Claude, for owner review |
| 0.46 | 2026-11-25 | New TC-033 number words quoted from the cited rule item (owner, 2026-11-25; ADR-057). Prepared as 0.44; renumbered 0.46 after the meter-text merge took 0.43 and 0.45. | Claude, for owner review |
| 0.47 | 2026-11-26 | New TC-034 confirmation-run checks; §5 names the runner. The AI-reading pass rule is open (OD-068). | Claude, for owner review |
| 0.48 | 2026-11-26 | TC-034: the AI-reading pass rule decided (owner, 2026-11-26; OD-068, ADR-059). | Claude, for owner review |
| 0.49 | 2026-11-26 | TC-034: the confirmation run on the held-back third recorded, pass (REV-022). | Claude, for owner review |
| 0.50 | 2026-11-27 | TC-023: the owner's two-device run through the screens recorded, all seven steps passed. Numbered 0.50 because the held-back-run branch takes 0.49. | Claude, for owner review |
