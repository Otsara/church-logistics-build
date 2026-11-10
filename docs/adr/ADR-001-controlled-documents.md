---
id: ADR-001
title: Controlled document set and ID migration
status: Accepted
date: 2026-11-10
decided: owner, 2026-11-10
---

# ADR-001 Controlled document set and ID migration

## Context

Flight and pharmacy are high-risk endeavours, and the owner asked for the build to be treated as mission-critical safety work: a controlled document set as the source of truth, `PREFIX-nnn` IDs that are never renumbered or reused, and a reconciliation check (owner, 2026-11-10). Until now the source of truth was `docs/BUILD_SPEC.md` (v0.5), with IDs in `PREFIX-n` form (PE-1, P-1, H-1, Q-1).

## Options

1. Keep the existing IDs and use `PREFIX-nnn` only for new items.
2. Move every item to `PREFIX-nnn` once, now, keeping each old ID as a recorded alias that is never reused.

## Decision

Option 2 (owner, 2026-11-10). The move is made once, before anything is approved. Number ranges show the product: 001–099 Shared, 100–299 Prepped, 300–499 SpareWing (DOC-000 §3).

| Old IDs (BUILD_SPEC) | New IDs | Document |
| --- | --- | --- |
| F-1 to F-12 | ARC-001 to ARC-012 | DOC-040 |
| PE-1 to PE-5 | SYS-101 to SYS-105 | DOC-020 |
| PR-1, PR-2 | SYS-106, SYS-107 | DOC-020 |
| SC-1 to SC-6 | SYS-301 to SYS-306 | DOC-020 |
| SI-1 | SYS-307 | DOC-020 |
| AR-1 to AR-6 | SYS-001 to SYS-006 | DOC-020 |
| AI-P1 to AI-P3 | AIC-101 to AIC-103 | DOC-040 |
| AI-S1 to AI-S3 | AIC-301 to AIC-303 | DOC-040 |
| P-1 to P-9 | TC-101 to TC-109 | DOC-070 |
| S-1 to S-7 | TC-301 to TC-307 | DOC-070 |
| X-1 to X-5 | TC-001 to TC-005 | DOC-070 |
| H-1 to H-7 | SUB-001 to SUB-007 | DOC-100 |
| Q-1 to Q-21 | OD-001 to OD-021 | DOC-003 |

Each migrated item records its old ID under `Formerly:`. Its wording is unchanged; only references to other items are converted to the new IDs.

`docs/BUILD_SPEC.md` is marked Superseded when this change is merged, which happens only on the owner's confirmation (owner, 2026-11-10: "superseding only when appropriate"). It is kept unchanged for history.

## Consequences

- One source of truth: the controlled set. The reconciliation check (`tools/check-docs.mjs`) replaces `tools/check-trace.mjs`.
- Test titles cite the new IDs. Old IDs remain searchable through `Formerly:` fields and this table.
- Commit messages and pull requests cite new IDs only.
