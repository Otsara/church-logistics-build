// The AI gateway upload (ARC-014): the same tested code, with import paths kept inside the folder.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SOURCES, uploadFiles } from "./gateway-upload.mjs";

test("the upload holds the wiring, its import map and the gateway code, unchanged apart from import paths", () => {
  const files = uploadFiles();
  assert.deepEqual(
    files.map((f) => f.name),
    ["index.ts", "deno.json", ...Object.keys(SOURCES)],
  );
  const byName = new Map(files.map((f) => [f.name, f.content]));
  for (const [name, path] of Object.entries(SOURCES)) {
    assert.equal(byName.get(name), readFileSync(path, "utf8"), name);
  }
  const index = byName.get("index.ts");
  assert.match(index, /from "\.\/ai\/gateway\.ts"/);
  assert.match(index, /from "\.\/ai\/anthropic\.ts"/);
  assert.doesNotMatch(index, /\.\.\//);
  const deno = JSON.parse(byName.get("deno.json"));
  assert.equal(deno.imports["@church-logistics/core"], "./core/audit.ts");
  assert.equal(
    deno.imports["@anthropic-ai/sdk"],
    "npm:@anthropic-ai/sdk@1.3.0",
  );
});
