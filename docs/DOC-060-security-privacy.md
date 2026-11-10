---
id: DOC-060
title: Security and privacy
version: 0.1
status: Draft
effective_date:
---

# DOC-060 Security and privacy

What protects the people, data and services behind Prepped and SpareWing. During the hackathon build only synthetic data exists, so these requirements are designed now and verified before any real-world use.

## Requirements

### SEC-001 AI keys held server-side only
- Product: Shared
- Traces to: UN-002, RC-007

AI service keys never appear in front-end code, the repository, logs or review copies. They are held as server-side secrets and used only by the AI gateway (ARC-014). Proposed store: a Supabase Edge Function secret (OD-027).

### SEC-002 Synthetic data only in the build
- Product: Shared
- Traces to: UN-002, RC-004

The repository, tests, golden examples, demo and video contain only synthetic data (DAT-003). No real names, records or health data.

### SEC-003 Encrypted transport and safe headers
- Product: Shared
- Traces to: UN-002, RC-004

Every connection uses HTTPS. Published apps send security headers that block framing and third-party scripts. Header set: TBD with hosting (OD-018).

### SEC-004 Dependency vulnerabilities checked
- Product: Shared
- Traces to: UN-002, RC-007

CI runs a dependency audit on every pull request and fails on high or critical advisories. New dependencies are registered in DOC-090 before use.

### SEC-005 Least data to AI services
- Product: Shared
- Traces to: UN-002, RC-004

Each AI step receives only the fields it needs, after names are replaced by ids (ARC-013). Pilot and donor names are never sent.

### SEC-006 Data at rest on devices
- Product: Shared
- Traces to: UN-002, RC-004

Protection of data kept in the browser if a device is lost or shared: TBD (OD-033). Blocks real-world use only.

### SEC-007 No secrets in commits
- Product: Shared
- Traces to: RC-007

`.env` files are ignored by git; secrets are never committed. Before the repository is made public, its full history is scanned for secrets (OD-021).

## Revision history

| Version | Date | Change | By |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | First draft. | Claude, for owner review |
