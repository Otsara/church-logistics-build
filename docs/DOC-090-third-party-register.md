---
id: DOC-090
title: Third-party software, services and data register
version: 0.10
status: Draft
effective_date:
---

# DOC-090 Third-party software, services and data register

Every third-party library, tool, service and data set the products depend on, with its version, licence or terms, what it is used for, and whether a failure in it could affect safety. A component is registered here before it is first used. Versions are pinned exactly (`.npmrc`). Licences were read from the installed package metadata on 2026-11-10 unless noted.

## Components

### SOUP-001 zod
- Version: 4.6.7
- Licence: MIT
- Use: runtime schema validation of rule files (ARC-004), AI output (ARC-008) and openFDA records (ARC-015), in `packages/core`, `packages/ai` and `packages/synth`.
- Safety relevance: yes. It is part of the guard on AI output and rule files. Covered by the safety-critical tests of ARC-008 and ARC-004.

### SOUP-002 Anthropic API, Claude Haiku 5.5
- Version: model `claude-haiku-5-5`
- Terms: Anthropic commercial terms; paid per use.
- Use: the AI steps AIC-101 to AIC-303, called only through the server-side gateway (ARC-014) (ADR-008).
- Safety relevance: yes, mitigated. Output is never trusted: schema validation, null for unknowns, code makes every decision, manual fallback (RC-002, RC-006).
- Cost: $0.10 per million input tokens and $0.50 per million output tokens for prompts up to 100,000 tokens (Anthropic price list, 2026-11-03). Funding: up to $20, capped by a spending limit the owner sets on the account (owner, 2026-11-12); OD-028.

### SOUP-003 Node.js
- Version: 24 in CI; 22.12 or later locally
- Licence: MIT
- Use: runtime for tools and tests.
- Safety relevance: no.

### SOUP-004 pnpm
- Version: 12.11.2
- Licence: MIT
- Use: package manager and workspace.
- Safety relevance: no.

### SOUP-005 TypeScript
- Version: 6.0.3
- Licence: Apache-2.0
- Use: language and type checking (ARC-001).
- Safety relevance: indirect. Strict settings make missing data visible.

### SOUP-006 Vitest and coverage
- Version: vitest 4.1.12, @vitest/coverage-v8 4.1.12
- Licence: MIT
- Use: unit and acceptance tests; coverage gates (DOC-070).
- Safety relevance: indirect. A fault could hide a failing test; mitigated by mutation testing (SOUP-014).

### SOUP-007 ESLint and typescript-eslint
- Version: eslint 9.39.5, @eslint/js 9.39.5, typescript-eslint 8.72.1, globals 17.13.0
- Licence: MIT
- Use: lint, including the spec rules (no network, clock or AI imports in core; no "approved" strings).
- Safety relevance: indirect.

### SOUP-008 Prettier
- Version: 3.9.10
- Licence: MIT
- Use: formatting.
- Safety relevance: no.

### SOUP-009 @types/node
- Version: 26.6.5
- Licence: MIT
- Use: type definitions.
- Safety relevance: no.

### SOUP-010 minimatch (override)
- Version: 11.0.5
- Licence: BlueOak-1.0.0
- Use: pinned by override in `pnpm-workspace.yaml` to fix a denial-of-service advisory in the lint tooling.
- Safety relevance: no.

### SOUP-015 qs (override)
- Version: 6.17.1
- Licence: BSD-3-Clause
- Use: pinned by override in `pnpm-workspace.yaml` to fix denial-of-service advisories in versions before 6.16.1, reached only through Stryker's report-upload client.
- Safety relevance: no.

