---
id: ADR-034
title: SpareWing rule files are read from their text, refuse repeated keys, match types without spaces or case, and are labelled when placeholders
status: Accepted
date: 2026-11-16
decided: owner, 2026-11-16
---

# ADR-034 SpareWing rule files are read from their text, refuse repeated keys, match types without spaces or case, and are labelled when placeholders

## Context

The line-by-line review of `rule-files.ts` (REV-009) found four points:

1. Aircraft types were matched character for character, unlike part numbers (ADR-030) and ratings (ADR-032).
2. The cover-bases file lists bases per synthetic scenario; a real program lists them per community.
3. JSON keeps only the last of two entries with the same key, so a type or community written twice would silently replace the first.
4. The readers report whether a file is a placeholder, but no requirement said the screens must show it.

## Options

For each: change now, defer, or leave as is.

## Decision

All four as Claude recommended (owner, 2026-11-16):

1. Aircraft types are matched ignoring leading and trailing spaces and letter case; two entries naming the same type that way refuse the file.
2. The per-scenario cover file stays for the MVP; the per-community shape for a real program is deferred until after the hackathon (OD-060).
3. Rule files are read from their text by `json-text.ts`, which refuses any key named twice in one object, listing each repeat and where it is.
4. Every SpareWing result that relies on a placeholder rule file shows "Placeholder rules: not for real flight decisions" (new SYS-312), built with the screens in iteration 3.

## Consequences

- `packages/core/src/json-text.ts` (new) and `sparewing/rule-files.ts`: the readers take the file's text, not parsed JSON.
- New SYS-312, HAZ-309 and RC-309 (rating TBD: OD-061), TC-327 to TC-329, OD-060.
