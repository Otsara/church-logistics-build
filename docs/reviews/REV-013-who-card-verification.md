---
id: REV-013
title: Owner's verification of the WHO donation guidelines card against the source
date: 2026-11-17
---

# REV-013 Owner's verification of the WHO donation guidelines card against the source

## Reviewed

The card `rules/prepped/who-donation-guidelines.json` (SYS-120, DAT-103), item by item, against the WHO *Guidelines for medicine donations*, revised 2010. The source was the PDF linked on the publication page, with SHA-256 cb41c017c38714425150f3e82f7d12b72667ae3c5192207b996723dc088cb89b, the same file as the shelf-life rule. The check took place in the build conversation on 2026-11-17.

For each item, Claude quoted the guideline, showed the card's wording, and listed every difference, including wording Claude had added that the source does not have.

## Findings and decisions

| Item | Finding | Decision |
|---|---|---|
| WHO-01 (arts 1, 10) | "Written" consent was Claude's addition. "Relevant to the disease pattern" was left out. The acute-emergency exception was not mentioned. | (b): "Recipient's prior consent"; add the disease pattern; the exception as a note. |
| WHO-02 (art 2) | The WHO-model-list fallback and "or equivalent" were left out, and the outbreak exception was not mentioned. "Approved" was reworded as "authorised" on purpose. | (b): add both; the exception as a note. |
| WHO-03 (art 4) | "Authorised for sale in the country of origin" and GMP were left out. "Quality documents" was Claude's own name for the document. The emergency exception was not mentioned. | (b): add both; the guideline's name for the document; the exception as a note. |
| WHO-04 (art 5) | Faithful; it drops only "to a pharmacy or elsewhere". | (a): unchanged. |
| WHO-05 (art 6) | Quantities matching use before expiry were left out. The exceptions are not applied in this build (OD-053). | (a): add the quantity requirement; note the 365-day check and the exceptions not applied. |
| WHO-06 (art 7) | "INN" was shortened, and the injection route was left out. The owner noted that injections are out of scope in this build. | (a): restore INN; leave the injection line out, explained in the card's notes. |
| WHO-07 (art 9) | The kits exception was left out. No document is named, so the packing list is not listed twice. | (a): add the kits exception; the document stays on the country cards. |
| WHO-08 (art 11) | Faithful; the patented-medicine exception was not mentioned. WHO names no document. | (a): the exception as a note. The owner noted that brigades will rarely carry patented medicines. |
| WHO-09 (art 12, section 4) | The donor-pays default was lost, costs and responsibilities were mixed, the lists were incomplete, and "before shipping" was Claude's own timing. | (b): split into WHO-09 for costs and WHO-10 for responsibilities, each faithful. |

## Outcome

- Built with tests on the branch `prepped/who-card-verified`, and recorded in ADR-045. The card's status is verified by the owner, 2026-11-17, for the prototype.
- `destination-card.ts` keeps full coverage and a mutation score of 100% (ADR-006).
- Still needed before real-world use: external review by a pharmacist or clinician (OD-002), and each country's own rules (OD-003).