### SOUP-020 picomatch (transitive)
- Version: 4.0.7
- Licence: MIT
- Use: glob matching inside the development tools (vitest, vite, typescript-eslint, Stryker's runner); not part of either app.
- Safety relevance: no.
- Known issue: GHSA-fc5q-39xc-vjpf, a high ReDoS advisory with no patched version yet. It is ignored in the audit until a patched version exists, then upgraded and the exception removed (owner, 2026-11-17; ADR-043).

### SOUP-016 marked
- Version: 12.0.2
- Licence: MIT (npm package metadata, 2026-11-12)
- Use: renders the controlled documents to HTML for the stamped review copies (`tools/review-copies.mjs`, `pnpm docs:review-copies`).
- Safety relevance: no. Review copies are uncontrolled; the repository governs.

### SOUP-011 GitHub Actions
- Version: actions/checkout@v4, pnpm/action-setup@v4, actions/setup-node@v4, actions/upload-artifact@v4
- Terms: GitHub terms of service.
- Use: CI (`.github/workflows/verify.yml`).
- Safety relevance: indirect. CI enforces the checks.

### SOUP-012 Lovable
- Version: service
- Terms: Lovable terms; publishing to a lovable.app address is available on every plan, custom domains need a paid plan (Lovable documentation).
- Use: generates the screens (ARC-003); each app is published on its lovable.app address (owner, 2026-11-12); OD-018.
- Safety relevance: indirect. Screens must call the rules engines for every decision.

### SOUP-013 Supabase
- Version: service
- Terms: Supabase terms. Free plan, with Edge Function invocations limited per month and projects paused after inactivity; Pro plan billed monthly (third-party summaries, to confirm on supabase.com/pricing).
- Use: team sync and sign-in (ARC-006, SEC-008) and the AI gateway holding the key (ARC-014) (owner, 2026-11-12); OD-001, OD-027. A free project, `prepped-sparewing` (ref `rrdozsrqveoemiqzjuya`, region us-east-1), was created on 2026-11-11 (owner, 2026-11-11), separate from every other project. It holds the Edge Function `ai-gateway`, deployed on 2026-11-16, and the AI key as its secret, entered by the owner; no data yet. Free projects pause after a week without activity, which matters for a live demo during judging.
- Safety relevance: indirect.

### SOUP-014 Stryker
- Version: @stryker-mutator/core, vitest-runner and typescript-checker 10.1.1 (published 2026-10-23)
- Licence: Apache-2.0 (npm package metadata, 2026-11-12)
- Use: mutation testing of safety-critical code (ADR-006), `pnpm mutation`, in CI on every pull request.
- Safety relevance: indirect.

### SOUP-017 Anthropic TypeScript SDK
- Version: @anthropic-ai/sdk 1.3.0 (published 2026-10-23)
- Licence: Apache-2.0 (npm package metadata, 2026-11-16)
- Use: the AI gateway's call to the AI service (`packages/ai/src/anthropic.ts`, ARC-014), run in the Supabase Edge Function; its own retries are off and its time limit is 30 seconds (OD-058). Not used in the browser.
- Safety relevance: indirect. Output is still validated by the runner (ARC-008).

### SOUP-018 Supabase JavaScript client
- Version: @supabase/supabase-js 2.118.0 (published 2026-10-15)
- Licence: MIT (npm package metadata, 2026-11-16)
- Use: the AI gateway's sign-in check (`supabase/functions/ai-gateway`, SEC-008); later, team sync and sign-in in the apps (ARC-006). Loaded by the Edge Function from npm, pinned in its `deno.json` and `deno.lock`.
- Safety relevance: indirect.

### SOUP-019 Deno (Supabase Edge Runtime)
- Version: the runtime Supabase provides for Edge Functions; the wiring was type-checked locally with Deno 2.9.6 (published 2026-08-27).
- Licence: MIT (npm package metadata for `deno`, 2026-11-16)
- Use: runs the AI gateway (ARC-014). Deno is not part of the build or the tests.
- Safety relevance: indirect.

### SOUP-101 FDA drug directory (openFDA NDC)
- Version: NDC export of 2026-11-11 (`drug-ndc-0001-of-0001.json.zip`, 138,327 records, SHA-256 df68fd940abd2bb1737b0bbc6beaa7dbd78bafdd49a31ffdd50b24b6620f69b3), downloaded 2026-11-12 (OD-034)
- Terms: openFDA states its data is public domain under CC0 1.0 unless otherwise noted, asks for attribution, and says results should be assumed unvalidated (open.fda.gov/license, open.fda.gov/terms). The licence page states CC0 1.0 for openFDA data (read 2026-11-12); the file's own metadata links to that page.
- Use: real medicine names, dosage forms, routes, DEA schedules and pharmacologic classes for synthetic Prepped data (DAT-101).
- Safety relevance: yes, mitigated. Controlled status and route scope feed eligibility through the safety-critical importer (ARC-015); classes only frame alternatives for the clinician (SYS-108). openFDA says to assume its data unvalidated, so the pharmacist confirms controlled status for the destination.

### SOUP-102 WHO Model List of Essential Medicines
- Version: 24th list (2025)
- Terms: the printed 2025 lists state CC BY-NC-SA 3.0 IGO (non-commercial, share-alike); the electronic list's licensing page states CC BY 3.0 IGO and is dated 2023. To resolve (OD-046).
- Use: reference for which medicines make up the floor catalogue (DAT-102). The catalogue itself is recreated from FDA directory data (owner, 2026-11-10).
- Safety relevance: indirect. The clinician chooses the floor; the list only frames the choice.
- Status: Retired
- Reason: the WHO list is not used (owner, 2026-11-12); OD-046

## Costs

Figures as found on 2026-11-10. Third-party summaries are marked; confirm them on the providers' pricing pages before buying. Spending is the owner's decision (OD-028).

| Item | Needed for | Cost |
| --- | --- | --- |
| Anthropic API, Claude Haiku 5.5 | AI steps | $0.10 per million input tokens, $0.50 per million output tokens. A typical parse of about 2,000 input and 1,000 output tokens costs about $0.0007, so 1,000 AI calls cost about $0.70. |
| Supabase | AI gateway and optional sync (proposed) | Free plan $0; Pro $25 per month (third-party summaries). |
| Lovable | Screens and live demo | Publishing to lovable.app is free on all plans; custom domains need a paid plan (Lovable documentation). Plan prices vary by source, around $25 per month for Pro (third-party summaries). Building two apps may need more credits than the free plan gives. |
| GitHub Pro | Enforcing the `main` ruleset on a private repository (optional) | $4 per month (third-party summaries). |
| openFDA | Medicine names and forms | Free. |

## Revision history

| Version | Date | Change | By |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | First draft: SOUP-001 to SOUP-014, SOUP-101; costs. | Claude, for owner review |
| 0.2 | 2026-11-10 | New SOUP-102 WHO Model List of Essential Medicines (reference only; licence to resolve, OD-034). | Claude, for owner review |
| 0.3 | 2026-11-11 | SOUP-013: free Supabase project prepped-sparewing created (owner, 2026-11-11). | Claude, for owner review |
| 0.4 | 2026-11-12 | SOUP-014 Stryker pinned at 10.1.1 (Apache-2.0); SOUP-011 adds upload-artifact; SOUP-001 also used by the importer; new SOUP-015 qs override. | Claude, for owner review |
| 0.5 | 2026-11-12 | SOUP-002 funding (OD-028); SOUP-012 hosting (OD-018); SOUP-013 in use for sync, sign-in and AI gateway (OD-001, OD-027); SOUP-101 snapshot, CC0 confirmed and safety relevance (OD-034, OD-044); SOUP-102 licence moves to OD-046 (owner, 2026-11-12). | Claude, for owner review |
| 0.6 | 2026-11-12 | SOUP-102 retired: the WHO list is not used (OD-046). | Claude, for owner review |
| 0.7 | 2026-11-12 | New SOUP-016 marked 12.0.2 for the review-copy builder. | Claude, for owner review |
| 0.8 | 2026-11-16 | New SOUP-017 Anthropic SDK, SOUP-018 Supabase client and SOUP-019 Deno, for the AI gateway (ARC-014), registered before first use. | Claude, for owner review |
| 0.9 | 2026-11-16 | SOUP-013: the `ai-gateway` function deployed to the Supabase project (owner, 2026-11-16). | Claude, for owner review |
| 0.10 | 2026-11-17 | New SOUP-020 picomatch, with its temporary audit exception (ADR-043). | Claude, for owner review |
