---
id: REV-001
title: Line-by-line review of the iteration-0 safety-critical code
date: 2026-11-12
---

# REV-001 Line-by-line review of the iteration-0 safety-critical code

## Reviewed

The safety-critical code merged to `main` by pull request #5 (merge commit `f3841bf`, head `7f681da`), reviewed line by line in the build conversation on 2026-11-12, in six parts:

| Part | Unit | Lines | Verdict |
| --- | --- | --- | --- |
| 1 | `packages/core/src/dates.ts` (ARC-005): the change removing the redundant year check | 22–29 | Accepted (owner, 2026-11-12) |
| 2 | `rules/prepped/route-scope.json` (SYS-109, OD-042, OD-049) | 1–45 | Accepted, with F-1 (owner, 2026-11-12) |
| 3 | `packages/synth/src/fda.ts` (ARC-015): categories, schemas, record shape, classes, controlled status | 1–105 | Accepted, with F-2 (owner, 2026-11-12) |
| 4 | `packages/synth/src/fda.ts`: reading one record | 107–173 | Accepted (owner, 2026-11-12) |
| 5 | `packages/synth/src/fda.ts`: merging across labelers | 175–222 | Accepted (owner, 2026-11-12) |
| 6 | `packages/synth/src/snapshot.ts` (ARC-018) | 1–95 | Accepted, with F-3 and F-4 (owner, 2026-11-12) |

The review took place after pull request #5 was merged. ADR-006 expects the review before merging; this record states the order as it happened.

Results reviewed: 100% line and branch coverage of `packages/core`, `fda.ts` and `snapshot.ts`; Stryker mutation score 96.81% on the safety-critical code at the merged commit, with six surviving mutants, each explained in pull request #5 (three equivalent, one equivalent ordering comparison, two that change only the order of the frozen catalogue).

## Findings

| ID | Finding | Resolution |
| --- | --- | --- |
| F-1 | 180 compressed gases (oxygen, nitrogen, medical air, carbon dioxide, nitrous oxide, mixtures) were in scope through RESPIRATORY (INHALATION). | Dosage form GAS excluded (OD-051, ADR-020); catalogue re-imported (32,406 entries). |
| F-2 | A record without a product type would not be recognised as a biologic. | A missing or blank product type is out of scope, with the reason "product type not recorded" (ADR-020); TC-123. |
| F-3 | Controlled medicines stay in the catalogue, so the floor-list picker could offer one that cannot be packed. | Kept in the catalogue; the picker labels them "Controlled: cannot be packed in this build" (SYS-118, TC-132, ADR-020). |
| F-4 | The data scripts' checks were not unit-tested. | The checks moved to `packages/synth/src/data-checks.ts` with tests (TC-027), 100% coverage and mutation testing; the scripts call them. |

Rulings without a change (owner, 2026-11-12):

- The verified date in the route rule file also covers the biologic product types added after the OD-042 check.
- PERCUTANEOUS stays out of scope.
- Ingredient order and the un-normalised merge key are left as they are: they can repeat a product but never merge two different ones.
- When labelers list different DEA schedules, the first is shown; the entry is controlled and blocked either way.

Noted, not adopted: the owner's view that a medicine not controlled in the US would rarely be controlled at a mission destination. Claude could not confirm it: pseudoephedrine (83 in-scope entries) is not DEA-scheduled but Mexico banned its import in 2008, and gabapentin (20 entries) is not federally scheduled but has been a Class C controlled drug in the UK since April 2019. HAZ-103 stays serious and possible, controlled by the pharmacist's check of the destination's rules.

## Decision

Accepted, with the changes F-1 to F-4 (owner, 2026-11-12). The changes were made test-first on `build/rev-001-followups`; after them, the mutation score on the safety-critical code is 97.32%, with the same six surviving mutants.
