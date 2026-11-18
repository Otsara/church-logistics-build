---
id: ADR-046
title: Screens use a generated rules file committed into each Lovable project, the screens are specified in DOC-045, Prepped first, and the demo opens without sign-in
status: Accepted
date: 2026-11-18
decided: owner, 2026-11-18
---

# ADR-046 Screens use a generated rules file, specified in DOC-045, Prepped first, with a demo mode

## Context

Iteration 3 builds the screens in two stand-alone Lovable projects, published on lovable.app (OD-018). Every decision must come from `packages/core` (CLAUDE.md rule 2), but nothing said how a separate Lovable project reaches that code. The plan asks for a complete screen specification before any credit is spent (DOC-100, IT-003). The AI gateway answers only signed-in users (ARC-014).

## Options

1. **How the screens reach core:**
   - (a) a generated bundle committed into each Lovable project's GitHub repository;
   - (b) a published npm package;
   - (c) Lovable builds screens only, wired and hosted here.
2. **Where the specification lives:**
   - (a) a new controlled document;
   - (b) uncontrolled notes in the app folders.
3. **Order:**
   - (a) Prepped first, then SpareWing;
   - (b) both together.
4. **Demo access:**
   - (a) demo mode on synthetic data without sign-in, with AI only for accounts the owner creates;
   - (b) a shared demo account published with the submission.

## Decision

1 (a), 2 (a), 3 (a) and 4 (a), as Claude recommended (owner, 2026-11-18).

## Consequences

- A build script bundles core, the AI client and the offline store into one file, and commits it into each Lovable project's repository. Nobody edits the file by hand, and CI checks that it matches this repository.
- Each Lovable project's GitHub repository must be one this session can push to. That access will be asked for when the projects are created.
- (b) was rejected because it would need the code public before submission (OD-021). (c) was rejected because it contradicts OD-018.
- DOC-045 holds the screen specification. Screens trace to existing requirement IDs, with no new ID prefix.
- In demo mode, the app works offline on synthetic data with a "Demo: synthetic data only" banner. AI actions ask for sign-in or offer manual entry. No password is published, so the AI key cannot be misused by the public.
