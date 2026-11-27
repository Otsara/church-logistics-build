---
id: ADR-060
title: The golden AI tests check what the code relies on, as the confirmation run does
status: Accepted
date: 2026-11-27
decided: owner, 2026-11-27
---

# ADR-060 The golden AI tests check what the code relies on

## Context

The golden AI answers were recorded through the deployed gateway on 2026-11-27: 15 donor lists and 15 parts emails from the development data (OD-062). TC-137 and TC-311 as written required an exact match on every expected line, including the review flag and the name's first word. 10 donor lists and 1 parts email failed that match, and no wrong value was accepted.

Of the 62 expected donor lines:
- 22 were read exactly;
- 15 were flagged as expected;
- 3 were flagged where no flag was expected;
- 3 had a name starting differently;
- 17 were left unread, 16 of them because the model copied the prompt's line numbers ("2: …") into its copy of the line, which the check then could not match.

## Options

- (a) The confirmation-run rule (ADR-059): fail on a wrong quantity, lot number or expiry (for parts, part number or quantity) in an accepted line, or a line accepted unflagged that must need review; report the rest.
- (b) Keep the exact match and list the failures as known issues.
- (c) Also fix the line-number matching now, a safety-critical change on the deadline day.

## Decision

Option (a) (owner, 2026-11-27). The recorded answers are kept exactly as the model gave them.

## Consequences

- The tests also require some lines to be read exactly, so a reader that sent every line to a person would not pass.
- A model that copies the line number leaves those lines unread, and the person enters them by hand. It is listed as a known issue in `docs/SUBMISSION.md`. Matching a copy that starts with its own line number is for after the submission.
