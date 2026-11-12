---
id: ADR-017
title: Prepped merging, missing documents and priority weights
status: Accepted
date: 2026-11-12
decided: owner, 2026-11-12
---

# ADR-017 Prepped merging, missing documents and priority weights

## Context

Three Prepped rules feed the safety-critical readiness meter and lot list: how donor lines merge (OD-011, HAZ-108), how missing import documents appear in drafts (OD-012, HAZ-106), and how priorities weigh in coverage (OD-040, HAZ-107).

## Options

- Merge: when all details match; also only for the same donor; never.
- Missing documents: core lists them in both drafts; a separate checklist only.
- Weights: 3, 2, 1; 5, 2, 1; priority 1 only.

## Decision

All by the owner on 2026-11-12: lines merge only when lot number, generic name, strength, form and expiry all match, keeping every donor, and otherwise stay separate with a flag; core computes the missing documents and both the AI draft and the blank template show that list; priority 1 is most important, with weights 3, 2 and 1.

## Consequences

- SYS-106, SYS-107, RC-108, AIC-101, AIC-102, TC-105, TC-107, TC-127.
- The AI draft can never drop or add a missing document, because the list comes from core.
