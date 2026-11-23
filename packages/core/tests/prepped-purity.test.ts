// The Prepped rules engine is pure functions: no AI, network or clock (ARC-101; CLAUDE.md rule 2).
// Every file in packages/core/src/prepped imports only other rules files or the schema library,
// and never reads the time, the network, chance or the environment; callers pass these in.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(import.meta.dirname, "../src/prepped");
const IMPORT = /(?:^|\n)\s*(?:import|export)\b[^;]*?\bfrom\s+"([^"]+)"/g;
const IMPURE: readonly RegExp[] = [
  /\bDate\.now\s*\(/,
  /\bnew Date\s*\(/,
  /\bfetch\s*\(/,
  /\bMath\.random\s*\(/,
  /\bprocess\./,
  /\bsetTimeout\s*\(/,
  /\bsetInterval\s*\(/,
  /\blocalStorage\b/,
  /\bindexedDB\b/,
  /\bXMLHttpRequest\b/,
];

/** What a source file breaks of ARC-101: each outside import and each impure call. */
export function impurities(text: string): string[] {
  const found: string[] = [];
  for (const [, from] of text.matchAll(IMPORT)) {
    const allowed =
      from !== undefined &&
      (from === "zod" || /^\.\.?\/[^]*\.ts$/.test(from)) &&
      !/\/ai\b|\/store\b/.test(from);
    if (!allowed) found.push(`imports "${String(from)}"`);
  }
  for (const pattern of IMPURE)
    if (pattern.test(text)) found.push(`uses ${pattern.source}`);
  return found;
}

describe("Prepped rules engine is pure", () => {
  it("[ARC-101] Given every file of the Prepped rules engine, then it imports only rules files or the schema library, and never reads the time, the network, chance or storage", () => {
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThanOrEqual(10);
    const findings = files.flatMap((f) =>
      impurities(readFileSync(join(dir, f), "utf8")).map((i) => `${f}: ${i}`),
    );
    expect(findings).toEqual([]);
  });

  it("[ARC-101] Given a file that imports the AI client, a network library or reads the clock, then each is found", () => {
    expect(
      impurities(
        [
          'import { runStep } from "../../../ai/src/runner.ts";',
          'import axios from "axios";',
          'import { z } from "zod";',
          'import { parseIsoDate } from "../dates.ts";',
          "const now = Date.now();",
          "const r = Math.random();",
        ].join("\n"),
      ),
    ).toEqual([
      'imports "../../../ai/src/runner.ts"',
      'imports "axios"',
      "uses \\bDate\\.now\\s*\\(",
      "uses \\bMath\\.random\\s*\\(",
    ]);
  });
});
