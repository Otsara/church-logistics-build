---
id: DOC-090
title: Third-party software, services and data register
version: 0.2
status: Draft
effective_date:
---

# DOC-090 Third-party software, services and data register

Every third-party library, tool, service and data set the products depend on, with its version, licence or terms, what it is used for, and whether a failure in it could affect safety. A component is registered here before it is first used. Versions are pinned exactly (`.npmrc`). Licences were read from the installed package metadata on 2026-11-10 unless noted.

## Components

### SOUP-001 zod
- Version: 4.6.7
- Licence: MIT
- Use: runtime schema validation of rule files (ARC-004) and AI output (ARC-008), in `packages/core` and `packages/ai`.
- Safety relevance: yes. It is part of the guard on AI output and rule files. Covered by the safety-critical tests of ARC-008 and ARC-004.

### SOUP-002 Anthropic API, Claude Haiku 5.5
- Version: model `claude-haiku-5-5`
- Terms: Anthropic commercial terms; paid per use.
- Use: the AI steps AIC-101 to AIC-303, called only through the server-side gateway (ARC-014) (ADR-008).
- Safety relevance: yes, mitigated. Output is never trusted: schema validation, null for unknowns, code makes every decision, manual fallback (RC-002, RC-006).
- Cost: $0.10 per million input tokens and $0.50 per million output tokens for prompts up to 100,000 tokens (Anthropic price list, 2026-11-03). Funding: OD-028.

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

### SOUP-011 GitHub Actions
- Version: actions/checkout@v4, pnpm/action-setup@v4, actions/setup-node@v4
- Terms: GitHub terms of service.
- Use: CI (`.github/workflows/verify.yml`).
- Safety relevance: indirect. CI enforces the checks.

### SOUP-012 Lovable
- Version: service
- Terms: Lovable terms; publishing to a lovable.app address is available on every plan, custom domains need a paid plan (Lovable documentation).
- Use: generates the screens (ARC-003). Projects and hosting: OD-018.
- Safety relevance: indirect. Screens must call the rules engines for every decision.

### SOUP-013 Supabase (proposed)
- Version: service
- Terms: Supabase terms. Free plan, with Edge Function invocations limited per month and projects paused after inactivity; Pro plan billed monthly (third-party summaries, to confirm on supabase.com/pricing).
- Use: proposed AI gateway (ARC-014) and optional sync (ARC-006). Not used until OD-001 and OD-027 are decided.
- Safety relevance: indirect.

### SOUP-014 Stryker (planned)
- Version: to be pinned at installation in iteration 0
- Licence: to be confirmed from the package metadata at installation
- Use: mutation testing of safety-critical code (ADR-006).
- Safety relevance: indirect.

### SOUP-101 FDA drug directory (openFDA NDC)
- Version: snapshot date TBD (OD-034)
- Terms: openFDA states its data is public domain under CC0 1.0 unless otherwise noted, asks for attribution, and says results should be assumed unvalidated (open.fda.gov/license, open.fda.gov/terms). To confirm for the chosen file (OD-034).
- Use: real medicine names and dosage forms for synthetic Prepped data (DAT-101).
- Safety relevance: indirect. Names and forms only; no clinical decision rests on the directory.

### SOUP-102 WHO Model List of Essential Medicines
- Version: 24th list (2025)
- Terms: the printed 2025 lists state CC BY-NC-SA 3.0 IGO (non-commercial, share-alike); the electronic list's licensing page states CC BY 3.0 IGO and is dated 2023. To resolve (OD-034).
- Use: reference for which medicines make up the floor catalogue (DAT-102). The catalogue itself is recreated from FDA directory data (owner, 2026-11-10).
- Safety relevance: indirect. The clinician chooses the floor; the list only frames the choice.

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
