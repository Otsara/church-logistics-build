## What changed and why

<!-- One or two sentences. Name the stream: Prepped rules, SpareWing rules, AI wrapper, synthetic data, offline store, screens or foundation. -->

## Spec items

| ID | Added, changed, verified or retired |
| --- | --- |
| | |

Build spec version: unchanged / 0.x -> 0.y
Open questions this depends on or closes: Q-n / none

## Author checks

- [ ] The failing acceptance test was written first, then the code (CLAUDE.md rule 1)
- [ ] Every new or changed test starts its title with the spec IDs it verifies, for example `[P-1]`
- [ ] `pnpm check` passes, and `pnpm trace:update` was run with `docs/TRACEABILITY.md` committed
- [ ] Spec changes bump the version and add a revision history row; no ID was renumbered or reused
- [ ] If the spec changed, the "Build spec" tab of the specs doc on claude.ai was updated to match
- [ ] A closed question records the decision, the date and who decided
- [ ] Eligibility, candidate and readiness logic is only in `packages/core`; no AI step decides them
- [ ] AI steps validate against a schema, retry once, fall back to manual entry, replace names with ids and log the call
- [ ] Nothing says "approved"; drafts and candidates need a person's sign-off
- [ ] Synthetic data only: no real names, records or secrets
- [ ] Rule files cite a source link, and a verified date or `placeholder` status
- [ ] Nothing under `apps/*/ui` was edited by hand
- [ ] AI-assisted: yes / no

## Reviewer checks

- [ ] The behaviour matches the cited spec items, read in `docs/BUILD_SPEC.md`, not only the tests
- [ ] The spec, the tests and `docs/TRACEABILITY.md` agree
- [ ] An AI assistant does not approve this pull request
