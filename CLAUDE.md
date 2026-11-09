# Project: Prepped and SpareWing

Two small web apps for ministry logistics, built for the AI for Church Hackathon 2026.
Only one is submitted. Both share the core package.

The full build spec is in `docs/BUILD_SPEC.md`. Read it before starting any task.

## Layout
- packages/core: pure rule functions, no network, no AI
- packages/ai: one typed function per AI step, schema-validated
- packages/synth: seeded synthetic data generator
- packages/store: offline storage and sync (proposed in spec v0.3; waits on Q-1)
- apps/prepped, apps/sparewing: screens (UI from Lovable under ui/)
- rules/: JSON rule files that a pharmacist or mechanic can read (format in `rules/README.md`)
- tools/check-trace.mjs: checks the spec against the tests
- docs/TRACEABILITY.md: generated matrix of spec items, tests and open questions
- docs/TOOLCHAIN.md: why each tool and setting is here
- docs/SUBMISSION.md: hackathon submission checklist (H-1 to H-7), ticked with evidence

## Commands
- install: `pnpm install`
- test: `pnpm test`
- full check (what CI runs): `pnpm check`
- traceability: `pnpm check:trace`; regenerate the matrix with `pnpm trace:update`
- submission gate: `pnpm check:trace --strict`
- dev: not yet; screens come from Lovable (Q-18)

## Rules for changes
1. Write the failing test from the acceptance list in `docs/BUILD_SPEC.md` first, then the code.
2. Eligibility, candidate and readiness logic lives in packages/core only. AI never decides these.
3. Dates are date-only ISO strings compared in UTC.
4. Use synthetic data only. Never commit real names, records or secrets.
5. Every AI call: validate against its schema, one retry, then fall back to manual entry.
6. Never output "approved" for a part, pilot, medicine or document. Use "candidate" or "draft" and require human sign-off.
7. Do not edit files under apps/*/ui by hand; regenerate them from Lovable.
8. Start every test title with the spec IDs it verifies in brackets, for example `it('[P-1] Given ...')`. Never rename, renumber or reuse an ID.
9. When a change affects `docs/BUILD_SPEC.md`, update it in the same pull request: bump the version and add a revision history row.
10. Before finishing, run `pnpm trace:update` and `pnpm check`. Both must pass. Report new warnings and any open question the work depends on.
11. Never close an open question (Q-n) without a decision from the owner in the conversation. Record the decision, the date and who decided.
12. Write the toolchain, tests and code fresh for this build. Do not copy configuration, code or templates from earlier projects (Q-19).
13. Keep the specs doc in step with the repo (owner instruction, 2026-11-09). Whenever `docs/BUILD_SPEC.md` changes, update the "Build spec" tab of the specs doc (https://claude.ai/artifact/KidYyKqH3HUeydraCFK4Vg) to match it in the same session, version and status included. The repo copy governs; never edit the doc first.

## Branches
Work on a branch named for its stream and topic, merge to `main` by pull request only, with the owner's agreement:
- `build/...` for the shared foundation
- `prepped/...` for Prepped rules and screens, for example `prepped/eligibility-rules`
- `sparewing/...` for SpareWing, for example `sparewing/candidate-rules`
- `shared/...` for the AI wrapper, synthetic data and offline store, for example `shared/ai-wrapper`

Parallel streams stay inside their own folders. The root `package.json`, `pnpm-lock.yaml`, `docs/BUILD_SPEC.md` and `CLAUDE.md` are shared: change them in small, separate commits, and after a merge regenerate `pnpm-lock.yaml` with `pnpm install` and the matrix with `pnpm trace:update` rather than merging them by hand.

## Open questions
`docs/BUILD_SPEC.md` lists open questions Q-1 to Q-21 (Q-10, Q-19 and Q-20 are closed). At the start of each task, check which ones affect it and say so. Do not guess an answer to an open question in code; ask the owner.

## Definition of done
- All acceptance tests in `docs/BUILD_SPEC.md` pass, every line of `docs/SUBMISSION.md` is ticked with its evidence, and `pnpm check:trace --strict` passes.
- The app works with the network off, apart from AI steps.
- Rules files cite a source link and a verified date.
