---
id: ADR-031
title: The AI runner refuses a prompt that still holds a name, logs no model text, and takes its time limit as an input
status: Proposed
date: 2026-11-16
decided:
---

# ADR-031 The AI runner refuses a prompt that still holds a name, logs no model text, and takes its time limit as an input

## Context

Iteration 2 builds the AI step runner (ARC-008) and name replacement (ARC-013). SYS-006 and SEC-005 say names are replaced by ids before any AI call, and SYS-008 says every call is logged. Three questions arose that the requirements do not settle:

1. Name replacement can miss a name, for example one typed into a free-text field the step did not expect. Should the runner itself check the prompt?
2. What does the audit log hold for a failed call? The model's text might echo something it should not.
3. How long does the runner wait for the AI service? A number here is a limit, which is the owner's to set.

## Options

1. Trust the step's own replacement; or also check the prompt against every known name and refuse the call if one is found.
2. Log the model's text; or log only the outcome and, for invalid output, where the schema failed (field path and message).
3. A built-in default; or an input with no default, its value an open decision.

## Decision (proposed by Claude, for the owner)

1. The runner checks the prompt, whole-word and ignoring letter case, against every known name it is given. If one is found, no call is made, the person is sent to manual entry (attempts 0) and the refusal is logged without the name.
2. The log holds the tier, the outcome and, for invalid output, the failing field paths and messages; never the prompt or the model's text.
3. The time limit is an input with no default; its value is OD-058.

## Consequences

- `packages/ai/src/runner.ts` and `names.ts`; ARC-008, ARC-013; TC-002 to TC-004 implemented.
- Both files are held to 100% coverage and mutation testing (ADR-006), as the guard on every AI output.
- A name that is also an ordinary word (for example a donor called "Hope") would refuse prompts that use the word; the person is sent to manual entry, the safe direction. To be watched in the golden tests.
