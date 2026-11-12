---
id: ADR-016
title: Risk acceptability and what the products must never do
status: Accepted
date: 2026-11-12
decided: owner, 2026-11-12
---

# ADR-016 Risk acceptability and what the products must never do

## Context

DOC-030 had no scales or acceptability rule (OD-024), and the intended uses carried proposed limits awaiting confirmation (OD-025, OD-026).

## Options

- Scales: a simple three-by-three set confirmed by the owner; scales written by the owner; or no ratings, with every hazard controlled and checked.
- Limits: each proposed limit confirmed or not.

## Decision

The three-by-three scale (owner, 2026-11-12): severity minor, serious, critical; probability unlikely, possible, likely; a critical-severity risk is never accepted on probability alone and needs a control in code and a person's check. Prepped never calculates a dose, never advises on a specific patient, and never marks a packing list final without a pharmacist or clinician. SpareWing never decides that two parts are interchangeable, never judges a pilot fit to fly, and never sends a message itself (owner, 2026-11-12).

## Consequences

- DOC-030 §1, IU-102, IU-302, SYS-310.
- Each hazard still needs a rating, proposed by Claude and confirmed by the owner (OD-047).
- "Never states two medicines are equivalent" remains required by ADR-003.
