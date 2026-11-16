---
id: ADR-037
title: A donor line with no dosage form needs review, and a line with more than one item is entered by hand
status: Accepted
date: 2026-11-16
decided: owner, 2026-11-16
---

# ADR-037 A donor line with no dosage form needs review, and a line with more than one item is entered by hand

## Context

The line-by-line review of the donor-list reader (REV-010 part 2) found two gaps. A line with no dosage form did not need review, though the form is needed to match the catalogue entry and its route (SYS-109). And when a line held two items, the AI's first answer was kept and the second set aside, so one item could be kept while the other dropped.

## Options

1. Missing form: leave it; or send the line to review.
2. Two items on one line: keep the first; or set every answer aside and have the line entered by hand.

## Decision

As Claude recommended (owner, 2026-11-16): a missing dosage form sends the line to review (a missing strength alone does not, since some medicines print none); a line answered more than once has every answer set aside with the reason "line N has more than one item: all answers for it set aside, enter it by hand". The second applies to both readers, since they share the line checks.

## Consequences

- `donor-list.ts` adds "no dosage form read"; `lines.ts` `matchLines` sets aside every answer for a line answered more than once and lists that line as unread.
- SYS-119 and SYS-313 updated.
