---
id: ADR-005
title: Data sources and the held-back confirmation set
status: Accepted
date: 2026-11-10
decided: owner, 2026-11-10
---

# ADR-005 Data sources and the held-back confirmation set

## Context

Building and testing must use synthetic data only, never real personal or health data. A portion of the data must be kept aside for a pre-release confirmation run, with no tuning ever performed on it (owner, 2026-11-10).

## Options

1. Fully synthetic data for both products.
2. Real medicine names and dosage forms from a public, non-proprietary directory, with synthetic lots, expiry dates, donors and trips for Prepped; fully synthetic data for SpareWing.

## Decision

Option 2 (owner, 2026-11-10): medicine names and dosage forms from the FDA drug directory (openFDA), with everything else synthetic; SpareWing fully synthetic. One third of the generated data is held back (owner, 2026-11-10), sealed with a recorded fingerprint, and used only for the pre-release confirmation run. Alternative data sets that might serve better (for example the WHO Model List of Essential Medicines) are offered for consideration (OD-034).

## Consequences

- DAT-001 to DAT-004, DAT-101, DAT-301; SOUP-101.
- Terms of the chosen directory file, snapshot date and subset: OD-034. Custody of the held-back set: OD-036.
- Golden examples and prompt tuning use only the development partition.
