---
id: ADR-014
title: Reading the FDA drug directory
status: Accepted
date: 2026-11-12
decided: owner, 2026-11-12
---

# ADR-014 Reading the FDA drug directory

## Context

The real openFDA NDC export of 2026-11-11 was examined on 2026-11-12. It omits the DEA schedule for products that are not scheduled, lists almost no ENTERAL products, and carries an established pharmacologic class on about half its products. The importer (ARC-015) is safety-critical because controlled status and route scope feed eligibility. OD-022, OD-034, OD-042, OD-044 and OD-045.

## Options

- Missing schedule: read as not controlled in the US, with the basis shown; or keep "unknown" and have a person confirm each product.
- Feeding tube: a clinician marks oral items as suitable; or drop the category.
- Class source: FDA pharmacologic class; WHO list sections; WHO ATC.

## Decision

All by the owner on 2026-11-12: a missing DEA schedule reads as not controlled in the US, with the basis and source on the entry, and the pharmacist confirms the destination's rules; feeding tube is dropped as a route category; the FDA established pharmacologic class (EPC) is the class source; the route mapping in `rules/prepped/route-scope.json` is verified; the snapshot is the export of 2026-11-11, in-scope routes only, frozen until the submission; WHO items without an FDA entry stay listed for entry by hand.

## Consequences

- SYS-103, SYS-108, SYS-109, ARC-015, DAT-101, DAT-102, SOUP-101, TC-123, TC-124.
- Amends the route lists in ADR-009 and ADR-010: feeding tube is no longer in scope.
- The importer no longer has an "unknown" controlled status; US scheduling does not cover the destination's rules, which the pharmacist confirms.
- A product without an EPC class gets no comparable alternatives, and the screen says so.
