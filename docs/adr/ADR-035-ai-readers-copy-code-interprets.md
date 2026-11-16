---
id: ADR-035
title: AI readers copy text, code interprets it, and a person confirms every line
status: Accepted
date: 2026-11-16
decided: owner, 2026-11-16
---

# ADR-035 AI readers copy text, code interprets it, and a person confirms every line

## Context

The donor-list reader (AIC-101) and the parts-email reader (AIC-301) turn pasted text into lots and stock parts. Wrong lot numbers, dates or serviceability would feed straight into eligibility and part candidates.

## Options and decision

All four as Claude recommended (owner, 2026-11-16):

1. **The AI copies, the code interprets.** The AI returns each value exactly as written in the line, or null. Code keeps a value only if it is written in that line, ignoring letter case and extra spaces, and reads the expiry with the same label reader as eligibility (`readExpiry`). The AI never decides a date, a lot number or an amount.
2. **A person confirms every line** read by AI before it becomes a lot or a stock part. The confidence is shown, with no cut-off invented.
3. **Parts: part number, quantity and description only.** The base and whether a part is serviceable are entered by a person, so the AI can never make a part serviceable.
4. **Recording the golden answers:** the owner chose to record with the owner's key from the build environment. The environment does not accept a key for Anthropic's own address, so the recording method is open (OD-062).

## Consequences

- `packages/ai/src/steps/` (`lines.ts`, `donor-list.ts`, `parts-email.ts`), held to full coverage and mutation testing as part of ARC-008.
- New SYS-119 and SYS-313, TC-137; RC-002 extended.
- Golden examples, 15 per step from the development partition, in `packages/ai/golden/`; `make-golden.ts` builds them and `record-golden.ts` records them.
- One limit of the check: a quantity is kept if that number is written anywhere in the line, so a strength figure copied as a quantity would pass; the person's confirmation is the control for that.
