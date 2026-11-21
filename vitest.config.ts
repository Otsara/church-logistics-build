import { defineConfig } from "vitest/config";

// Rule logic decides whether a medicine, part or pilot is offered at all (PE, PR, SC, SI),
// so every line and branch of packages/core must be exercised.
const FULL = { lines: 100, branches: 100, functions: 100, statements: 100 };

export default defineConfig({
  test: {
    include: ["packages/*/tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["packages/*/src/index.ts"],
      reporter: ["text", "json-summary"],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
        "packages/core/src/**": FULL,
        // The openFDA importer sets scope and controlled-substance flags (ARC-015, safety-critical).
        "packages/synth/src/fda.ts": FULL,
        // The snapshot catalogue keeps only in-scope products (ARC-018, safety-critical).
        "packages/synth/src/snapshot.ts": FULL,
        // The data scripts' checks guard the snapshot and the held-back set (ARC-018, DAT-002).
        "packages/synth/src/data-checks.ts": FULL,
        // The AI runner is the guard on every AI output (ARC-008, safety-critical).
        "packages/ai/src/runner.ts": FULL,
        // Names are replaced before any AI call (ARC-013).
        "packages/ai/src/names.ts": FULL,
        // The readers' checks are part of the guard on AI output (ARC-008, ADR-035).
        "packages/ai/src/steps/**": FULL,
        // The sync rules decide whether a record in conflict is counted (ARC-019, ADR-052).
        "packages/store/src/**": FULL,
      },
    },
  },
});
