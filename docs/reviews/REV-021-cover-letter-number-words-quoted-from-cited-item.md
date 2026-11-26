---
id: REV-021
title: Line-by-line review of the covering-letter check accepting a number word quoted from the cited rule item
date: 2026-11-26
---

# REV-021 Line-by-line review of the covering-letter check accepting a number word quoted from the cited rule item

## Reviewed

The safety-critical change in the pull request "AI wrapper: covering-letter check accepts a number word quoted from the cited rule item, such as 'at least one year'" (Otsara/church-logistics-build#58, merged 2026-11-25), shown line by line in the pull request and the build conversation (AIC-102, TC-033; ADR-057):

- `packages/ai/src/steps/wording.ts`:
  - `phrasesAround` takes the word just before and just after a number word;
  - `numberWordsIn` drops a number word only when one of those two-word phrases appears in a quoted text;
  - `wordingProblems` gains the `quoted` texts, empty by default, so explanations and messages are unchanged.
- `packages/ai/src/steps/cover-letter.ts`: a sentence quotes only the requirements of the card items it cites.

Evidence at review:
- both TC-033 tests failed before the change, then passed;
- 100% branch coverage on both files;
- Stryker 88% on the changed lines (44 killed, 6 survived);
- CI passing, including the mutation job.

The six survivors are equivalent: they only add text that never matches a requirement ("undefined one", "Stryker was here"), or change how repeated punctuation becomes spaces (ADR-057).

## Findings and decisions

None: the owner reviewed the change line by line and found nothing to change (owner, 2026-11-26).

## Outcome

No change needed. The rules folder carrying the change is Otsara/prepped#6.
