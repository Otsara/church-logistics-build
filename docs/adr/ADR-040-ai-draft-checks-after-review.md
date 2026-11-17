---
id: ADR-040
title: AI drafts and explanations after the owner's review — claims in any spelling, recorded reviews and edits, one item per sentence, no relative dates, invented people or promises
status: Accepted
date: 2026-11-17
decided: owner, 2026-11-17
---

# ADR-040 AI drafts and explanations after the owner's review

## Context

The owner's line-by-line review of the drafts and explanations (REV-011) came after ADR-039 was built and merged. Before presenting each part, Claude fed deliberately wrong text to the checks. All of the following were accepted:

- forbidden claims spelled with hyphens or spaces, or in another form of the word;
- a second reviewer overwriting the first;
- numbers taken from inside a date;
- negated statuses;
- values swapped between two items;
- numbers in words;
- statuses and judgements the code never computed;
- relative dates;
- invented people;
- promises about the schedule.

This record adds to ADR-039, which stays in force.

## Options

Each finding was put to the owner with options and a recommendation; REV-011 lists them.

## Decision

All as Claude recommended (owner, 2026-11-17).

**Drafts (all steps)**
- **Forbidden claims in any spelling.** Every form of each word is refused, written with spaces or hyphens: approve, approves, approval, approved; airworthy, airworthiness; flightworthy, flight-worthy, flight worthy; safe to fly; cleared, clearance. "Ready to fly" and "fit to fly" (or "fit for flight") are added. "Clear" alone is an everyday word and is not refused. "Return to service" is not refused: it names a computed plan figure.
- **Reviews recorded properly.** Marking a draft reviewed is refused:
  - without a person;
  - without a valid UTC date and time (the same check as decisions, now shared in core as `isUtcDateTime`);
  - for a draft already marked reviewed, so the first reviewer is kept.
- **Who may review.** Any person on the team may mark a draft reviewed; reviewing is not a sign-off (SYS-010). The owner expects only people in the sign-off roles to use the apps.
- **Edits.** Any edit by a person puts the label back and needs a new review. The edit is recorded in the audit log, with the text before and after. A person's own edit is not checked for forbidden words: the text is theirs.

**Explanations (AIC-103, AIC-303)**
- **Figures taken whole.** Codes, dates and numbers must appear whole in a value. 19 is not taken from 2026-11-19, and SWP-1155 is not taken from SWP-1155-6. A number standing alone in a text value counts, such as 400 in "USD 400".
- **No negated status.** "Not", "no", "never" or "isn't" before a status word is refused, unless the whole phrase is the status ("no go", "not proposed", "not ready").
- **One item per sentence.** Each sentence names exactly one ref. It may not mention another item's name, or a ref written without digits (such as OPT-B). The prompt says so.
- **Numbers in digits.** Numbers written in words (one to twenty, the tens, hundred, thousand, million, dozen, half, quarter, twice, double, triple) are refused.
- **Statuses and judgements.**
  - The apps' status words expired, eligible, ineligible, ready, not ready, missing and unknown are checked against the item's status. A missing document's status is "missing".
  - Judgements are refused: safe, safest, best, worst, recommend (any form), should, must.

**Messages (AIC-302)**
- **No relative dates.** today, tonight, tomorrow, yesterday, soon, shortly, next/this/last week, weekend, month or year, and weekday names are refused. The prompt says to write dates exactly as given.
- **No invented people.** A title followed by a capitalised name is refused, such as "Pastor Juan" or "Dr. Okafor". The prompt says to refer to people only by the ids given.
- **Dates in words.** These are refused through the whole-figures rule. The prompt asks for dates as given.
- **No promises.** confirmed, guarantee (any form), definitely and promise (any form) are refused. The prompt says to describe dates as expected or estimated, and never to say flights will resume, only when the disruption is expected to end.

## Consequences

- The checks are stricter, so more AI answers fall back to the computed list or the blank template. They still check words, not meaning: the computed list stays beside every explanation, and a person reviews every draft.
- The number-word rule applies to explanations only. The relative-date, title and promise rules apply to messages only, as decided. Applying them to both is a question for the owner.
- `drafts.ts`:
  - `markReviewed` now returns `ok` with the draft and entry, or a reason;
  - `editDraft` is new.
- `isUtcDateTime` moves from the SpareWing decision code to `dates.ts` in core, unchanged.
