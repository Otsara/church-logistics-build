---
id: ADR-024
title: A lot belongs to one manufacturer; floor items count lots across manufacturers
status: Accepted
date: 2026-11-13
decided: owner, 2026-11-13
---

# ADR-024 A lot belongs to one manufacturer; floor items count lots across manufacturers

## Context

In the review of floor coverage the owner pointed out that lots incidentally identical between manufacturers are not necessarily the same product: one manufacturer's lot can arrive from several donors, but different manufacturers never release the same lot. Two rules use the idea of "the same": merging donor lines into one lot (OD-011, ADR-017, TC-107) and counting lots toward a floor item (SYS-113, TC-112). Raised as OD-054.

## Options

- Merging: as before (lot number, generic name, strength, form and expiry); or the manufacturer must match too.
- Counting: (a) count every eligible lot of the same name, strength and form directly, each shown with its manufacturer; (b) count directly only one manufacturer's lots and offer the others like exchanges; (c) count them directly, but the item needs review until the clinician confirms the manufacturers present.

## Decision

By the owner on 2026-11-13: donor lines merge only when the manufacturer matches too; and option (a) for counting, as Claude recommended.

## Consequences

- Lot identity is protected where it matters, in merging: two manufacturers' lots with the same lot number stay separate and are flagged (TC-127), and SYS-117's expiry conflict applies within one manufacturer.
- Generic floor items ("amoxicillin 500 mg capsules") are met by any maker's lots, each listed with its manufacturer, so the clinician sees what will be packed before signing off the list.
- The Lot entity gains a manufacturer field; the donor-list step (AIC-101) is to read it from the label where present.
- A line without a manufacturer is not treated as the same manufacturer, even where that is likely: it never merges and raises no expiry conflict (SYS-117), and a line sharing its lot number is flagged "Same lot number, different details: check" (TC-127) (owner, 2026-11-13). Claude had proposed the opposite, cautious reading; the owner chose this one.
