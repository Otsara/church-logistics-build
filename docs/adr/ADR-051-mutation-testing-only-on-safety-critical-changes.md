---
id: ADR-051
title: CI runs mutation testing only when safety-critical code or what builds it changes, within a small Actions spending limit
status: Accepted
date: 2026-11-20
decided: owner, 2026-11-20
---

# ADR-051 Mutation testing runs only on safety-critical changes

## Context

On 2026-11-19 GitHub stopped starting CI jobs on this repository with the message "recent account payments have failed or your spending limit needs to be increased". The Otsara organisation is on GitHub's free plan, whose private repositories get a monthly allowance of Actions minutes and a $0 spending limit.

From 9 to 19 November the repository ran 135 CI runs, using about 1,950 minutes of the longest job alone. The mutation testing job (ADR-006) takes 25 to 30 minutes and ran on every pull request and every push to main, including pull requests that change only documents.

ADR-006 and DOC-070 §4 ask for a mutation score of at least 80% on the changed code and the critical paths. A change that touches no safety-critical unit changes no mutation score.

## Options

1. **Cut the minutes:**
   - (a) run mutation testing only when a safety-critical unit, or what builds and tests it, changes;
   - (b) keep running it on every change.
2. **Restore CI now:**
   - (a) set a small Actions spending limit, staying on the free plan;
   - (b) wait for the monthly reset;
   - (c) make the repository public (open decision Q-21 in BUILD_SPEC), which is harder to undo.

## Decision

Owner, 2026-11-20: **1 (a)** and **2 (a)**, with a spending limit of $5 that the owner sets in GitHub.

A `changes` job in `.github/workflows/verify.yml` lists the files a pull request or push changes, using `git diff` only. Mutation testing runs when any of these changed:

- the source of the packages that hold safety-critical units (`packages/core/src`, `packages/synth/src`, `packages/ai/src`);
- `stryker.config.json`, `vitest.config.ts`, `tsconfig.json`;
- any `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`;
- the workflow itself.

A manual run, or a base commit that cannot be found, always runs it. The `verify` job (formatting, lint, types, tests with coverage, the document check and the audit) still runs on every change.

## Consequences

- A pull request that changes only documents uses about a minute of Actions time instead of about half an hour.
- Every change to safety-critical code still gets a full mutation run, so ADR-006 holds as before.
- The release gate (`pnpm docs:check --strict`) and a manual full run remain available before submission.
- Above the free allowance, Actions minutes are billed within the $5 limit; CI stops again if the limit is reached.
