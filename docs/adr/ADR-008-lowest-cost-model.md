---
id: ADR-008
title: Lowest-cost AI model by default
status: Accepted
date: 2026-11-10
decided: owner, 2026-11-10
---

# ADR-008 Lowest-cost AI model by default

## Context

The owner prefers the lowest-cost AI model that is feasible, and Anthropic is acceptable (owner, 2026-11-10). ARC-009 planned a cheap model for parsing and a stronger one for drafts and explanations. The lowest-cost current Anthropic model is Claude Haiku 5.5, listed at $0.10 per million input tokens and $0.50 per million output tokens for prompts up to 100,000 tokens.

## Options

1. Two tiers from the start.
2. Claude Haiku 5.5 for every step; move a step to a stronger model only if its golden tests show the need and the owner agrees.

## Decision

Option 2 (owner, 2026-11-10).

## Consequences

- ARC-009 updated; AIC-102, AIC-103, AIC-302 and AIC-303 start on Claude Haiku 5.5.
- The golden tests for each step decide whether the model is adequate; a change of model is a new decision.
- Model and price recorded in DOC-090 (SOUP-002).
