import { describe, expect, it } from "vitest";
import {
  canonicalJson,
  sealManifest,
  splitHeldBack,
  verifyManifest,
} from "../src/split.ts";

const records = Array.from({ length: 30 }, (_, i) => ({
  id: `R${String(i).padStart(2, "0")}`,
  value: i,
}));

describe("held-back confirmation set", () => {
  it("[TC-020] holds back one third, keeps the rest for development, never both, and repeats for the same seed", () => {
    const split = splitHeldBack(records, 2026);
    expect(split.heldBack).toHaveLength(10);
    expect(split.development).toHaveLength(20);
    const held = new Set(split.heldBack.map((r) => r.id));
    expect(split.development.some((r) => held.has(r.id))).toBe(false);
    expect(splitHeldBack(records, 2026)).toEqual(split);
    expect(
      splitHeldBack([...records].reverse(), 2026)
        .heldBack.map((r) => r.id)
        .sort(),
    ).toEqual([...held].sort());
    expect(splitHeldBack(records, 2027).heldBack).not.toEqual(split.heldBack);
  });

  it("[TC-021] the seal passes unchanged records and names every change, addition and removal", () => {
    const held = splitHeldBack(records, 2026).heldBack;
    const manifest = sealManifest(held);
    expect(manifest.count).toBe(10);
    expect(verifyManifest(held, manifest)).toEqual([]);
    const [first, second, ...rest] = held;
    if (first === undefined || second === undefined)
      throw new Error("test needs records");
    expect(
      verifyManifest([{ ...first, value: -1 }, second, ...rest], manifest),
    ).toEqual([`changed record ${first.id}`]);
    expect(verifyManifest([second, ...rest], manifest)).toEqual([
      `missing record ${first.id}`,
    ]);
    expect(
      verifyManifest([...held, { id: "NEW", value: 0 }], manifest),
    ).toEqual(["added record NEW"]);
    expect(
      verifyManifest(held, { ...manifest, setSha256: "0".repeat(64) }),
    ).toEqual(["set fingerprint differs"]);
  });

  it("[DAT-002] rejects duplicate ids and handles an empty set", () => {
    expect(() => splitHeldBack([{ id: "A" }, { id: "A" }], 1)).toThrow(
      "Duplicate record id: A",
    );
    expect(() => sealManifest([{ id: "A" }, { id: "A" }])).toThrow("Duplicate");
    expect(splitHeldBack([], 1)).toEqual({ development: [], heldBack: [] });
    expect(verifyManifest([], sealManifest([]))).toEqual([]);
  });

  it("[DAT-002] fingerprints do not depend on key order, and undefined fields are ignored", () => {
    expect(
      canonicalJson({ b: 1, a: [1, { d: null, c: "x" }], e: undefined }),
    ).toBe('{"a":[1,{"c":"x","d":null}],"b":1}');
    expect(canonicalJson(undefined)).toBe("null");
    const forwards = { id: "A", x: 1, y: 2 };
    const backwards = { y: 2, x: 1, id: "A" };
    expect(sealManifest([forwards]).setSha256).toBe(
      sealManifest([backwards]).setSha256,
    );
  });
});
