// Repository policy tests from DOC-070: rules that hold for the whole repository, not one package.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sealManifest, type Manifest } from "../../synth/src/split.ts";

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

  it.todo(
    "[TC-013] Given the built front-end bundles and the repository, then no AI service key appears, and the apps reach the AI only through the server-side gateway",
  );
  it.todo(
    "[TC-014] Given every fixture, golden example and demo data file, then every person, donor and pilot name is synthetic and every data file is marked synthetic",
  );
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
