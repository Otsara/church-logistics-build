---
id: ADR-054
title: The release gate checks shared items and the submitted product's, leaves deferred items out, and accepts recorded database checks
status: Accepted
date: 2026-11-23
decided: owner, 2026-11-23
---

# ADR-054 Release gate: submitted product, deferred items and recorded database checks

## Context

The strict release gate (`pnpm docs:check --strict`) failed with 17 errors on 2026-11-22. Apart from the seven unticked submission lines, three groups did not fit the gate's rules:

- **SpareWing items.** TC-310, TC-311, TC-329 and ARC-301 belong to SpareWing. Only one product is submitted, and Prepped is the default (OD-031).
- **The caseload estimate.** SYS-111 and TC-126 cover it, but it is not built: its method and parameters are undecided (OD-038), and none may be invented.
- **Database tests.** The gate counts only automated tests. Team separation (TC-024) and conflicts between two accounts (TC-023) are checked against the real database by SQL scripts that roll back, and their results are recorded in DOC-070. Running them in CI would need a database secret stored in GitHub.

## Options

- **D1, which items the gate covers:**
  - (a) Shared items and those of the submitted product, named in DOC-100.
  - (b) Every item of both products.
- **D2, team-separation and conflict evidence:**
  - (a) Accept the recorded result of a database script run, kept in DOC-070 with its date and outcome.
  - (b) Run the scripts in CI with a stored database secret.
- **D4, the caseload estimate:**
  - (a) Defer it beyond this build.
  - (b) The owner supplies the method and parameters, and it is built now.

## Decision

Owner, 2026-11-23: **D1 (a), D2 (a), D4 (a)**.

- **D1:** DOC-100 records the submitted product in a "Submitted product" field (Prepped). The gate leaves out items whose Product is the other product. Their coverage gaps and placeholders become warnings, so nothing is hidden.
- **D2:** A test case whose database check is recorded in DOC-070 counts as verified. That record gives the script, the date of the run and every check's result. The placeholder that stood for it in the test files is removed, with a note there pointing to the record. The scripts are rerun before release, in the pre-release confirmation run with the owner present.
- **D4:** An item with "Status: Deferred (owner, date)" is left out of the gate. SYS-111 and TC-126 are deferred, and OD-038 stays open for after the hackathon. The submission says the caseload estimate is not in this build.

## Consequences

- The gate covers 21 more items as warnings rather than errors. The warnings stay in every run, so SpareWing's gaps and the deferred estimate remain visible.
- Choosing SpareWing instead later means changing one field in DOC-100; the gate then checks SpareWing's items and leaves Prepped's out.
- A database check recorded once can go stale after a migration. Any change under `supabase/migrations` reruns both scripts and updates their records in DOC-070.
