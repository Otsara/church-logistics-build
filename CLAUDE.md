# Project: Prepped and SpareWing

Two small web apps for ministry logistics, built for the AI for Church Hackathon 2026.
Only one is submitted. Both share the core package.

The full build spec is in `docs/BUILD_SPEC.md`. Read it before starting any task.

## Layout
- packages/core: pure rule functions, no network, no AI
- packages/ai: one typed function per AI step, schema-validated
- packages/synth: seeded synthetic data generator
- apps/prepped, apps/sparewing: screens (UI from Lovable under ui/)
- rules/: JSON rule files that a pharmacist or mechanic can read

## Commands
- install: [fill in]
- test: [fill in]
- dev: [fill in]

## Rules for changes
1. Write the failing test from the acceptance list in `docs/BUILD_SPEC.md` first, then the code.
2. Eligibility, candidate and readiness logic lives in packages/core only. AI never decides these.
3. Dates are date-only ISO strings compared in UTC.
4. Use synthetic data only. Never commit real names, records or secrets.
5. Every AI call: validate against its schema, one retry, then fall back to manual entry.
6. Never output "approved" for a part, pilot, medicine or document. Use "candidate" or "draft" and require human sign-off.
7. Do not edit files under apps/*/ui by hand; regenerate them from Lovable.

## Definition of done
- All acceptance tests in `docs/BUILD_SPEC.md` pass.
- The app works with the network off, apart from AI steps.
- Rules files cite a source link and a verified date.
