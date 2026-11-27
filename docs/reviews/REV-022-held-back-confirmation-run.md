---
id: REV-022
title: Pre-release confirmation run on the held-back third
date: 2026-11-26
---

# REV-022 Pre-release confirmation run on the held-back third

## Reviewed

The pre-release confirmation run (DOC-070 §5; DAT-002; TC-034), made with the owner present in the build conversation on 2026-11-26. It ran at the release-candidate commit 32cee1d (main, after "Synthetic data: the held-back confirmation run", Otsara/church-logistics-build#61), with no code or prompt changes during the run.

- **The package:** the owner supplied it from the owner's private storage (OD-036), as the file `prepped-sparewing-held-back-2026-11-12-v3.json`.
- **The command:** `node packages/synth/scripts/confirm-held-back.ts <package>`, then the same command with `--with-ai`.
- **The AI calls:** through the AI gateway, signed in as the recording lead account (SEC-008).

## Results

1. **Fingerprints.** The package's SHA-256 is 7fd9f4e77fe7a82f31239e2f1884be0daee2c26e8781fd39fdf455b17f7e361c, equal to the committed manifest's. All 10 Prepped and 10 SpareWing records match their fingerprints.
2. **Rule checks.** 10 Prepped scenarios, 30 trips and 1,200 lot checks, with 0 failures. Every rule held for every lot and trip:
   - an expired lot is set aside;
   - a controlled, cold-chain or short-dated lot never goes;
   - every lot that can't go has a reason;
   - Go appears only when nothing stands in the way;
   - meter values stay between 0 and 1;
   - only eligible lots count toward the floor.
3. **AI reading** (AIC-101), 400 held-back donor lines in 50 calls of 8 lines:

   | Outcome | Lines |
   | --- | --- |
   | Exact in every field | 13 |
   | Flagged by the check for a person | 18 |
   | Left unread, entered by hand | 73 |
   | Sent to manual entry after the call failed (13 calls, answers too long) | 104 |
   | Accepted with a quantity, lot number or expiry other than the label's (silent errors) | **0** |

   There were also 225 name, strength or form differences, counted across the accepted lines and left for the person's catalogue match (OD-068 a; ADR-059).

**Result: pass** (exit code 0 on both runs).

## Findings and decisions

| # | Finding | Decision |
|---|---|---|
| 1 | No value the code uses without a person's choice was ever accepted wrongly; every reading the AI got wrong or could not make went to a person. | The safety rule for AI readings holds on unseen data. |
| 2 | Reading quality on the synthetic catalogue-style lines is modest: 13 of 400 lines exact in every field, and 177 lines entered by hand (unread or after a failed call). The synthetic lines carry full ingredient names in the strength, and long multi-ingredient strengths overflow the answer limit. | Stated in the submission as a limit; the long-list limit is a known issue in `docs/SUBMISSION.md`. |
| 3 | SpareWing's records matched their fingerprints but were not run: SpareWing is not the submitted product (D1; ADR-054). | None needed. |

The owner was present for the run in the conversation (owner, 2026-11-26).

## Afterwards

Claude deleted its copy of the package after the run. The owner keeps the original (OD-036). The set was opened once, for this release candidate (DAT-002).
