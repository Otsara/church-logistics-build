---
id: DOC-065
title: Data management plan
version: 0.2
status: Draft
effective_date:
---

# DOC-065 Data management plan

Where the data for building, testing and the demo comes from, how it is split, and how the held-back confirmation set is protected from ever influencing the build (ADR-005).

## Requirements

### DAT-001 Seeded, reproducible generation
- Product: Shared
- Traces to: UN-005, RC-002

All data is produced by `packages/synth` from a recorded seed. The same seed and generator version always give identical data.

### DAT-002 Held-back confirmation set
- Product: Shared
- Traces to: UN-005, RC-002

- One third of the generated corpus is held back (owner, 2026-11-10). The split is by record, decided by a separate seed, and recorded in a manifest.
- The held-back third is sealed: its files are listed with SHA-256 fingerprints in a committed manifest, and the files themselves are kept out of the development tree. Custody: TBD (OD-036).
- It is never used for building, debugging, prompt writing, golden examples or tuning. Tests that run during development cannot read it.
- It is opened once per release candidate, for the pre-release confirmation run (DOC-070 §5), with the owner present. The fingerprints are checked before the run; any mismatch stops the run.
- If anyone sees held-back data before the run, the set is spent: a new held-back third is generated and the event is recorded.

### DAT-003 No real personal or health data
- Product: Shared
- Traces to: UN-002, RC-004

Building and testing use synthetic data only, never real personal or health data (owner, 2026-11-10). Names are generated from neutral word lists and never resemble real congregation, patient or pilot records.

### DAT-004 Golden examples from the development partition
- Product: Shared
- Traces to: UN-005, RC-002

Golden examples for the AI steps (AIC-101 to AIC-303) are drawn only from the development two thirds.

### DAT-101 Prepped medicine catalogue
- Product: Prepped
- Traces to: UN-101, RC-101

Medicine names, dosage forms and routes come from a dated snapshot of the FDA drug directory (openFDA) (owner, 2026-11-10), for both floor items (DAT-102) and supplements. Lots, lot numbers, quantities, expiry dates, donors, trips and needs are synthetic. Controlled-substance and storage flags are taken from the directory where it records them, otherwise generated and labelled synthetic. Snapshot date, subset and confirmation of terms: TBD (OD-034). Therapeutic classes: TBD (OD-022).

### DAT-102 Essential-medicines floor catalogue
- Product: Prepped
- Traces to: UN-106, RC-110

The catalogue the lead clinician picks floor items from is the in-scope part of the WHO Model List of Essential Medicines (routes and storage per SYS-109), recreated from FDA drug directory entries (owner, 2026-11-10). Each entry records the FDA fields it came from and the WHO list edition it corresponds to. Snapshot, subset and licensing: TBD (OD-034).

### DAT-301 SpareWing data
- Product: SpareWing
- Traces to: UN-301, RC-304

Fully synthetic: bases, aircraft, part numbers and alternates, parts stock, pilots, ratings, currency dates, availability, communities, flight days, transfer modes and lead times (owner, 2026-11-10). Part numbers follow a made-up format that cannot be mistaken for a real manufacturer's.

## Data sets

| Set | Share | Used for | Readable by development tests |
| --- | --- | --- | --- |
| Development | Two thirds | Building, unit and acceptance tests, golden examples, demo | Yes |
| Held-back | One third | Pre-release confirmation run only | No |

## Revision history

| Version | Date | Change | By |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | First draft from the owner's answers of 2026-11-10 (ADR-005). | Claude, for owner review |
| 0.2 | 2026-11-10 | New DAT-102 essential-medicines floor catalogue recreated from FDA data (owner, 2026-11-10; ADR-009); DAT-101 covers routes and supplements. | Claude, for owner review |
