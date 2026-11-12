// Builds the stamped review copies of the controlled documents and ADRs (CLAUDE.md, review copies).
// Usage: node tools/review-copies.mjs "<review point>" <output.html>
// The output is published to the review-copy page; the repository governs, never the copy.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const ID =
  /\b((?:OD|IU|UN|SYS|HAZ|RC|ARC|AIC|SEC|DAT|TC|SOUP|SUB|IT|ADR|DOC|REV)-\d{3})\b/g;

const esc = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Splits YAML-style front matter (key: value lines) from the body. */
export function frontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (m === null) throw new Error("missing front matter");
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: text.slice(m[0].length) };
}

/** Markdown to HTML; item headings get anchors named after their ID, which are added to `defined`. */
export function renderBody(docId, body, defined) {
  let html = marked.parse(
    body.replace(/<!-- (BEGIN|END) GENERATED -->\n?/g, ""),
    { gfm: true },
  );
  html = html.replace(
    /<h3>((?:[A-Z]+)-\d{3})( [^<]*)?<\/h3>/g,
    (_, id, rest = "") => {
      defined.add(id);
      return `<h3 class="item" id="${id}"><span class="item-id">${id}</span>${rest}</h3>`;
    },
  );
  html = html.replace(/<h([12])>([^<]*)<\/h\1>/g, (_, level, text) =>
    level === "1"
      ? ""
      : `<h2 id="${docId}-${text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}">${text}</h2>`,
  );
  return html
    .replace(/<table>/g, '<div class="table-wrap"><table>')
    .replace(/<\/table>/g, "</table></div>");
}

/** Links every defined ID to its definition, outside tags, links and code. */
export function linkIds(html, defined) {
  let inA = 0;
  let inCode = 0;
  return html
    .split(/(<[^>]+>)/)
    .map((part) => {
      if (part.startsWith("<")) {
        if (/^<a[\s>]/.test(part)) inA += 1;
        if (/^<\/a>/.test(part)) inA -= 1;
        if (/^<(code|pre)[\s>]/.test(part)) inCode += 1;
        if (/^<\/(code|pre)>/.test(part)) inCode -= 1;
        return part;
      }
      if (inA || inCode) return part;
      return part.replace(ID, (id) =>
        defined.has(id) ? `<a class="ref" href="#${id}">${id}</a>` : id,
      );
    })
    .join("");
}

/** The whole page for the documents under `root`, stamped with the given commit details. */
export function buildPage({
  root,
  reviewPoint,
  commit,
  branch,
  committed,
  css,
}) {
  const defined = new Set();
  const sections = [];
  const read = (dir, pattern, kind) => {
    for (const f of readdirSync(join(root, dir))
      .filter((n) => pattern.test(n))
      .sort()) {
      const { meta, body } = frontMatter(
        readFileSync(join(root, dir, f), "utf8"),
      );
      defined.add(meta.id);
      sections.push({
        kind,
        meta,
        path: `${dir}/${f}`,
        html: renderBody(meta.id, body, defined),
      });
    }
  };
  read("docs", /^DOC-\d{3}-.*\.md$/, "doc");
  read("docs/adr", /^ADR-\d{3}-.*\.md$/, "adr");
  read("docs/reviews", /^REV-\d{3}-.*\.md$/, "rev");

  const stamp = (s) => {
    const m = s.meta;
    const version = s.kind === "doc" ? `v${m.version}` : (m.status ?? "record");
    const status =
      s.kind === "doc"
        ? m.status
        : s.kind === "adr"
          ? `decided ${m.decided ?? "–"}`
          : `dated ${m.date ?? "–"}`;
    return `<div class="stamp" role="note" aria-label="Review copy stamp">
  <span class="stamp-label">Uncontrolled review copy</span>
  <span class="stamp-id">${esc(m.id)}</span>
  <span>${esc(version)}</span>
  <span>${esc(status)}</span>
  <span>commit <code>${esc(commit)}</code></span>
  <span class="stamp-path"><code>${esc(s.path)}</code></span>
</div>`;
  };
  const navItem = (s) =>
    `<li><a href="#${s.meta.id}"><span class="nav-id">${esc(s.meta.id)}</span><span class="nav-title">${esc(s.meta.title)}</span><span class="nav-ver">${s.kind === "doc" ? `v${esc(s.meta.version)}` : ""}</span></a></li>`;
  const group = (kind, label) =>
    `<p class="nav-group">${label}</p>\n      <ol class="nav-list">${sections
      .filter((s) => s.kind === kind)
      .map(navItem)
      .join("")}</ol>`;
  const body = sections
    .map(
      (
        s,
      ) => `<article class="doc" id="${s.meta.id}" aria-labelledby="${s.meta.id}-title">
  <header class="doc-head">
    <p class="doc-id">${esc(s.meta.id)}</p>
    <h1 id="${s.meta.id}-title">${esc(s.meta.title)}</h1>
    ${stamp(s)}
  </header>
  <div class="doc-body">${s.html}</div>
</article>`,
    )
    .join("\n");
  const page = `<title>Prepped and SpareWing Documents</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Serif:wght@500;600&display=swap">
<style>${css}</style>
<div class="shell">
  <aside class="index" aria-label="Documents">
    <p class="index-kicker">Controlled document set</p>
    <p class="index-title">Prepped and SpareWing</p>
    <dl class="index-meta">
      <div><dt>Commit</dt><dd><code>${esc(commit)}</code> · ${esc(committed)}</dd></div>
      <div><dt>Branch</dt><dd><code>${esc(branch)}</code></dd></div>
      <div><dt>Review point</dt><dd>${esc(reviewPoint)}</dd></div>
    </dl>
    <p class="index-note">The repository governs. These copies are uncontrolled and are republished at each review point.</p>
    <nav>
      ${group("doc", "Documents")}
      ${group("adr", "Decision records")}
      ${group("rev", "Review records")}
    </nav>
  </aside>
  <main class="docs">${body}</main>
</div>`;
  return { html: linkIds(page, defined), sections: sections.length };
}

// Command line: refuses to stamp copies that do not match a commit.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [reviewPoint, out] = process.argv.slice(2);
  if (reviewPoint === undefined || out === undefined)
    throw new Error(
      'Usage: node tools/review-copies.mjs "<review point>" <output.html>',
    );
  const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const dirty = git("status", "--porcelain", "--", "docs");
  if (dirty)
    throw new Error(
      `docs/ has uncommitted changes; review copies must match a commit:\n${dirty}`,
    );
  const { html, sections } = buildPage({
    root,
    reviewPoint,
    commit: git("rev-parse", "--short", "HEAD"),
    branch: git("rev-parse", "--abbrev-ref", "HEAD"),
    committed: git("log", "-1", "--format=%cs"),
    css: readFileSync(new URL("./review-copies.css", import.meta.url), "utf8"),
  });
  writeFileSync(out, html);
  process.stdout.write(`${String(sections)} sections written to ${out}\n`);
}
