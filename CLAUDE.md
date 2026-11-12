# Project: Prepped and SpareWing

Two decision-support apps for missionary work in pharmacy (Prepped) and flight (SpareWing), built in parallel for the AI for Church Hackathon 2026. Flight and pharmacy are high-risk endeavours: treat every change as safety work. Only one product is submitted; both share the core.

## At the start of every session

1. Read `docs/DOC-001-master-index.md` and `docs/DOC-000-document-control.md`. DOC-000 defines IDs, versions, review, approval and change control.
2. Read `docs/DOC-003-open-decisions.md`. Say which open decisions affect the task, and remind the owner of release blockers.
3. Read the documents that govern the task before proposing or changing anything. Requirements and decisions in them are binding unless the owner changes them.
4. Run `pnpm docs:check` and note any errors or gaps that matter to the task.

## While working

- **Update the documents in the same change as the work.** New or changed behaviour: DOC-020. New hazards or controls: DOC-030. Structure or AI steps: DOC-040. Security: DOC-060. Data: DOC-065. Tests: DOC-070. Dependencies, services or data sets: DOC-090 before first use. Plan or submission: DOC-100.
- **IDs:** every item has a unique `PREFIX-nnn` ID, is defined once as `### PREFIX-nnn Title` with its fields, traces to its parent, and is never renumbered or reused. Use the next free number in your product's range: 001–099 Shared, 100–299 Prepped, 300–499 SpareWing.
- **Versions:** every document change bumps the version and adds a revision history row. Commit messages name the documents and item IDs, for example `DOC-020 v0.2, DOC-070 v0.2: add SYS-110, TC-110`.
- **Owner decisions** are recorded as "(owner, YYYY-MM-DD)". A decision that crosses documents or affects safety gets an ADR in `docs/adr/` with context, options and consequences.
- **Never invent** safety or regulatory classifications, clinical claims, standards clauses or numeric limits. Write `TBD`, add an open decision to DOC-003, and ask the owner.
- **Never edit generated sections**; run `pnpm docs:update`.
- **Tests first:** write the failing test from the test case in DOC-070, then the code. Every test title starts with the IDs it verifies, for example `it('[TC-101] Given ...')`.
- **Safety-critical code** (marked in DOC-020 and DOC-040) needs 100% branch coverage, a Stryker mutation score of at least 80% on changed code and critical paths, and the owner's line-by-line review, recorded in `docs/reviews/` (ADR-006).
- **Data:** synthetic data only, never real personal or health data. Never read, open or tune against the held-back third (DAT-002); it is used only in the pre-release confirmation run with the owner present.
- **Code rules:** eligibility, candidate and readiness logic lives in `packages/core` only; AI never decides these. Dates are date-only ISO strings compared in UTC. Every AI call is schema-validated, retried once, then falls back to manual entry; names are replaced by ids first. Never output "approved" for a part, pilot, medicine or document. Never edit `apps/*/ui` by hand. Write all code and configuration fresh for this build.
- **Failures:** report them with evidence (command, output, commit). Investigate in order: reproduce, then causes, then a remedy plan listing the decisions the owner owes.

## Approval

Nothing is Approved, Verified, merged, tagged, deployed or published without the owner's explicit confirmation in the conversation. Never approve or merge a pull request. Record each review as `docs/reviews/REV-nnn-*.md`.

## Before finishing

Run `pnpm docs:update`, then `pnpm check` (includes `pnpm docs:check`). Both must pass. Report new warnings and coverage gaps, and any open decision the work depends on.

## Review copies and check-ins

- At each review point (a pull request opened, merged or baselined), republish the changed documents as review copies on claude.ai (https://claude.ai/artifact/KidYyKqH3HUeydraCFK4Vg), each stamped with document ID, version, status and commit. The repository governs; never edit a review copy first.
- Scheduled check-ins every 4 hours between 08:00 and 23:59 Central time list open release blockers, decisions owed, pull request and CI state, and days to the deadline (DOC-100 §3).

## Commands

- install: `pnpm install`
- test: `pnpm test`
- full check (what CI runs): `pnpm check`
- documents: `pnpm docs:check`; regenerate generated sections with `pnpm docs:update`; release gate `pnpm docs:check --strict`
- dev: not yet; screens come from Lovable (OD-018)

## Branches

Work on a branch named for its stream and topic; merge to `main` by pull request only, with the owner's agreement: `build/...` (foundation), `prepped/...`, `sparewing/...`, `shared/...` (AI wrapper, synthetic data, offline store). Parallel streams stay in their own folders and number ranges. Shared files (`package.json`, `pnpm-lock.yaml`, `CLAUDE.md`, DOC-000 to DOC-003) change in small, separate commits; after a merge, regenerate `pnpm-lock.yaml` with `pnpm install` and generated sections with `pnpm docs:update` rather than merging them by hand.

## Definition of done

- All test cases in DOC-070 pass, every safety-critical unit meets ADR-006, and the owner's reviews are recorded.
- Every line of `docs/SUBMISSION.md` is ticked with its evidence, and `pnpm docs:check --strict` passes.
- The app works with the network off, apart from AI steps.
- Rule files cite a source link and a verified date.
