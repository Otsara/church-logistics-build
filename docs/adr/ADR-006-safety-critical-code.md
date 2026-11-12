---
id: ADR-006
title: Verification criteria for safety-critical code
status: Accepted
date: 2026-11-10
decided: owner, 2026-11-10
---

# ADR-006 Verification criteria for safety-critical code

## Context

Code that decides eligible, blocked, candidate or excluded, readiness, arrival estimates, missed flights, or guards AI output could contribute to harm if wrong. The owner requires 100% branch coverage, a mutation-score floor and line-by-line review for such code (owner, 2026-11-10).

## Options

1. Coverage only.
2. Coverage, mutation testing and owner review.

## Decision

Option 2 (owner, 2026-11-10):

- Safety-critical code is everything that decides eligible, blocked, candidate or excluded; readiness; arrival estimates; missed flights; and the guard on AI output (owner, 2026-11-10). It is marked `Safety-critical: yes` in DOC-020 and DOC-040.
- 100% branch, line, function and statement coverage.
- Mutation score of at least 80%, measured with Stryker, applied selectively to changed code and critical paths (owner, 2026-11-10).
- The owner's line-by-line review in the build conversation, kept as a review record (owner, 2026-11-10).

## Consequences

- Stryker is added to the toolchain in iteration 0 (SOUP register DOC-090).
- No safety-critical unit is marked verified until all three criteria are met and recorded.
