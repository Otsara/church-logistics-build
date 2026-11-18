---
id: ADR-044
title: Rule cards and the covering letter after the owner's review — cards match their country, one claims list in core, a sourced WHO card, and stricter citations
status: Accepted
date: 2026-11-17
decided: owner, 2026-11-17
---

# ADR-044 Rule cards and the covering letter after the owner's review

## Context

The owner reviewed the destination rule cards and the covering letter line by line (REV-012). Before each part, Claude fed deliberately wrong input to the code. All of the following were accepted:

- a card naming the wrong country;
- an item from another country's card;
- a card saying "approved";
- requirements stated in other words;
- documents and medicines not on the card or in the shipment;
- a citation of the wrong item.

The owner also asked what predictable barriers to import the cards were missing. Claude read the WHO *Guidelines for medicine donations* (revised 2010) to answer. It is the same file as the verified shelf-life rule.

## Options

Each finding was put to the owner with options and a recommendation; REV-012 lists them.

## Decision

All as Claude recommended (owner, 2026-11-17).

**Rule cards**
- A destination card's id is `destination-<country>`, in lower case, with hyphens for spaces. A card for every destination has no country, and its id does not start with `destination-`.
- All items on a card share one prefix.
- The forbidden-claims list moves to core (`claims.ts`), and core refuses a card whose item or document makes a forbidden claim. One list now covers everything the apps print; the AI steps use the same list.
- A card says whether it is synthetic:
  - every item on a synthetic card carries the synthetic label;
  - every item on any other placeholder card carries a label.

  The checklist heading adds the synthetic label only on synthetic cards.
- **New card `who-donation-guidelines`**, for every destination.
  - It has nine items restating WHO articles 1, 2, 4, 5, 6, 7, 9, 10, 11 and 12, and section 4. Each item cites its article.
  - It stays a placeholder, each item labelled "not yet verified by the owner", until the owner verifies it against the PDF.
  - Two phrases are reworded so the card makes no forbidden claim: "approved for use" becomes "authorised for use", and "port clearance" becomes "port and customs storage and handling".
- The four synthetic country cards stay as written.
- Country rules from each national regulator, and controlled-medicine import authorisation, are recorded under OD-003 for after the hackathon.

**Covering letter**
- More words count as stating a requirement: has to, have to, compulsory, necessary, oblige (any form), condition, register (any form).
- A sentence that names a document must cite a card item. That covers certificate, declaration, invoice, permit, packing list, or any document named on the trip's cards.
- Code adds the trip's medicine list under the letter, before the checklists. A letter that names a medicine from the catalogue (DAT-101) that is not in the shipment is refused. A name that is part of a shipped medicine's name is fine.
- A sentence that cites an item must share a meaningful word with that item's requirement or document. Common words do not count: medicine, donated, prepared, shipping and the like.
- The letter's input carries all the trip's cards (the WHO card, then the country's), and citations may be to any of them.

## Consequences

- Stricter checks mean more letters fall back to the blank template, which carries the same medicine list and checklists.
- A medicine name that is also an everyday word (for example "water") refuses a letter that uses the word. That is the safe direction.
- The checks still read words, not meaning: a person reviews every draft, with the lists built by code under it.
