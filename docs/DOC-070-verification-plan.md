---
id: DOC-070
title: Verification and validation plan
version: 0.1
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
2. Mutation score of at least 80% (Stryker), measured on the changed code and critical paths (owner, 2026-11-10).
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

Given edits made offline, when the connection returns, then all edits appear after sync and any conflict keeps both versions in the audit log.

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

**Prepped**

### TC-101 Lot blocked below minimum shelf life
- Product: Prepped
- Traces to: SYS-101, SYS-102, ARC-005
- Formerly: P-1

Given a lot expiring 2027-03-01 and a trip arriving 2026-12-01, when eligibility runs with the 12-month rule, then the lot is blocked with the reason "90 days remaining, 12 months required".

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

Given a lot with no expiry date, then it is "needs review" and excluded from readiness.

### TC-105 Missing import permit
- Product: Prepped
- Traces to: SYS-107, AIC-102
- Formerly: P-5

Given a destination card that requires an import permit and no permit marked obtained, then readiness shows "Not ready" and the document draft lists the missing permit.

### TC-106 Item coverage
- Product: Prepped
- Traces to: SYS-106
- Formerly: P-6

Given a target of 200 courses and 150 eligible, then item coverage is 75%.

### TC-107 Duplicate donor lines merge
- Product: Prepped
- Traces to: AIC-101
- Formerly: P-7

Given two donor lines with the same lot number and generic name, then they merge into one lot with summed quantity.

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

**SpareWing**

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

## Revision history

| Version | Date | Change | By |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | First draft. Acceptance tests X-1..X-5, P-1..P-9, S-1..S-7 carried over as TC-001..005, TC-101..109, TC-301..307, wording unchanged (ADR-001). Safety-critical criteria (ADR-006), confirmation run (ADR-005), failure procedure. | Claude, for owner review |
