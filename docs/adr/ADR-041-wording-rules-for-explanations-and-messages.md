---
id: ADR-041
title: The wording rules apply to AI explanations and messages alike, and a person's own edits are not checked
status: Accepted
date: 2026-11-17
decided: owner, 2026-11-17
---

# ADR-041 The wording rules apply to AI explanations and messages alike, and a person's own edits are not checked

## Context

The owner decided the wording rules during the review of the AI drafts and explanations (REV-011, ADR-040), one kind of text at a time:

- numbers written in words were refused in explanations only;
- relative dates and weekdays, a title followed by a name, and promises were refused in messages only.

ADR-040 also left a person's own edits to a draft unchecked for forbidden words. Claude asked whether each rule should cover both kinds of text, and whether edits should stay unchecked.

## Options

1. (a) Each wording rule applies to explanations and messages alike; (b) keep them as decided per kind of text.
2. (a) A person's own edits are not checked for forbidden words, because the text is theirs; (b) check them.

## Decision

1 (a) and 2 (a), as Claude recommended (owner, 2026-11-17).

- The four rules live in one module, `packages/ai/src/steps/wording.ts`, and both checks use it. The prompts share one sentence of instructions.
  - numbers in digits;
  - dates as given, with no relative dates or weekdays;
  - no named people;
  - no promises.
- A person's own edits are not checked for forbidden words. An edit puts the draft label back and needs a new review (ADR-040).

## Consequences

- An explanation that says "tomorrow", names "Pastor Juan" or says "confirmed" is now rejected. A message that writes "two parts" is now not accepted. Either falls back to the computed list or the blank template.
- `wording.ts` is part of the guard on AI output (ARC-008), held to full coverage and mutation testing (ADR-006).
