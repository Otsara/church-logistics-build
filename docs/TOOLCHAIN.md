# Toolchain

Why each tool and setting is here, and which spec item it serves. Written for this hackathon build from `docs/BUILD_SPEC.md`; no configuration, code or templates were carried over from earlier projects (see Q-19).

| Tool or setting | Choice | Serves |
| --- | --- | --- |
| Language | TypeScript, one `tsconfig.json` for the whole workspace | F-1 |
| Strictness | `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, so a missing value is visible to the compiler | SC-4, PE-5 |
| Packages | pnpm workspace: `packages/core`, `ai`, `synth`, `store`; screens in `apps/` | F-2 |
| Dates | `packages/core/src/dates.ts`: date-only `IsoDate` type, whole days in UTC | F-5 |
| Rule files | Envelope checked by `parseRuleFile` (zod); every file in `/rules` is checked by a test | F-4 |
| Tests | Vitest for packages; Node's built-in runner for `tools/` | F-10 |
| Coverage | 100% of lines and branches in `packages/core`, 90% elsewhere | PE, PR, SC, SI |
| Lint | `typescript-eslint` strict type-checked, plus spec rules: core has no network, no clock and no imports from `ai`, `store` or `synth`; no "approved" in source strings | F-2, F-5, AR-3, SC-5, CLAUDE.md rule 6 |
| Formatting | Prettier with its default settings; Markdown is left as written | |
| Traceability | `tools/check-trace.mjs` checks the spec against the tests and writes `docs/TRACEABILITY.md` | BUILD_SPEC "Traceability" |
| CI | `.github/workflows/verify.yml`: formatting, lint, types, tests with coverage, traceability and a dependency audit on every pull request; the strict submission gate on demand | |
| Versions | Exact dependency versions (`.npmrc`), Node 24 in CI, Node 22.12 or later locally | |
| Security | `pnpm audit` in CI fails on high or critical advisories; `pnpm-workspace.yaml` overrides an old `minimatch` in the lint tooling (none known at commit) | |

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install` | Install exact locked dependencies |
| `pnpm test` | Unit and acceptance tests, then the checker's own tests |
| `pnpm check` | Everything CI runs: formatting, lint, types, tests with coverage, traceability |
| `pnpm trace:update` | Regenerate `docs/TRACEABILITY.md` after changing tests or the spec |
| `pnpm check:trace --strict` | Submission gate |
