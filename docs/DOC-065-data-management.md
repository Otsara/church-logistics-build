---
id: DOC-065
title: Data management plan
version: 0.9
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
- Corpus of 2026-11-12: 30 scenarios per product, 10 of each held back; generator commit a485ed8; development part in `data/synthetic/development/`; manifest `data/synthetic/held-back-manifest.json`; package SHA-256 7fd9f4e77fe7a82f31239e2f1884be0daee2c26e8781fd39fdf455b17f7e361c, sent to the owner on 2026-11-12, and Claude's copy deleted. It replaces two earlier packages built before OD-049 and OD-051, neither of which was opened.

### DAT-003 No real personal or health data
- Product: Shared
- Traces to: UN-002, RC-004

Building and testing use synthetic data only, never real personal or health data (owner, 2026-11-10). Names are generated from neutral word lists and never resemble real congregation, patient or pilot records.

### DAT-004 Golden examples from the development partition
- Product: Shared
- Traces to: UN-005, RC-002

Golden examples for the AI steps (AIC-101 to AIC-303) are drawn only from the development two thirds. They live in `packages/ai/golden/`, each naming the development scenario and records it came from, and a test checks none comes from a held-back record (TC-022).

### DAT-101 Prepped medicine catalogue
- Product: Prepped
- Traces to: UN-101, RC-101

Medicine names, dosage forms and routes come from a dated snapshot of the FDA drug directory (openFDA) (owner, 2026-11-10), for both floor items (DAT-102) and supplements. Lots, lot numbers, quantities, expiry dates, donors, trips and needs are synthetic. Controlled-substance status and therapeutic class (EPC) come from the directory; the directory has no storage field, so storage and cold-chain flags on lots are synthetic. The importer (ARC-015) reads a product without a DEA schedule as not controlled in the US, with that basis recorded (OD-044), and treats a route not mapped in `rules/prepped/route-scope.json` as out of scope (mapping verified by the owner, OD-042). Snapshot: the openFDA NDC export of 2026-11-11, 138,327 records, zip SHA-256 df68fd940abd2bb1737b0bbc6beaa7dbd78bafdd49a31ffdd50b24b6620f69b3, downloaded 2026-11-12; only in-scope routes are kept, and the snapshot is frozen until the submission (owner, 2026-11-12); OD-034. Imported on 2026-11-12 to `data/fda/catalog-2026-11-11.json` (ARC-018): 32,406 in-scope entries from 51,051 merged products; 772 controlled; 13,516 with a class; 3 records rejected for having no generic name. Biologic product types are excluded as cold chain (owner, 2026-11-12); OD-049. Compressed gases are excluded (owner, 2026-11-12); OD-051.

### DAT-102 Essential-medicines floor catalogue
- Product: Prepped
- Traces to: UN-106, RC-110

The catalogue the lead clinician picks floor items from is the in-scope FDA catalogue (DAT-101). The WHO Model List of Essential Medicines is not used (owner, 2026-11-12); OD-046, ADR-018. This replaces the earlier plan to recreate the in-scope part of the WHO list from FDA entries (owner, 2026-11-10 and 2026-11-11).

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
| 0.7 | 2026-11-12 | DAT-002 corpus rebuilt after OD-049; DAT-101 counts without biologics; DAT-102 WHO list not used (OD-046). | Claude, for owner review |
| 0.8 | 2026-11-12 | DAT-002 third package; DAT-101 catalogue without gases (OD-051, REV-001). | Claude, for owner review |
| 0.9 | 2026-11-16 | DAT-004: where the golden examples live and how their source is checked. | Claude, for owner review |
