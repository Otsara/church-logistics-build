---
id: REV-015
title: Line-by-line review of the explanation step change for the screen projects' compiler settings
date: 2026-11-19
---

# REV-015 Line-by-line review of the explanation step change for the screen projects' compiler settings

## Reviewed

One line of the readiness and plan explanation step (`packages/ai/src/steps/explain.ts`, `othersOf`; AIC-103, AIC-303), from the pull request "Shared: rules folder compiles under the screen projects' stricter TypeScript settings" (#40). The owner reviewed it and confirmed the review in the build conversation on 2026-11-19, after merging #40.

The change, in full:

```diff
-      ...(typeof f.values.name === "string" ? [f.values.name] : []),
+      ...(typeof f.values["name"] === "string" ? [f.values["name"]] : []),
```

## Findings and decisions

| # | Finding | Decision |
|---|---|---|
| 1 | The line reads the same property in the same way; only the syntax changes, so `noPropertyAccessFromIndexSignature` accepts it in the Lovable screen projects. There is no change in behaviour. | Reviewed by the owner (owner, 2026-11-19). |

## Outcome

- Merged to main in #40 with CI green, including the mutation testing job.
- Full line and branch coverage. Mutation score for `explain.ts`: 96.00% (120 killed, 5 survived), above the threshold of 80% (ADR-006).
