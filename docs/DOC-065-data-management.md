---
id: DOC-065
title: Data management plan
version: 0.6
status: Draft
effective_date:
---

# DOC-065 Data management plan

Where the data for building, testing and the demo comes from, how it is split, and how the held-back confirmation set is protected from ever influencing the build (ADR-005).

## Requirements

### DAT-001 Seeded, reproducible generation
- Product: Shared
- Traces to: UN-005, RC-002

All data is produced by `packages/synth` from a recorded seed. The same seed and generator version always give identical data. Each scenario records its own seed, derived from the corpus seed. The corpus seed and split seed are recorded only in the held-back package the owner holds, never in the repository, because with them the held-back third could be regenerated from the committed development part.

### DAT-002 Held-back confirmation set
- Product: Shared
- Traces to: UN-005, RC-002

- One third of the generated corpus is held back (owner, 2026-11-10). The split is by record, decided by a separate seed, and recorded in a manifest.
- The held-back third is sealed: its files are listed with SHA-256 fingerprints in a committed manifest, and the files themselves are kept out of the development tree. The owner holds the file in the owner's own private storage; Claude generates it, records the fingerprints, hands the file to the owner and deletes its own copy (owner, 2026-11-12); OD-036.
- It is never used for building, debugging, prompt writing, golden examples or tuning. Tests that run during development cannot read it.
- It is opened once per release candidate, for the pre-release confirmation run (DOC-070 §5), with the owner present. The fingerprints are checked before the run; any mismatch stops the run.
- If anyone sees held-back data before the run, the set is spent: a new held-back third is generated and the event is recorded.
- Corpus of 2026-11-12: 30 scenarios per product, 10 of each held back; generator commit 91ea8f0; development part in `data/synthetic/development/`; manifest `data/synthetic/held-back-manifest.json`; package SHA-256 8fb3a301acff504e3eb4820f940287e124354839cda36da32538c903b99c13fd, sent to the owner on 2026-11-12, and Claude's copy deleted.

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

Medicine names, dosage forms and routes come from a dated snapshot of the FDA drug directory (openFDA) (owner, 2026-11-10), for both floor items (DAT-102) and supplements. Lots, lot numbers, quantities, expiry dates, donors, trips and needs are synthetic. Controlled-substance status and therapeutic class (EPC) come from the directory; the directory has no storage field, so storage and cold-chain flags on lots are synthetic. The importer (ARC-015) reads a product without a DEA schedule as not controlled in the US, with that basis recorded (OD-044), and treats a route not mapped in `rules/prepped/route-scope.json` as out of scope (mapping verified by the owner, OD-042). Snapshot: the openFDA NDC export of 2026-11-11, 138,327 records, zip SHA-256 df68fd940abd2bb1737b0bbc6beaa7dbd78bafdd49a31ffdd50b24b6620f69b3, downloaded 2026-11-12; only in-scope routes are kept, and the snapshot is frozen until the submission (owner, 2026-11-12); OD-034. Imported on 2026-11-12 to `data/fda/catalog-2026-11-11.json` (ARC-018): 32,601 in-scope entries from 51,051 merged products; 772 controlled; 13,577 with a class; 3 records rejected for having no generic name. Biologics in the catalogue: OD-049.

### DAT-102 Essential-medicines floor catalogue
- Product: Prepped
- Traces to: UN-106, RC-110

The catalogue the lead clinician picks floor items from is the in-scope part of the WHO Model List of Essential Medicines (routes and storage per SYS-109), recreated from FDA drug directory entries (owner, 2026-11-10). Each entry records the FDA fields it came from and the WHO list edition it corresponds to. The owner considers this merge reasonable for the hackathon and beyond (owner, 2026-11-11). WHO items or forms with no FDA entry stay listed, marked "No FDA directory entry: enter details by hand" (owner, 2026-11-12); OD-034. Licence of the WHO list: OD-046.

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
| 0.3 | 2026-11-11 | DAT-102: merge of the WHO list and FDA data accepted by the owner (owner, 2026-11-11). | Claude, for owner review |
| 0.4 | 2026-11-12 | DAT-101: how the importer treats unknown controlled status and unmapped routes. | Claude, for owner review |
| 0.5 | 2026-11-12 | DAT-002 custody (OD-036); DAT-101 snapshot, subset, controlled status and class (OD-022, OD-034, OD-044); DAT-102 unmatched WHO items (OD-034) (owner, 2026-11-12). | Claude, for owner review |
| 0.6 | 2026-11-12 | DAT-001 seed custody; DAT-002 corpus built and held-back package handed to the owner (OD-036); DAT-101 catalogue imported. | Claude, for owner review |
