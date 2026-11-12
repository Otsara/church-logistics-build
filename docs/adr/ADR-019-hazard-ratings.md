---
id: ADR-019
title: Hazard ratings and the full acceptability rule
status: Accepted
date: 2026-11-12
decided: owner, 2026-11-12
---

# ADR-019 Hazard ratings and the full acceptability rule

## Context

ADR-016 set the three-by-three scale and the rule for critical risks, but left the levels undefined, said nothing about serious or minor risks, and left every hazard unrated (OD-047).

## Options

- Definitions: written by the owner; or proposed by Claude and confirmed by the owner.
- Ratings: the owner rates each hazard; or Claude proposes and the owner confirms.
- Rule for non-critical risks: none; or serious-and-likely never acceptable without a further control, and any other risk acceptable once its controls are verified by tests.

## Decision

Claude proposed definitions, a rating for each of the 30 hazards, and the rule for non-critical risks; the owner confirmed all of them (owner, 2026-11-12). Probability is rated with the listed controls working.

## Consequences

- DOC-030 §1 and every HAZ item carry a severity, a probability and the reason.
- No hazard is serious-and-likely, and every critical hazard has a control in code and a person's check, so every residual risk is acceptable once its controls are verified by tests.
- Six serious-and-possible risks rest most on a person's check (HAZ-103, HAZ-104, HAZ-110, HAZ-111, HAZ-112, HAZ-114); the screens must make those checks clear.
- Ratings are reviewed at each iteration and whenever a control changes. The benefit-risk conclusion is open (OD-050).
