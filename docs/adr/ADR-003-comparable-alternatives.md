---
id: ADR-003
title: Comparable alternatives offered for clinician review
status: Accepted
date: 2026-11-10
decided: owner, 2026-11-10
---

# ADR-003 Comparable alternatives offered for clinician review

## Context

Donated medicines in a class such as antihypertensives or antimicrobials often include several comparable, though not equivalent, options. The owner wants the clinician to be able to browse what is available when the program's proposed collection falls short (owner, 2026-11-10). Treating a comparable medicine as equivalent could put the wrong agent in a patient's hands (HAZ-105).

## Options

1. Never show alternatives.
2. Show comparable alternatives for the clinician to choose, never substituting automatically.
3. Substitute automatically within a class.

## Decision

Option 2 (owner, 2026-11-10). Alternatives are other eligible lots in the same therapeutic class, labelled "Comparable, not equivalent: clinician review required", with their class and its source, added only when the clinician chooses them. The class source is an open decision (OD-022); none is used until the owner chooses one.

## Consequences

- SYS-108, RC-105, UN-105, IU-102.
- A data source for therapeutic classes is needed, with its licence recorded in DOC-090.
- Tests must show that no alternative is ever added without a clinician action.
