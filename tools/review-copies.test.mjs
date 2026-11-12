import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildPage,
  frontMatter,
  linkIds,
  renderBody,
} from "./review-copies.mjs";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

test("front matter is split from the body, and a file without it is refused", () => {
  const { meta, body } = frontMatter(
    "---\nid: DOC-001\nversion: 0.1\n---\n# Title\n",
  );
  assert.deepEqual(meta, { id: "DOC-001", version: "0.1" });
  assert.equal(body, "# Title\n");
  assert.throws(
    () => frontMatter("# No front matter\n"),
    /missing front matter/,
  );
});

test("item headings get anchors, and only defined IDs are linked outside code and links", () => {
  const defined = new Set();
  const html = renderBody(
    "DOC-020",
    "# DOC-020\n\n### SYS-101 Rule\n\nSee SYS-101 and SYS-999.\n",
    defined,
  );
  assert.ok(defined.has("SYS-101"));
  assert.match(html, /<h3 class="item" id="SYS-101">/);
  const linked = linkIds(
    `${html}<code>SYS-101</code><a href="x">SYS-101</a>`,
    defined,
  );
  assert.match(
    linked,
    /See <a class="ref" href="#SYS-101">SYS-101<\/a> and SYS-999\./,
  );
  assert.match(linked, /<code>SYS-101<\/code>/);
  assert.match(linked, /<a href="x">SYS-101<\/a>/);
});

test("the page stamps every document, ADR and review record with the commit and review point", () => {
  const { html, sections } = buildPage({
    root,
    reviewPoint: "Test review point",
    commit: "abc1234",
    branch: "test",
    committed: "2026-11-12",
    css: "",
  });
  assert.ok(sections > 15);
  for (const id of ["DOC-000", "DOC-100", "ADR-001", "REV-001"])
    assert.match(
      html,
      new RegExp(
        `<span class="stamp-id">(<a class="ref" href="#${id}">)?${id}(</a>)?</span>`,
      ),
    );
  assert.match(html, /commit <code>abc1234<\/code>/);
  assert.match(html, /<dd>Test review point<\/dd>/);
  assert.match(html, /Review records/);
});
