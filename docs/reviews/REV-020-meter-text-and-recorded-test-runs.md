---
id: REV-020
title: Line-by-line review of meter values shown rounded down, and the release gate counting recorded test runs
date: 2026-11-26
---

# REV-020 Line-by-line review of meter values shown rounded down, and the release gate counting recorded test runs

## Reviewed

The safety-critical change in the pull request "Prepped: open screens follow synced values, the audit log is in time order, and meter values are rounded down" (Otsara/church-logistics-build#57, merged 2026-11-25), shown line by line in the pull request and the build conversation (SYS-106, TC-150; ADR-056; OD-067, ADR-058):

- `packages/core/src/prepped/floor.ts`, `meterText`: `(Math.floor(value * 100 + 1e-9) / 100).toFixed(2)`. It shows 2 decimal places, rounded down, so a screen never shows more readiness than computed. The 1e-9 allowance shows a value a hair below a hundredth through arithmetic (0.8999999999999999) as that hundredth (0.90).
- `tools/check-docs.mjs`, `RECORDED_RUN`: at the strict gate, a placeholder test passes only when its test case's "Recorded run" field names a date (YYYY-MM-DD) and a commit.

Evidence at review:
- the TC-150 test failed before the code existed, then passed;
- the gate's test failed, then passed, rejecting a run with no date, no commit, or neither;
- 100% branch coverage;
- Stryker 100% on `meterText` (3 of 3 mutants killed);
- CI passing, including the mutation job.

## Findings and decisions

None: the owner reviewed the change line by line and found nothing to change (owner, 2026-11-26).

## Outcome

No change needed. The screens show `meterText` from Lovable commit 9a11406, and the re-filmed demo shots show 0.52-style values.
