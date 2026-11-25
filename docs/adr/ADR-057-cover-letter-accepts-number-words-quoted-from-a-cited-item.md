---
id: ADR-057
title: The covering-letter check accepts a number word quoted from the rule card item the sentence cites
status: Accepted
date: 2026-11-25
decided: owner, 2026-11-25
---

# ADR-057 Number words quoted from a cited rule card item

## Context

The wording rules make every AI sentence write numbers in digits, because the figures check cannot read numbers in words (owner, 2026-11-17; ADR-040). When filming the demo on 2026-11-24, the check refused 3 of 4 covering-letter drafts. In each, the model had restated WHO-05 in its own words, "at least one year". The rule card writes the number in words, so a faithful citation broke the rule, and a person trying the button would usually get the blank template.

## Options

- (a) Accept a number word only when the sentence cites an item whose requirement writes that word with the same word before or after it ("one year", "least one"); any other number word is still refused.
- (b) Accept any number word that appears anywhere in a cited item.
- (c) Keep the rule, and change the prompt to ask for digits even when quoting.

## Decision

Option (a) (owner, 2026-11-25). It is narrower than (b): "We send one box" citing WHO-05 is still refused, because "one box" is not in the item. Only the item's requirement counts, not its document name or its note.

## Consequences

- `wordingProblems` takes the texts a sentence may quote. Only the covering letter passes them; explanations and messages pass none, so their rule is unchanged.
- A number word quoted this way is not checked as a figure. It is safe only because it repeats the cited item's own words, and the item is itself checked against its source (REV-013).
- Safety-critical AI check code (ARC-008): tested by TC-033 with 100% branch coverage, and a mutation score of 88% on the changed lines. The six surviving mutants are equivalent: they only add text that never matches a requirement, such as "undefined one" or "Stryker was here", or change how repeated punctuation becomes spaces. The change needs the owner's line-by-line review (ADR-006).
