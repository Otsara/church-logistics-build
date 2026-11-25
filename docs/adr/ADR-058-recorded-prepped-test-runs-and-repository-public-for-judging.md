---
id: ADR-058
title: Recorded runs of the Prepped project's tests count at the release gate, and the build repository is public from submission until judging ends
status: Accepted
date: 2026-11-25
decided: owner, 2026-11-25
---

# ADR-058 Recorded Prepped test runs, and the repository public for judging

## Context

- **Screen tests.** TC-145 to TC-149 cover screen behaviour, tested in the Prepped Lovable project (`Otsara/prepped`), whose tests this repository does not run. The strict gate saw only placeholders and failed (OD-067).
- **Repository link.** SUB-006 asks for a repository link or a decision not to give one. The owner decided on 2026-11-12 to make "the repository" public for judging (OD-021), but there are two repositories, and the demo video's evidence card points to the tests and reviews in this one (OD-066).

## Options

- **OD-067:**
  - (a) Count a recorded run of the Prepped tests, kept in DOC-070 with its date, commit and result, as the database checks are (ADR-054, D2).
  - (b) Copy the tests into this repository and run them against the exported screens.
  - (c) Leave the five test cases out of the gate.
- **OD-066:**
  - (a) App link only.
  - (b) `Otsara/church-logistics-build` public.
  - (c) Both repositories public.

## Decision

- OD-067: option (a) (owner, 2026-11-25). A test case's "Recorded run" field, with a date (YYYY-MM-DD) and the commit tested, counts at the strict gate in place of a test here (`tools/check-docs.mjs`).
- OD-066: option (b) (owner, 2026-11-25). `Otsara/church-logistics-build` is public from the submission until judging ends, after a secret scan, then private again. `Otsara/prepped` stays private. The limits card in the video names the repository.

## Consequences

- A recorded run is only as current as its commit. A test case is recorded again whenever the screens it covers change, and in the pre-release confirmation run.
- Copies made while the repository is public remain after it is made private again. The repository stays "UNLICENSED": visible, not free to reuse.
