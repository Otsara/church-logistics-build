import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseRuleFile } from "../src/rule-file.ts";

const verified = {
  id: "shelf-life",
  product: "prepped",
  title: "Minimum shelf life at arrival",
  status: "verified",
  source: {
    url: "https://example.org/guidance",
    verified_date: "2026-11-09",
    verified_by: "Synthetic Reviewer",
  },
  data: { minimum_months: 12 },
};

describe("rule files", () => {
  it("[ARC-004] accepts a verified file with a source link, verified date and verifier", () => {
    const result = parseRuleFile(verified);
    expect(result.ok).toBe(true);
  });

  it("[ARC-004] accepts a placeholder that has a source link but is not yet verified", () => {
    const result = parseRuleFile({
      ...verified,
      status: "placeholder",
      source: {
        url: "https://example.org/advisory",
        verified_date: null,
        verified_by: null,
      },
    });
    expect(result.ok).toBe(true);
  });

  it("[ARC-004] rejects a verified file without a verified date or verifier", () => {
    const result = parseRuleFile({
      ...verified,
      source: {
        url: "https://example.org/guidance",
        verified_date: null,
        verified_by: null,
      },
    });
    expect(result).toEqual({
      ok: false,
      errors: [
        "source: a verified rule file needs source.verified_date and source.verified_by",
      ],
    });
  });

  it("[ARC-004] rejects a missing source link, a bad date and unknown fields, listing each problem", () => {
    const result = parseRuleFile({
      ...verified,
      source: {
        url: "not a link",
        verified_date: "2026-02-30",
        verified_by: "Synthetic Reviewer",
      },
      extra: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(3);
    expect(result.errors.join("\n")).toMatch(/source\.url/);
    expect(result.errors.join("\n")).toMatch(/source\.verified_date/);
    expect(result.errors.join("\n")).toMatch(/extra/);
  });

  it("[ARC-004] reports a problem with the file as a whole when it is not an object", () => {
    const result = parseRuleFile("shelf-life");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/^\(file\): /);
  });

  it("[ARC-004] every JSON file in /rules is a valid rule file whose id matches its file name", () => {
    const rulesDir = join(import.meta.dirname, "../../../rules");
    const files = readdirSync(rulesDir, {
      recursive: true,
      encoding: "utf8",
    }).filter((name) => name.endsWith(".json"));
    for (const name of files) {
      const result = parseRuleFile(
        JSON.parse(readFileSync(join(rulesDir, name), "utf8")),
      );
      expect(result, name).toMatchObject({ ok: true });
      if (result.ok)
        expect(name.replace(/^.*\//, ""), name).toBe(`${result.file.id}.json`);
    }
  });
});

describe("rule file details", () => {
  it("[ARC-004] needs both a verified date and a verifier, not just one", () => {
    const dateOnly = parseRuleFile({
      ...verified,
      source: { ...verified.source, verified_by: null },
    });
    const verifierOnly = parseRuleFile({
      ...verified,
      source: { ...verified.source, verified_date: null },
    });
    expect(dateOnly.ok).toBe(false);
    expect(verifierOnly.ok).toBe(false);
  });

  it("[ARC-004] accepts lower-case kebab-case ids only, and each named product", () => {
    expect(parseRuleFile({ ...verified, id: "a-b-c" }).ok).toBe(true);
    for (const id of ["Shelf-life", "shelf-life!", "-shelf", "shelf-"]) {
      const result = parseRuleFile({ ...verified, id });
      expect(result, id).toEqual({
        ok: false,
        errors: ["id: must be lower-case kebab-case"],
      });
    }
    for (const product of ["prepped", "sparewing", "shared"]) {
      expect(parseRuleFile({ ...verified, product }).ok, product).toBe(true);
    }
    expect(parseRuleFile({ ...verified, product: "other" }).ok).toBe(false);
  });

  it("[ARC-004] explains a bad verified date in plain words", () => {
    const result = parseRuleFile({
      ...verified,
      source: { ...verified.source, verified_date: "2026-02-30" },
    });
    expect(result).toEqual({
      ok: false,
      errors: [
        "source.verified_date: must be a date-only ISO string (YYYY-MM-DD)",
      ],
    });
  });
});
