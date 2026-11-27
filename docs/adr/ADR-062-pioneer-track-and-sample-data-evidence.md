---
id: ADR-062
title: The submission goes to the Pioneer Track, and the sample-data evidence names both sources of synthetic data
status: Accepted
date: 2026-11-27
decided: owner, 2026-11-27
---

# ADR-062 Pioneer Track and the sample-data evidence

## Context

On the deadline day two submission details changed.

- **Track.** OD-020 chose the Open Track (owner, 2026-11-09). On the submission form the owner chose the Pioneer Track instead. The hackathon page could not be read from the build session (its host is outside the session's network), so the track's own description is not quoted here.
- **Sample data.** The checklist line for SUB-005 asked for evidence that the demo data comes from `packages/synth` with a stated seed. The demo video's trip, people and donor list were written by hand for the recording: made up, but not generated from a seed. The tests and the held-back confirmation run do use `packages/synth` data with recorded seeds.

## Options

- Track: keep the Open Track; or the Pioneer Track.
- Sample data: (a) state the evidence as synthetic data only, naming both sources; (b) keep the wording and leave SUB-005 unticked, so the strict gate fails.

## Decision

The Pioneer Track (OD-072), and option (a) for the sample data (OD-071) (owner, 2026-11-27).

## Consequences

- SUB-007 is titled "One project, Pioneer Track" and no longer quotes the Open Track's list of ideas. It keeps the four judging criteria; the owner confirms on the form that they still apply.
- SUB-005's requirement is unchanged: synthetic data only, no real personal information. Only its evidence is worded to match what was done.
- OD-020 stays closed and notes the change.
