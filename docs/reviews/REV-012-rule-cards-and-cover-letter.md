---
id: REV-012
title: Line-by-line review of the destination rule cards and the covering letter
date: 2026-11-17
---

# REV-012 Line-by-line review of the destination rule cards and the covering letter

## Reviewed

The destination rule cards (`packages/core/src/prepped/destination-card.ts` and `rules/prepped/destination-*.json`; SYS-120, DAT-103) and the covering letter (`packages/ai/src/steps/cover-letter.ts`; AIC-102), from the pull request "Prepped: synthetic destination rule cards, a checklist built from the card, and the AI covering letter" (#32). The review took place in the build conversation on 2026-11-17, in two parts. Before presenting each part, Claude fed deliberately wrong input to the code.

## Part 1: the rule cards

| # | Finding | Decision |
|---|---|---|
| 1 | The Honduras card was accepted with its country changed to Nigeria. | Yes: a card's id must match its country. |
| 2 | An item NG-02 was accepted on the Honduras card. | Yes: all items share one prefix. |
| 3 | A card item reading "An approved import permit" was accepted and printed in the checklist. | Yes: the forbidden-claims list moves to core, and core refuses such a card. |
| 4 | Are there more predictable barriers to import beyond the four synthetic items? The owner asked about the counterparts of the US FDA, and whether a packing list is enough for customs. Claude read the WHO guidelines (2010) and set out what they say, marking separately what was not verified. | (a): add a sourced WHO card for every destination, with each item citing its article, kept as a placeholder until the owner verifies it. The country cards stay synthetic. National regulators and controlled-medicine import authorisation go to OD-003. |

## Part 2: the covering letter

| # | Finding | Decision |
|---|---|---|
| 1 | "Have to be registered" and "compulsory and necessary" passed without a citation. | Yes: more requirement words. |
| 2 | "We also enclose a phytosanitary certificate" passed. | Yes: naming a document needs a citation. |
| 3 | "We also send Morphine and Diazepam" passed, though neither was in the shipment. | (a): code adds the medicine list, and a catalogue medicine not in the shipment is refused. |
| 4 | "Controlled medicines are not shipped (HN-01)" passed, but HN-01 is the import permit. | (a): a citing sentence must share a meaningful word with the item. |

## Outcome

- All decisions are recorded in ADR-044, and ADR-042 is accepted (owner, 2026-11-17). They are built with tests on the same branch.
- Building them found one more bug, fixed: a word losing its final "s" escaped the common-word filter ("this" became "thi").
- The changed files have full line and branch coverage, and a mutation score of 96.74% (the threshold is 80%, ADR-006). The 10 surviving mutants are equivalent.
- Still owed by the owner: verifying the WHO card against the PDF, after which its status becomes verified.
