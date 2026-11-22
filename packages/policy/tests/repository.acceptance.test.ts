// Repository policy tests from DOC-070: rules that hold for the whole repository, not one package.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sealManifest, type Manifest } from "../../synth/src/split.ts";
import { isSyntheticPersonName } from "../../synth/src/words.ts";

const root = join(import.meta.dirname, "../../..");
const read = (path: string): string => readFileSync(join(root, path), "utf8");

// Patterns for credentials that must never be committed (SEC-001, SEC-007).
const SECRET_PATTERNS: readonly RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]{20,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[A-Za-z0-9]{30,}/,
  /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
];

describe("Repository policy acceptance", () => {
  it("[TC-016] Given the CI workflow, then every pull request runs a dependency audit that fails on high or critical advisories", () => {
    const workflow = read(".github/workflows/verify.yml");
    expect(workflow).toMatch(/^\s*pull_request:/m);
    expect(workflow).toContain("pnpm audit --audit-level high");
  });

  it("[TC-019] Given the repository, then .env files are ignored and no tracked file contains a credential", () => {
    expect(
      read(".gitignore")
        .split("\n")
        .map((l) => l.trim()),
    ).toContain(".env");
    const files = execFileSync("git", ["ls-files", "-z"], {
      cwd: root,
      encoding: "utf8",
    })
      .split("\0")
      .filter((f) => f !== "" && !f.endsWith(".png"));
    expect(files.length).toBeGreaterThan(10);
    const findings: string[] = [];
    for (const file of files) {
      const text = read(file);
      for (const pattern of SECRET_PATTERNS)
        if (pattern.test(text)) findings.push(`${file}: ${pattern.source}`);
    }
    expect(findings).toEqual([]);
  });

  it("[TC-013] Given the repository and the rules folder built for the apps, then only the server-side gateway reads the AI service key, and the apps' folder holds no key, no AI service SDK and no gateway code: the apps reach the AI only through the gateway", () => {
    const tracked = execFileSync("git", ["ls-files", "-z"], {
      cwd: root,
      encoding: "utf8",
    })
      .split("\0")
      .filter((f) => /\.(ts|tsx|mjs|js|json)$/.test(f));
    // Only the gateway function reads the key, from its server-side secrets; the golden-recording
    // script may also take it from the environment of the person running it, and is never shipped.
    const readers = tracked.filter(
      (f) =>
        f !== "packages/policy/tests/repository.acceptance.test.ts" &&
        /ANTHROPIC_API_KEY/.test(read(f)),
    );
    expect(readers).toEqual([
      "packages/ai/scripts/record-golden.ts",
      "supabase/functions/ai-gateway/index.ts",
    ]);
    expect(read("supabase/functions/ai-gateway/index.ts")).toContain(
      "Deno.env.get(name)",
    );

    // What the apps get: build the rules folder and look through every file.
    const out = mkdtempSync(join(tmpdir(), "rules-folder-"));
    try {
      execFileSync("node", ["tools/rules-bundle.mjs", out], { cwd: root });
      const files = (readdirSync(out, { recursive: true }) as string[]).filter(
        (f) => f.endsWith(".ts") || f.endsWith(".json"),
      );
      expect(files.length).toBeGreaterThan(20);
      const findings = files.flatMap((f) => {
        const text = readFileSync(join(out, f), "utf8");
        return [
          /ANTHROPIC_API_KEY|x-api-key|api\.anthropic\.com/i,
          /@anthropic-ai\/sdk/,
          /\/\/ Generated from [^\n]*packages\/ai\/src\/(anthropic|gateway)\.ts/,
          ...SECRET_PATTERNS,
        ]
          .filter((pattern) => pattern.test(text))
          .map((pattern) => `${f}: ${pattern.source}`);
      });
      expect(findings).toEqual([]);
      expect(files).toContain(join("ai", "gateway-client.ts"));
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
  it("[TC-014] Given every fixture, golden example and demo data file, then every person, donor and pilot name is synthetic and every data file is marked synthetic", () => {
    const tracked = execFileSync("git", ["ls-files", "-z"], {
      cwd: root,
      encoding: "utf8",
    }).split("\0");
    // The FDA snapshot is public reference data about medicines, with no people in it (DAT-101).
    const dataFiles = tracked.filter(
      (f) =>
        f.endsWith(".json") &&
        (f.startsWith("data/synthetic/") ||
          f.startsWith("packages/ai/golden/")),
    );
    expect(dataFiles.length).toBeGreaterThanOrEqual(5);
    const problems: string[] = [];
    for (const file of dataFiles) {
      const parsed = JSON.parse(read(file)) as Record<string, unknown>;
      if (parsed["synthetic"] !== true)
        problems.push(`${file}: not marked synthetic`);
      const walk = (value: unknown, key: string): void => {
        if (Array.isArray(value)) {
          for (const v of value) walk(v, key);
        } else if (value !== null && typeof value === "object") {
          const record = value as Record<string, unknown>;
          const name = record["name"];
          if (
            key === "donors" &&
            typeof name === "string" &&
            !/^Synthetic [a-z]+ donor D\d{3}$/.test(name)
          )
            problems.push(`${file}: donor "${name}"`);
          if (
            key === "pilots" &&
            typeof name === "string" &&
            !isSyntheticPersonName(name)
          )
            problems.push(`${file}: pilot "${name}"`);
          for (const [k, v] of Object.entries(record)) walk(v, k);
        }
      };
      walk(parsed, "");
    }
    expect(problems).toEqual([]);
    // The check itself tells a real-looking name from a generated one.
    expect(isSyntheticPersonName("Tobias Ainsley")).toBe(false);
  });
  it.todo(
    "[TC-015] Given the published apps, then they are served only over HTTPS and send the agreed security headers",
  );

  it("[TC-026] Given the committed development data and the held-back manifest, then one third of each product is held back, no held-back record or id is in the repository, and the package marker appears in no data file", () => {
    const manifest = JSON.parse(
      read("data/synthetic/held-back-manifest.json"),
    ) as {
      scenariosPerProduct: number;
      custody: string;
      prepped: Manifest;
      sparewing: Manifest;
    };
    expect(manifest.custody).toContain("OD-036");
    for (const product of ["prepped", "sparewing"] as const) {
      const development = (
        JSON.parse(read(`data/synthetic/development/${product}.json`)) as {
          scenarios: { id: string }[];
        }
      ).scenarios;
      const held = manifest[product];
      expect(held.count).toBe(Math.round(manifest.scenariosPerProduct / 3));
      expect(development.length + held.count).toBe(
        manifest.scenariosPerProduct,
      );
      const heldIds = new Set(held.records.map((r) => r.id));
      const heldHashes = new Set(held.records.map((r) => r.sha256));
      const devSeal = sealManifest(development);
      expect(devSeal.records.filter((r) => heldIds.has(r.id))).toEqual([]);
      expect(devSeal.records.filter((r) => heldHashes.has(r.sha256))).toEqual(
        [],
      );
    }
    const dataFiles = execFileSync("git", ["ls-files", "-z", "data"], {
      cwd: root,
      encoding: "utf8",
    })
      .split("\0")
      .filter((f) => f !== "");
    expect(dataFiles.length).toBeGreaterThan(0);
    for (const file of dataFiles)
      expect(read(file), file).not.toContain("HELD-BACK CONFIRMATION SET");
  });
});
