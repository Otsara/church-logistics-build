// Shared acceptance tests for the rules engines, from DOC-070. The word "approved" never reaches a
// screen, export or message (CLAUDE.md rule 6; SYS-010, SYS-305, SYS-309). Three checks cover it:
// the lint rule on every string in the packages' source, this test on the rule files the screens
// show, and the Prepped app's own test on its screens (Otsara/prepped, src/test/prepped-rules.test.tsx).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../../..");

/** Every string in a parsed rule file, with its path, leaving out the reviewers' notes. */
function strings(value: unknown, path: string): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value))
    return value.flatMap((v, i) => strings(v, `${path}[${String(i)}]`));
  if (value !== null && typeof value === "object")
    return Object.entries(value).flatMap(([key, v]) =>
      // Notes are for reviewers and explain why the word is avoided; they are never shown.
      key === "notes" ? [] : strings(v, `${path}.${key}`),
    );
  return [];
}

describe("Shared rules acceptance", () => {
  it("[TC-009] Given the screens, exports and messages of both apps, then none uses the word approved: no rule file says it, and the lint rule refusing it covers every package's source", () => {
    const findings: string[] = [];
    let files = 0;
    for (const product of ["prepped", "sparewing"]) {
      const dir = join(root, "rules", product);
      for (const name of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
        files += 1;
        const parsed: unknown = JSON.parse(
          readFileSync(join(dir, name), "utf8"),
        );
        for (const [path, text] of strings(parsed, `${product}/${name}`))
          if (/\bapproved\b/i.test(text)) findings.push(`${path}: ${text}`);
      }
    }
    expect(files).toBeGreaterThanOrEqual(9);
    expect(findings).toEqual([]);

    const lint = readFileSync(join(root, "eslint.config.mjs"), "utf8");
    expect(lint).toContain(
      String.raw`selector: "Literal[value=/\\bapproved\\b/i]"`,
    );
    expect(lint).toContain(
      String.raw`selector: "TemplateElement[value.raw=/\\bapproved\\b/i]"`,
    );
    expect(lint).toMatch(
      /files: \["packages\/\*\/src\/\*\*\/\*\.ts"\],\s*rules: \{ "no-restricted-syntax": \["error", \.\.\.NO_APPROVED\] \}/,
    );
  });

  it("[TC-009] Given a rule file that says approved outside its notes, then the check finds it", () => {
    expect(
      strings(
        {
          title: "Card",
          data: { items: [{ requirement: "Approved by X" }] },
          notes: "approved",
        },
        "x",
      ).filter(([, t]) => /\bapproved\b/i.test(t)),
    ).toEqual([["x.data.items[0].requirement", "Approved by X"]]);
  });
});
