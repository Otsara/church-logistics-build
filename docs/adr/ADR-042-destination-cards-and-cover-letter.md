---
id: ADR-042
title: Destination rule cards as synthetic placeholders, a checklist built by code, and a covering letter whose requirements cite the card
status: Proposed
date: 2026-11-17
---

# ADR-042 Destination rule cards as synthetic placeholders, a checklist built by code, and a covering letter whose requirements cite the card

## Context

The owner chose the shape of the covering letter (AIC-102) and the rule cards on 2026-11-16 (ADR-039):

- 1 (a): code builds the checklist word for word from the rule card, with ids, and the AI writes only the covering letter. Any sentence stating a requirement must cite a card item, or the draft is not accepted.
- 2 (a): synthetic placeholder cards for Honduras, Ethiopia, Nigeria and the Philippines, every item labelled "Synthetic example for the demo: not a real import rule". Real cards come after the hackathon (OD-003).

Building them took design choices that the owner has not yet reviewed. They are recorded here and proposed for the owner's line-by-line review.

## Options and choices

1. **Card format.** A Prepped rule file, `rules/prepped/destination-<country>.json`, in the usual envelope (ARC-004). The data holds the country and a list of items, each with:
   - an id such as HN-01;
   - the requirement in one sentence;
   - the document it asks for, or none;
   - a label.
2. **Synthetic content.** Each card has four short, generic items: an import permit, a letter (a donation letter, ministry letter or donation certificate), a packing list, and one handling item (no controlled medicines, expiry on the pack, or labels in English). No numbers, limits or legal references are invented. The source link is a placeholder at example.org, and the notes say the card is synthetic.
3. **Reading a card.** A card is read from its text (ADR-034) and refused if any of these is true:
   - it is not a Prepped file;
   - an item id is not like HN-01, or appears twice;
   - a text field is blank;
   - on a placeholder card, any item lacks the synthetic label.

   A verified card's items need no label.
4. **The checklist.**
   - A heading names the card and country, and adds the synthetic label for a placeholder card.
   - Each item follows word for word with its id, then its document as "prepared" or "missing", then its label.
   - A missing import permit is therefore listed in the draft paperwork (TC-105).
5. **Which sentences state a requirement.** A sentence must cite a card item if it uses any of these words: must, shall, require (any form), mandatory, obligatory, need(s) to, needed, permit, licence or license, regulation (any form), law, prohibited, forbidden, restricted, allowed, import (any form) or customs. A cited id that is not on the card is refused.
6. **Other checks on the letter.** These are the same as for explanations and messages:
   - no forbidden claims (ADR-040);
   - the wording rules (ADR-041);
   - codes, dates and numbers only from the trip, the card and the medicines.
7. **Fallback.** When the letter is not accepted, the blank template is shown: a place for the team's letter, then the same checklist. An accepted letter is a draft, followed by the checklist, labelled until reviewed (SYS-005).

## Consequences

- `packages/core/src/prepped/destination-card.ts` reads the cards and builds the checklist and the list of required documents. It is held to full coverage and mutation testing (ADR-006). `packages/ai/src/steps/cover-letter.ts` is AIC-102.
- The requirement-word check reads words, not meaning: a letter can still restate an item wrongly while citing it. The checklist, built by code, sits under every letter, and a person reviews every draft.
- The cards are not real import rules. OD-003 stays open and blocks real-world use.
