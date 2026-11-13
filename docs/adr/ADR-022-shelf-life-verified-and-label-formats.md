---
id: ADR-022
title: Shelf-life source verified, WHO's exceptions not applied, and expiries read in every unambiguous label format
status: Accepted
date: 2026-11-13
decided: owner, 2026-11-13
---

# ADR-022 Shelf-life source verified, WHO's exceptions not applied, and expiries read in every unambiguous label format

## Context

The 365-day minimum (SYS-102, ADR-013) needed a rule file with a checked source. Claude read WHO, *Guidelines for medicine donations*, revised 2010, Article 6, on 2026-11-12: "After arrival in the recipient country all donated medicines should have a remaining shelf-life of at least one year." The same article allows two exceptions: direct donations to a specific health facility, and medicines with a total shelf life under two years (at least one third, and at least six months, remaining). Separately, part 1 of the owner's line-by-line review (REV-003) found that the expiry reader accepted only YYYY-MM-DD and MM/YYYY, while labels print many other formats.

## Options

- Shelf-life file: leave as placeholder until external review; or the owner verifies it for the prototype (OD-006) and external review follows before real-world use (OD-002).
- WHO's exceptions (OD-053): (a) apply neither; (b) apply the short-shelf-life exception when a manufacture date is entered; (c) let the clinician override for a direct donation.
- Label formats: read only the two formats; read every unambiguous format; or also guess ambiguous ones (two-digit years, day and month that could be either way).

## Decision

All by the owner on 2026-11-13:

- The shelf-life rule file is verified by the owner against its source for the prototype; external review remains a condition of real-world use (OD-002).
- Option (a): neither WHO exception applies in this build. Six months, where used, is 183 days. Both exceptions are to be revisited in the build-out after the hackathon, beyond the MVP.
- Every unambiguous label format is read; an expiry that cannot be read needs review like a missing one (SYS-105). Ambiguous formats are never guessed: a numeric day and month where both orders make a real date needs review.
- A two-digit year written last means 20YY. Claude applies it where the year is certainly last (after a named month, or after a numeric month: 03/28). After a numeric day and month (27/12/30) it still needs review, because a year-first label (YY-MM-DD) would be read three years too late, overstating shelf life; the owner may lift this.
- Month names are read in English only for the MVP (OD-030).

## Consequences

- `rules/prepped/shelf-life.json` is `verified` (owner, 2026-11-13).
- SYS-102 and SYS-105 reworded; new TC-133 covers the formats; OD-053 closed.
- More labels are read without a person re-entering them, while nothing ambiguous is decided by the software. Labels in other languages are not read (OD-030).
