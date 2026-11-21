---
id: REV-016
title: Line-by-line review of team stock remains and the covering-letter template, with the sign-off wording that followed
date: 2026-11-20
---

# REV-016 Line-by-line review of team stock remains and the covering-letter template

## Reviewed

The code from the pull request "Prepped: team stock remains and the covering-letter template come from core" (#44, merged as aa704d0), walked through in the build conversation on 2026-11-20:

- `packages/core/src/prepped/packing.ts`: the new `HeldLot` type; `stockConflicts` and `availableStock` take any lot with an id and a quantity, with their logic unchanged (SYS-121, TC-142).
- `packages/ai/src/steps/cover-letter.ts`: the lists moved unchanged into a private `listsOf`; the new `coverLetterTemplate`; `checkCoverLetter` uses both (AIC-102, TC-143).
- `packages/core/src/index.ts`: the `HeldLot` export.

Evidence at review: TC-142 failed type-checking and TC-143 failed at run time before the code; 285 tests passed with 100% coverage; Stryker on the two files scored 96.29%.

## Findings and decisions

| # | Finding | Decision |
|---|---|---|
| 1 | Once a signed-off list is changed, which amounts hold the stock on P4: the amounts as signed, or the current ones? Core takes whatever lines it is given. | (a): the amounts as signed keep their hold until the list is signed off again; an unsigned edit neither frees stock nor takes more (owner, 2026-11-20). Lovable's swap already passes the signed lines. |
| 2 | After the swap to the real rules, the packing list status read "Signed off by p-castellan at 2026-11-17T16:30:00Z": a code and a raw time, where DOC-045 says "Signed off by [name] on [date]". | The rules' status says only "Signed off", or "Changed since sign-off: the lead clinician signs it off again"; the screen writes the name and date from the sign-off record (owner, 2026-11-20). |
| 3 | `readJsonText` was not exported from core's main entry, so the screens had to import it from inside the rules folder. | Export it from `packages/core/src/index.ts`. |

The owner accepted the recommendations on 2026-11-20 ("accept recommendations for signed-off").

## Outcome

- Findings 2 and 3 are built in the pull request "Prepped: sign-off status without a person or time, and the rule-file reader exported" (SYS-010; TC-009, TC-328): the tests were changed first and failed, then the code.
- Finding 1 needs no core change: the screens pass the signed-off lines.
- The owner reviewed the code of #47 line by line (the two status messages in `sign-off.ts` and the `readJsonText` export) and merged it, confirming in the build conversation on 2026-11-21 (owner, 2026-11-21). CI passed in full on it, including mutation testing (`sign-off.ts` 100%).
