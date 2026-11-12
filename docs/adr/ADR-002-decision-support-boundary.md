---
id: ADR-002
title: Decision-support boundary and human authority
status: Accepted
date: 2026-11-10
decided: owner, 2026-11-10
---

# ADR-002 Decision-support boundary and human authority

## Context

Both products work in fields where a wrong decision can harm patients, crews or communities. The owner wants SpareWing to propose the best solution and engage the director, pilot or mechanic to review and verify, without ever approving a schedule change or confirming flightworthiness; and Prepped's final authority is a pharmacist or clinician (owner, 2026-11-10).

## Options

1. Advisory only: show data, never rank or propose.
2. Decision support: propose, rank and explain; a qualified person decides and records the decision.
3. Automation: the software decides within set limits.

## Decision

Option 2 (owner, 2026-11-10). The products propose, rank and explain. Every output is a suggestion or draft until the person with authority signs it off in the app: the pharmacist or clinician for Prepped; the flight base director, mechanic or pilot within their role for SpareWing. The software never states that anything is approved, safe to dispense or flightworthy.

## Consequences

- IU-001, IU-102, IU-302; SYS-003, SYS-005, SYS-010, SYS-305, SYS-308, SYS-309; RC-001, RC-305.
- Sign-off is a recorded action (audit log, SYS-008), not an implied one.
- Lint forbids the word "approved" in source strings.
