---
id: REV-004
title: Line-by-line review of the Prepped floor coverage, Go or No go and readiness meter
date: 2026-11-15
---

# REV-004 Line-by-line review of the Prepped floor coverage, Go or No go and readiness meter

## Reviewed

The safety-critical code in the pull request "Prepped: floor coverage, exchanges, Go or No go indicator and readiness meter" (`prepped/floor-coverage`), `packages/core/src/prepped/floor.ts`, reviewed part by part in the build conversation from 2026-11-13 to 2026-11-15:

| Part | Unit | Verdict |
| --- | --- | --- |
| 1 | Matching lots to floor items, exchanges, double counting | Accepted, with F-1 to F-4 (owner, 2026-11-13) |
| 2 | The Go or No go indicator and its reasons | Accepted, with F-5 and F-6 (owner, 2026-11-13 and 2026-11-15) |
| 3 | The readiness meter | Accepted, with F-7 (owner, 2026-11-15) |

## Findings

| ID | Finding | Resolution |
| --- | --- | --- |
| F-1 | Safety rules not in the requirements: an empty floor list, a lot counted twice, doubtful exchanges. | Owner agreed all three (R1 to R3): "No go", both items need review, the exchange stops counting or the item needs review (ADR-023). |
| F-2 | A target of 0 was treated as missing. | A target of 0 asks the lead clinician to confirm it once; then the item is covered and left out of the meter (SYS-110). |
| F-3 | Lots identical between manufacturers are not necessarily the same product. | OD-054: donor lines merge only within one manufacturer; floor items count lots across manufacturers, each shown with its maker (ADR-024). |
| F-4 | A donor line without a manufacturer. | Not treated as the same manufacturer, even where likely: it never merges (SYS-117). |
| F-5 | Who marks a required document reviewed. | The lead clinician or team leader (SYS-112). |
| F-6 | Reason wording (Q6). | Six reasons reworded as chosen by the owner, naming the lot's medicine, strength and form where relevant; eight unchanged. |
| F-7 | Meter choices (M1 to M3). | With no documents required, the document share is complete; a needs-review item counts 0%; 70/30 kept until the screens are built (SYS-106). |

## Results reviewed

100% line and branch coverage; Stryker mutation score 100% on `floor.ts` after F-1 to F-7, with no surviving mutants.

## Decision

Accepted, with F-1 to F-7 (owner, 2026-11-15).
