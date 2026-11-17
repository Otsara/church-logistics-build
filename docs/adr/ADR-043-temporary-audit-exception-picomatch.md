---
id: ADR-043
title: Temporary audit exception for the picomatch ReDoS advisory until a patched version exists
status: Accepted
date: 2026-11-17
decided: owner, 2026-11-17
---

# ADR-043 Temporary audit exception for the picomatch ReDoS advisory until a patched version exists

## Context

On 2026-11-17, advisory [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) rated `picomatch` 4.0.7 and earlier as high severity: a crafted glob pattern can make it run very slowly (ReDoS). No patched version exists yet. CI's dependency audit fails on any high advisory (SEC-004), so every pull request and `main` failed.

The exposure looks small:

- `picomatch` is reached only through development tools (vitest, vite, typescript-eslint, Stryker's runner).
- It reads glob patterns from the project's own configuration, never from user input.
- It is not part of either app.

## Options

- (a) Ignore this one advisory, recorded, until a patched version exists.
- (b) Audit only the packages the apps run, not development tools.
- (c) Wait for a patched release, with nothing merged meanwhile.

## Decision

(a), as Claude recommended (owner, 2026-11-17).

- `pnpm-workspace.yaml` lists GHSA-fc5q-39xc-vjpf under `auditConfig.ignoreGhsas`. Every other advisory still fails CI, and the audit still reports this one as ignored.
- A scheduled task checks twice a day for a patched `picomatch`. When one exists it brings the fix in, removes the exception, and opens a pull request for the owner, so the remedy lands before the submission (planned 2026-11-26).
- If no patch exists by 2026-11-24, the task asks the owner how to proceed.

## Consequences

- SEC-004 records the exception (DOC-060), and `picomatch` is registered as SOUP-020 (DOC-090).
- The exception must be gone before the release gate. It is to be removed in the same change that brings in the patched version.
