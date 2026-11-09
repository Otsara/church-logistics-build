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
      },
    },
  },
});
