---
id: ADR-013
title: Counting shelf life and reading month-only expiry
status: Accepted
date: 2026-11-12
decided: owner, 2026-11-12
---

# ADR-013 Counting shelf life and reading month-only expiry

## Context

The minimum shelf life at arrival (SYS-102) is safety-critical: a wrong count can pack medicine that expires too soon (HAZ-101). The rule says 12 months, which can mean calendar months or a number of days, and many donated packs print only a month and year. OD-009 and OD-043.

## Options

Counting: calendar months, with exact passing or failing; or a fixed 365 days.
Month-only expiry: first day of the month (most cautious); last day of the month; or require a full date.

## Decision

Shelf life is counted as 365 days from the arrival date, and exactly 365 days passes (owner, 2026-11-12). A month-only expiry is read as the last day of that month (owner, 2026-11-12). The more cautious options were offered and not chosen.

## Consequences

- SYS-102, TC-101, TC-128, TC-129.
- Across a leap day, 365 days ends one calendar day before the same date a year later.
- A month-only expiry can be counted as in date for up to the whole of its last month; the screen shows that the date was read from a month-only label.
- The minimum value itself stays a placeholder until OD-002.
