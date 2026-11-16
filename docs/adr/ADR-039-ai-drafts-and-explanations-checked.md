---
id: ADR-039
title: AI drafts and explanations are checked against what code computed, labelled until reviewed, and never claim an approval
status: Accepted
date: 2026-11-16
decided: owner, 2026-11-16
---

# ADR-039 AI drafts and explanations are checked against what code computed, labelled until reviewed, and never claim an approval

## Context

Iteration 2 adds the four AI steps that write prose: the cover letter and checklist (AIC-102), the readiness gaps explanation (AIC-103), the message to a base or community (AIC-302) and the plan explanation (AIC-303). Prose is harder to check than the readers' copies (ADR-035): a fluent sentence can add a number, an item, a regulation or an approval that code never computed. The owner chose how each is bounded.

## Options

1. Cover letter: (a) code builds the checklist from the rule card, and the AI writes only the covering letter, every requirement sentence citing a card item id; (b) the AI writes both, checked afterwards.
2. Rule cards for the demo: (a) synthetic placeholder cards for Honduras, Ethiopia, Nigeria and the Philippines, every item labelled "Synthetic example for the demo: not a real import rule"; (b) real cards before submission.
3. Explanations: (a) the AI writes them, every sentence names the computed items it is about, and any id, number or status not in those items rejects the explanation; (b) code writes them from templates, without AI.

## Decision

1 (a), 2 (a) and 3 (a), as Claude recommended (owner, 2026-11-16). With them, the shared rules for every AI draft and explanation:

- **Forbidden claims.** Text containing "approved", "airworthy", "flightworthy", "safe to fly" or "cleared", in any letter case, as whole words, is rejected (SYS-309, TC-009). The prompts list the same words, from the same list in code.
- **Draft label.** Every accepted draft shows "Draft, human review required" until a person marks it reviewed; marking it records the person's id and the time in the audit log (SYS-005, TC-008).
- **Never sent.** A SpareWing message is a draft that a person reviews and sends; SpareWing never sends it (SYS-310, TC-310).
- **Grounding (explanations).** Code turns the computed results into facts, each with a ref (the item, document or option id). The AI answers in sentences, each with the refs it is about. A sentence is rejected if it names no ref, names a ref not in the results, or mentions a code (a word with digits, such as F1 or SWP-1155-6), a date or a number that is not written among the values of the facts it names, or a status word that is not their status. An amount written before "covered" or "short" ("75% covered") is a figure, checked as a number, not a status. Codes and numbers must match whole: 2.5 is not 2.55, and letter case does not matter. On any problem, the computed list is shown instead (TC-010).
- **Grounding (message).** The message may mention only codes, dates and numbers given to the step in the disruption and chosen candidate; otherwise it is not accepted and the blank template is shown.

## Consequences

- `packages/ai/src/steps/drafts.ts` (label, review, forbidden claims), `grounding.ts` (codes, dates and numbers), `explain.ts` (AIC-103, AIC-303) and `message.ts` (AIC-302) are part of the guard on AI output (ARC-008) and held to full coverage and mutation testing (ADR-006).
- Words alone are checked, not meaning: an explanation can still be misleading while using only computed values. The computed list stays on screen beside it, and the readers are the people who decide.
- "Cleared" is refused even where it would be harmless ("cleared customs"); the cover letter (AIC-102) uses the same rule, so its prompt says not to use the word.
- Golden examples for the new steps are recorded through the gateway in iteration 3, as for the readers (OD-062).
- The synthetic rule cards and the cover letter follow in the next pull request.
