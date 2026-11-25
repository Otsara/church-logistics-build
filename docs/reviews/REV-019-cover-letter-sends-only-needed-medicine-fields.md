---
id: REV-019
title: Line-by-line review of the cover letter sending the AI only the medicine fields it needs
date: 2026-11-23
---

# REV-019 Line-by-line review of the cover letter sending the AI only the medicine fields it needs

## Reviewed

The safety-critical change in the pull request "Shared: release-gate placeholders replaced by real tests; cover letter sends the AI only the medicine fields it needs" (Otsara/church-logistics-build#52, merged 2026-11-23), walked through in the build conversation (AIC-102; TC-017; SEC-005):

- `packages/ai/src/steps/cover-letter.ts`, `factsOf`:
  - Before: `medicines: input.medicines`, so each medicine object went to the AI whole, including any extra fields a screen added.
  - After: each medicine is mapped to `{ genericName, strength, quantity }`, the three fields the letter and its checks use.

Evidence at review:
- the new TC-017 test failed before the change, because a medicine carrying a donor name reached the prompt;
- all 10 cover-letter tests passing, and 100% branch coverage;
- Stryker 95.60% on `cover-letter.ts` (95.56% before), with both new mutants killed;
- CI passing.

## Findings and decisions

| # | Finding | Decision |
|---|---|---|
| 1 | `checkCoverLetter` still reads the full input, and the medicine list after the letter is still built by code from it. | Accepted: only what reaches the AI changes. |

The owner confirmed the line-by-line review in the conversation on 2026-11-23 ("REV-018 and 019 reviewed").

## Outcome

No change needed. The screens also send only these three fields (Lovable commit 97a4ed1, `letterInput`).
