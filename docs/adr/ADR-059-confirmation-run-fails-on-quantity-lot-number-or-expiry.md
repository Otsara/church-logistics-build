---
id: ADR-059
title: In the confirmation run, an AI reading fails only on a quantity, lot number or expiry other than the label's
status: Accepted
date: 2026-11-26
decided: owner, 2026-11-26
---

# ADR-059 What counts as a failed AI reading in the confirmation run

## Context

The confirmation run (DOC-070 §5, TC-034) compares the AI's checked reading of each held-back donor line with the label it was written from. The rehearsal on 2 development scenarios on 2026-11-26 (80 lines) found:

- no difference in quantity, lot number or expiry;
- 45 differences in medicine name and strength, mostly a different split of the same text: "37.5 mg/1" read where the synthetic label writes "METOPROLOL TARTRATE 37.5 mg/1", or the ingredient where the label has a brand name.

Code uses the quantity, lot number and expiry without a person's choice: for counting, tracing and eligibility. The name, strength and form only help a person choose the catalogue entry, which every line needs before it becomes stock (owner, 2026-11-19).

## Options

- (a) A quantity, lot number or expiry other than the label's fails the run; name, strength and form differences are counted and reported.
- (b) Any difference in any field fails the run.
- (c) No AI reading in the confirmation run.

## Decision

Option (a) (owner, 2026-11-26).

## Consequences

- `compareReadings` returns silent errors for those three fields and differences for name, strength and form; the runner fails on any silent error.
- The run reports how many lines were exact, flagged, unread or sent to manual entry, with the differences, so they can be judged.
- A long donor list goes to manual entry: the runner sends 8 lines per call, and the limit is listed in the submission's known issues.
