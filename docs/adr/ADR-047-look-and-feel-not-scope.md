---
id: ADR-047
title: The owner's mockups and prompts set the screens' look and feel, not their scope; meter 70/30; an "Acting as" selector in demo mode
status: Accepted
date: 2026-11-18
decided: owner, 2026-11-18
---

# ADR-047 The owner's mockups and prompts set the look and feel, not the scope

## Context

After the Prepped screen specification (DOC-045 v0.1) was merged, the owner gave:

- two design canvases: a Prepped kit manager and a SpareWing service calendar;
- a list of design sources;
- a build prompt for each app with "non-negotiable" design requirements;
- answers to OD-063 and OD-064.

The mockups and prompts show features beyond the settled requirements. For Prepped: kits, PAR levels and restock lists, recall notices, barcode scanning, a 90-day "expiring soon" window, dispatch, and reports. For SpareWing: maintenance-due calendars.

## Options

Claude asked about each feature. The owner answered for all of them at once.

## Decision

- **"Do not exceed the previously settled scope and rules for either app. The mock-ups were for illustration only"** (owner, 2026-11-18).
  - The mockups and prompts guide look and feel only.
  - None of the features listed above is added.
  - Cold-chain items stay blocked.
  - SpareWing stays disruption response, with no maintenance or inspection tracking (SYS-309).
- **The design requirements in the owner's prompts apply to both apps, as written** (DOC-045, section 3.2):
  - NHS principles and plain language;
  - FAA and NASA display human factors: at least 3:1 contrast, ideally 7:1; colour never alone; no pure blue for fine detail; large targets;
  - a professional utility look with a muted sage palette;
  - fully responsive;
  - strong offline and sync indicators.

  Where WCAG 2.2 AA is stricter (4.5:1 for normal text), it applies.
- **The owner's sources are considered, not copied**, and no proprietary design is recreated.
- **OD-063:** the readiness meter keeps coverage 70% and documents 30%.
- **OD-064 (a):** demo mode has a selector "Acting as: [synthetic person, role]", and the audit log records that person.

## Consequences

- DOC-045 v0.2 adds section 3: look and feel, with a palette taken from the mockups and its contrast checked, and status shapes and patterns.
- The Lovable plan-mode message opens with the owner's prompt. Its design requirements are kept word for word, and its description of the app is replaced by DOC-045's scope.
- The SpareWing calendar canvas will inform SpareWing's screens only within its disruption scope, when SpareWing is specified.
