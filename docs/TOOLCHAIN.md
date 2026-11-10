# Toolchain

Why each tool and setting is here, and which spec item it serves. Supporting file governed by DOC-040. Written for this hackathon build; no configuration, code or templates were carried over from earlier projects (see OD-019).

| Tool or setting | Choice | Serves |
| --- | --- | --- |
| Language | TypeScript, one `tsconfig.json` for the whole workspace | ARC-001 |
| Strictness | `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, so a missing value is visible to the compiler | SYS-304, SYS-105 |
| Packages | pnpm workspace: `packages/core`, `ai`, `synth`, `store`; screens in `apps/` | ARC-002 |
| Dates | `packages/core/src/dates.ts`: date-only `IsoDate` type, whole days in UTC | ARC-005 |
| Rule files | Envelope checked by `parseRuleFile` (zod); every file in `/rules` is checked by a test | ARC-004 |
| Tests | Vitest for packages; Node's built-in runner for `tools/` | ARC-010 |
| Coverage | 100% of lines and branches in `packages/core`, 90% elsewhere | PE, PR, SC, SI |
| Lint | `typescript-eslint` strict type-checked, plus spec rules: core has no network, no clock and no imports from `ai`, `store` or `synth`; no "approved" in source strings | ARC-002, ARC-005, SYS-003, SYS-305, CLAUDE.md rule 6 |
| Formatting | Prettier with its default settings; Markdown is left as written | |
| Reconciliation | `tools/check-docs.mjs` checks document versions, IDs, trace links, coverage and test tags, and regenerates DOC-001, DOC-003, DOC-050 and DOC-080 | DOC-000 §8 |
| CI | `.github/workflows/verify.yml`: formatting, lint, types, tests with coverage, traceability and a dependency audit on every pull request; the strict submission gate on demand | |
| Versions | Exact dependency versions (`.npmrc`), Node 24 in CI, Node 22.12 or later locally | |
| Security | `pnpm audit` in CI fails on high or critical advisories; `pnpm-workspace.yaml` overrides an old `minimatch` in the lint tooling (none known at commit) | |

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install` | Install exact locked dependencies |
| `pnpm test` | Unit and acceptance tests, then the checker's own tests |
| `pnpm check` | Everything CI runs: formatting, lint, types, tests with coverage, document check |
| `pnpm docs:update` | Regenerate the index, decision list, ADR index and traceability matrix |
| `pnpm docs:check --strict` | Release gate |
