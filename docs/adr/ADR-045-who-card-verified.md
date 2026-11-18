---
id: ADR-045
title: The WHO donation guidelines card is verified by the owner, with exceptions as notes and costs split from responsibilities
status: Accepted
date: 2026-11-17
decided: owner, 2026-11-17
---

# ADR-045 The WHO donation guidelines card is verified by the owner, with exceptions as notes and costs split from responsibilities

## Context

The WHO donation guidelines card (ADR-044) was a placeholder until the owner checked it against the source. The owner went through it item by item in the build conversation on 2026-11-17 (REV-013). For each item, Claude showed:

- the guideline's exact words, from the PDF whose SHA-256 matches the shelf-life rule's;
- the card's wording;
- every difference.

## Options

Each item was put to the owner with options and a recommendation. REV-013 lists them.

## Decision

As REV-013 records (owner, 2026-11-17).

**New field: notes.** A rule card item may carry a note, printed in the checklist after the document. Notes carry the guideline's exceptions in its own words:

- prior consent (article 1);
- outbreaks (article 2);
- the WHO Certification Scheme in acute emergencies (article 4);
- patented medicines (article 11).

The shelf-life item's note says Prepped checks 365 days from arrival (ADR-013), and that the article 6 exceptions are not applied in this build (OD-053). A note that makes a forbidden claim refuses the card, as an item does (ADR-044).

**Changes to the items:**

- **WHO-01.** Adds "relevant to the disease pattern in the recipient country". The document is "Recipient's prior consent": the guideline does not ask for it in writing.
- **WHO-02.** Adds the WHO-model-list fallback and "or equivalent". "Approved" stays reworded as "authorised".
- **WHO-03.** Adds "authorised for sale in the country of origin" and "made to good manufacturing practice (GMP)". The document takes the guideline's name, "Documents proving compliance with quality standards" (section 4).
- **WHO-04.** Unchanged.
- **WHO-05.** Adds the requirement that quantities match what can be used before expiry.
- **WHO-06.** Restores "International Nonproprietary Name (INN) or generic name". The injection line is left out, because injections are out of scope (ADR-010); the card's notes say so.
- **WHO-07.** Adds the exception for kits with predetermined contents. The packing-list document stays on the country cards only, so it is listed once.
- **WHO-08.** Adds the patented-medicine note. No document: the guideline names none.
- **WHO-09 (costs).** Now states the default, that the donor pays, unless agreed otherwise in advance (article 12).
- **WHO-10 (new, responsibilities).** The full list of roles, agreed in writing and signed by donor and recipient before the medicines arrive (section 4). Its document is "Signed agreement on roles and responsibilities".

**Status.** The card is verified by the owner as of 2026-11-17, for the prototype. As with the shelf-life rule, external review by a pharmacist or clinician is still needed before real-world use (OD-002), and each country's own rules are still open (OD-003).

## Consequences

- The checklist for every trip now opens with ten sourced items and their notes, then the country card's items.
- "Clearance" is still never printed. The guideline's "customs clearance" reads "getting the shipment through customs".
