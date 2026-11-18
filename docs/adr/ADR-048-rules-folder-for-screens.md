---
id: ADR-048
title: The screens import one generated folder of stamped source copies, not one bundled file
status: Proposed
date: 2026-11-18
---

# ADR-048 The screens import one generated folder of stamped source copies

## Context

ADR-046 decided that a build script bundles core, the AI client and the offline store into one generated file, committed into each Lovable project's repository (owner, 2026-11-18).

Building it showed a cost. A single bundled JavaScript file drops the TypeScript types the screens need to call the rules correctly. Keeping the types needs a bundling tool this build does not use yet (DOC-090).

The Lovable projects use Vite with TypeScript, which compiles TypeScript source directly.

## Options

- (a) **One generated folder.**
  - It holds exact copies of only the source files the screens need, found by following the imports from `packages/core/src/index.ts` and the new browser-safe `packages/ai/src/client.ts`.
  - Each file is stamped "Generated … Do not edit".
  - It also holds the rule files as text, an index, and a manifest of every file's SHA-256 and the commit it came from.
  - `tools/rules-bundle.mjs --check` compares a folder with a fresh build and lists any edited, missing or extra file.
- (b) **One bundled JavaScript file,** plus generated type declarations. This needs a new bundling tool, registered first.

## Proposal

(a), proposed by Claude, for the owner to confirm.

- No new tool.
- The types are kept.
- The copies can be read and compared line by line with this repository.
- The only package from outside the folder is `zod`. The script refuses any other import, so no server code or key can reach a browser (SEC-001).
- The offline store is not in the folder yet: it is not built (ARC-006).

## Consequences

- `pnpm rules:bundle <folder>` writes the folder. `node tools/rules-bundle.mjs --check <folder>` checks it, and is to run in CI once the Lovable project's repository exists.
- `packages/ai/src/client.ts` is what the screens may use from the AI package. The call to the AI service and the gateway handler stay server-only.
- TC-031 verifies the folder.
