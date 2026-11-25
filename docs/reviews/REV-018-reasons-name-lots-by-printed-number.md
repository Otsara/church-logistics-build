---
id: REV-018
title: Line-by-line review of reasons naming a lot by its printed lot number
date: 2026-11-23
---

# REV-018 Line-by-line review of reasons naming a lot by its printed lot number

## Reviewed

The pull request "Prepped: reasons name a lot by its printed lot number" (Otsara/church-logistics-build#51, merged 2026-11-22), walked through in the build conversation (SYS-113, SYS-121; TC-144; ADR-024):

- `packages/core/src/prepped/floor.ts`:
  - `StockLot` gains an optional `lotNumber`;
  - the new `lotName` gives the printed number, or the lot's id when there is none or it is blank;
  - inside `assessFloor`, `nameOf` names a lot that is not in the stock list by its id;
  - every floor reason that names a lot uses them.
- `packages/core/src/prepped/packing.ts`: `HeldLot` gains an optional `lotNumber`, and every packing problem and stock conflict names the lot the same way.
- `packages/core/src/index.ts`: exports `lotName`.

Evidence at review:
- six TC-144 tests passing; the first four failed before the change;
- 100% branch coverage of `packages/core/src`;
- Stryker 98.34% on `floor.ts` and `packing.ts`, with the same 7 surviving mutants as before;
- CI passing.

## Findings and decisions

| # | Finding | Decision |
|---|---|---|
| 1 | The internal id stays the key, because two makers can print the same lot number. | Accepted as designed (ADR-024). |
| 2 | Sign-off still names a lot by its id in its quantity check, because it is given only ids. | Accepted; the screen does not normally show it. |

The owner confirmed the line-by-line review in the conversation on 2026-11-23 ("REV-018 and 019 reviewed"), after merging the pull request on 2026-11-22.

## Outcome

No change needed. The Prepped rules folder was rebuilt from the merged change (Otsara/prepped#4), and the screens pass `lotNumber` to the rules (Lovable commit c974209).
