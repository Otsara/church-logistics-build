---
id: REV-002
title: Line-by-line review of the REV-001 follow-up changes
date: 2026-11-12
---

# REV-002 Line-by-line review of the REV-001 follow-up changes

## Reviewed

The safety-critical changes in pull request #6 (`build/rev-001-followups`, head `838ad19`), reviewed line by line in the build conversation on 2026-11-12, before merging:

| Part | Unit | Lines | Verdict |
| --- | --- | --- | --- |
| 1 | `packages/synth/src/fda.ts` (ARC-015): excluded dosage forms, missing product type, order of reasons | 33–34, 145–155 | Accepted, with F-1 (owner, 2026-11-12) |
| 2 | `packages/synth/src/data-checks.ts` (ARC-018): snapshot, rule-file and held-back path checks | 1–49 | Accepted, with F-2 (owner, 2026-11-12) |

Results reviewed: 100% line and branch coverage of the safety-critical units; Stryker mutation score 97.32% at `838ad19`, with the six surviving mutants reviewed in REV-001.

## Findings

| ID | Finding | Resolution |
| --- | --- | --- |
| F-1 | The dosage-form exclusion matched "GAS" exactly, so a future snapshot spelling it "GAS, COMPRESSED" would slip through. | Any dosage form beginning with an excluded form is excluded; tests cover variants, several excluded forms, and GRANULE staying in scope (TC-123). The 2026-11-11 export uses only "GAS", so the catalogue is byte-identical and the held-back set stays valid. |
| F-2 | Claude's own bug: the held-back path check treated any relative path beginning with two dots as outside, so a folder inside the repository named "..held" would have passed. | Only a path that is `..` or climbs out of the repository counts as outside; a path on another drive is refused too. Tests cover "..held" and "...x" folders inside the repository (TC-027). |

## Decision

Accepted, with the changes F-1 and F-2 (owner, 2026-11-12). After them, the mutation score on the safety-critical code is 97.42%, with the same six surviving mutants; a new survivor found on the way (`some` read as `every`) was killed with a test using two excluded forms.
