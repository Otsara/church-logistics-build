// The rules folder the screens import (ARC-003, SEC-001; ADR-046, ADR-048): exact, stamped copies
// of the source files the screens need, with no server-only code, and a check that catches any edit.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  buildFiles,
  compareFolder,
  reachableFiles,
  writeFolder,
} from "./rules-bundle.mjs";

const files = buildFiles("test-sha");

test("[TC-031, ARC-003] the folder holds the core rules, the AI steps and their checks, the rule files as text, an index and a manifest", () => {
  for (const path of [
    "index.ts",
    "rule-files.ts",
    "manifest.json",
    "core/index.ts",
    "core/prepped/floor.ts",
    "core/prepped/destination-card.ts",
    "core/sparewing/rank.ts",
    "core/claims.ts",
    "ai/client.ts",
    "ai/runner.ts",
    "ai/gateway-client.ts",
    "ai/steps/cover-letter.ts",
  ]) {
    assert.ok(files.has(path), path);
  }
  const rules = files.get("rule-files.ts");
  for (const name of [
    "prepped/shelf-life.json",
    "prepped/who-donation-guidelines.json",
    "prepped/destination-honduras.json",
    "sparewing/cover-bases.json",
  ]) {
    assert.match(rules, new RegExp(`"${name}"`), name);
  }
});

test("[TC-031, ARC-003, ARC-019] the folder holds the offline store under the name store, reaching core by a relative path and importing no network library", () => {
  for (const path of [
    "store/index.ts",
    "store/sync.ts",
    "store/engine.ts",
    "store/device.ts",
    "store/supabase.ts",
  ]) {
    assert.ok(files.has(path), path);
  }
  assert.match(
    files.get("index.ts"),
    /export \* as store from "\.\/store\/index\.ts";/,
  );
  assert.match(files.get("store/sync.ts"), /from "\.\.\/core\/index\.ts"/);
  for (const [path, text] of files) {
    if (path.startsWith("store/")) {
      assert.doesNotMatch(text, /@supabase\/supabase-js|fake-indexeddb/, path);
    }
  }
});

test("[TC-031, SEC-001] no server-only code reaches the screens: not the call to the AI service, not the gateway handler", () => {
  for (const path of files.keys()) {
    assert.doesNotMatch(path, /anthropic|ai\/gateway\.ts|ai\/index\.ts/, path);
  }
  for (const [path, text] of files) {
    assert.doesNotMatch(text, /@anthropic-ai\/sdk/, path);
  }
  assert.ok(reachableFiles().every((f) => !f.endsWith("anthropic.ts")));
});

test("[TC-031, ARC-003] every source file is copied exactly, stamped as generated, with the core package reached by a relative path", () => {
  const cover = files.get("ai/steps/cover-letter.ts");
  assert.match(
    cover,
    /^\/\/ Generated from Otsara\/church-logistics-build test-sha, packages\/ai\/src\/steps\/cover-letter\.ts/,
  );
  assert.match(cover, /Do not edit/);
  assert.match(cover, /from "\.\.\/\.\.\/core\/index\.ts"/);
  assert.doesNotMatch(cover, /@church-logistics\/core/);
  const floor = files.get("core/prepped/floor.ts");
  const source = readFileSync("packages/core/src/prepped/floor.ts", "utf8");
  assert.ok(floor.endsWith(source));
  const manifest = JSON.parse(files.get("manifest.json"));
  assert.equal(manifest.commit, "test-sha");
  assert.equal(Object.keys(manifest.files).length, files.size - 1);
});

test("[TC-031, ARC-003] a freshly written folder passes the check; an edited, missing or extra file fails it", () => {
  const dir = mkdtempSync(join(tmpdir(), "rules-"));
  try {
    writeFolder(dir, buildFiles());
    assert.deepEqual(compareFolder(dir), []);
    writeFileSync(join(dir, "core/prepped/floor.ts"), "// edited\n");
    writeFileSync(join(dir, "extra.ts"), "export {};\n");
    rmSync(join(dir, "core/claims.ts"));
    assert.deepEqual(compareFolder(dir).sort(), [
      "differs: core/prepped/floor.ts",
      "missing: core/claims.ts",
      "not generated: extra.ts",
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[TC-031, ARC-003] the folder type-checks on its own, with only zod from outside it", () => {
  const dir = mkdtempSync(join(process.cwd(), ".rules-check-"));
  try {
    writeFolder(join(dir, "rules"), buildFiles());
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify({
        extends: "../tsconfig.json",
        // As the screens will have it: the browser's library, and zod installed.
        compilerOptions: {
          noEmit: true,
          types: [],
          lib: ["ES2022", "DOM"],
          paths: { zod: ["../packages/core/node_modules/zod"] },
        },
        include: ["rules/**/*.ts"],
      }),
    );
    execFileSync("npx", ["tsc", "-p", join(dir, "tsconfig.json")], {
      stdio: "pipe",
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
