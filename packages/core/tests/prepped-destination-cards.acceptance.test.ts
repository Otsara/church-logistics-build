// Destination rule cards (ARC-004; SYS-004, SYS-120): one card per destination, read from its
// text; for the demo every card is a synthetic placeholder and every item says so (owner,
// 2026-11-16; ADR-039, ADR-042). Code builds the checklist from the card, word for word.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SYNTHETIC_CARD_LABEL,
  checklist,
  readDestinationCard,
  requiredDocuments,
  type DestinationCard,
} from "../src/prepped/destination-card.ts";

const rulesDir = join(import.meta.dirname, "../../../rules/prepped");
const readCard = (country: string) =>
  readDestinationCard(
    readFileSync(join(rulesDir, `destination-${country}.json`), "utf8"),
  );

const card = (
  overrides: Record<string, unknown> = {},
  items?: unknown[],
  data: Record<string, unknown> = {},
) =>
  JSON.stringify({
    id: "destination-testland",
    product: "prepped",
    title: "Destination rule card: Testland (synthetic example)",
    status: "placeholder",
    source: {
      url: "https://example.org/synthetic/destination-testland",
      verified_date: null,
      verified_by: null,
    },
    data: {
      country: "Testland",
      synthetic: true,
      items: items ?? [
        {
          id: "TL-01",
          requirement: "An import permit is prepared before shipping.",
          document: "Import permit",
          label: SYNTHETIC_CARD_LABEL,
        },
        {
          id: "TL-02",
          requirement: "Controlled medicines are not shipped.",
          document: null,
          label: SYNTHETIC_CARD_LABEL,
        },
      ],
      ...data,
    },
    ...overrides,
  });

const read = (text: string): DestinationCard => {
  const result = readDestinationCard(text);
  if (!result.ok) throw new Error(result.errors.join("; "));
  return result.card;
};

describe("Destination rule cards (SYS-120)", () => {
  it("[TC-138] Given the four destination cards, then each reads as a placeholder whose every item is labelled a synthetic example", () => {
    expect(SYNTHETIC_CARD_LABEL).toBe(
      "Synthetic example for the demo: not a real import rule",
    );
    for (const [country, name, prefix] of [
      ["honduras", "Honduras", "HN"],
      ["ethiopia", "Ethiopia", "ET"],
      ["nigeria", "Nigeria", "NG"],
      ["philippines", "Philippines", "PH"],
    ] as const) {
      const result = readCard(country);
      expect(result, country).toMatchObject({
        ok: true,
        card: {
          id: `destination-${country}`,
          country: name,
          status: "placeholder",
        },
      });
      if (!result.ok) continue;
      expect(result.card.sourceUrl).toMatch(
        /^https:\/\/example\.org\/synthetic\//,
      );
      expect(result.card.items.length, country).toBeGreaterThan(0);
      for (const item of result.card.items) {
        expect(item.id, country).toMatch(new RegExp(`^${prefix}-\\d{2}$`));
        expect(item.label, item.id).toBe(SYNTHETIC_CARD_LABEL);
      }
      expect(
        requiredDocuments(result.card).map((d) => d.name),
        country,
      ).toContain("Import permit");
    }
  });

  it("[TC-138] Given a placeholder card with an item not labelled a synthetic example, then the card is refused", () => {
    expect(
      readDestinationCard(
        card({}, [
          {
            id: "TL-01",
            requirement: "An import permit is prepared before shipping.",
            document: "Import permit",
            label: null,
          },
        ]),
      ),
    ).toEqual({
      ok: false,
      errors: [
        `item TL-01 is not labelled "${SYNTHETIC_CARD_LABEL}", as every item on a synthetic card must be`,
      ],
    });
  });

  it("[TC-138] Given a verified card, then its items need no synthetic label", () => {
    const verified = read(
      card(
        {
          status: "verified",
          source: {
            url: "https://example.org/synthetic/destination-testland",
            verified_date: "2026-11-17",
            verified_by: "Synthetic Reviewer",
          },
        },
        [
          {
            id: "TL-01",
            requirement: "An import permit is prepared before shipping.",
            document: "Import permit",
            label: null,
          },
        ],
        { synthetic: false },
      ),
    );
    expect(verified.status).toBe("verified");
    expect(verified.items[0]?.label).toBeNull();
  });

  it("[TC-138] Given a card for another product, an item named twice, a badly formed item or a key named twice, then it is refused, listing each problem", () => {
    expect(readDestinationCard(card({ product: "sparewing" }))).toEqual({
      ok: false,
      errors: ["a destination rule card must be a Prepped rule file"],
    });
    const twice = {
      id: "TL-01",
      requirement: "An import permit is prepared before shipping.",
      document: "Import permit",
      label: SYNTHETIC_CARD_LABEL,
    };
    expect(readDestinationCard(card({}, [twice, twice]))).toEqual({
      ok: false,
      errors: ["item TL-01 is on the card more than once"],
    });
    const bad = readDestinationCard(
      card({}, [{ id: "tl1", requirement: "", document: 3, label: "x" }]),
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.errors.join("\n")).toMatch(/data\.items\.0\.id/);
      expect(bad.errors.join("\n")).toMatch(/data\.items\.0\.requirement/);
      expect(bad.errors.join("\n")).toMatch(/data\.items\.0\.document/);
    }
    for (const id of ["ABCD-01", "HN-012", "hn-01"]) {
      expect(readDestinationCard(card({}, [{ ...twice, id }])), id).toEqual({
        ok: false,
        errors: ["data.items.0.id: must be like HN-01"],
      });
    }
    // Blank text is refused: a requirement, a document name or a country of only spaces.
    expect(
      readDestinationCard(
        card({}, [{ ...twice, requirement: "  ", document: "  " }]),
      ),
    ).toMatchObject({
      ok: false,
      errors: [
        expect.stringMatching(/^data\.items\.0\.requirement/),
        expect.stringMatching(/^data\.items\.0\.document/),
      ],
    });
    expect(
      readDestinationCard(
        card().replace('"country":"Testland"', '"country":"  "'),
      ),
    ).toMatchObject({
      ok: false,
      errors: [expect.stringMatching(/^data\.country/)],
    });
    expect(readDestinationCard(card({}, []))).toMatchObject({ ok: false });
    expect(readDestinationCard(card({ status: "draft" }))).toMatchObject({
      ok: false,
    });
    expect(
      readDestinationCard(
        card().replace(
          '"country":"Testland"',
          '"country":"Testland","country":"Other"',
        ),
      ),
    ).toMatchObject({ ok: false });
    expect(readDestinationCard("not json")).toMatchObject({ ok: false });
  });

  it("[TC-105, AIC-102] Given a card and the documents prepared, then the checklist lists every item word for word with its id and the card, and each document as prepared or missing", () => {
    const testland = read(card());
    expect(requiredDocuments(testland)).toEqual([
      { cardItemId: "TL-01", name: "Import permit" },
    ]);
    expect(checklist(testland, new Set())).toEqual([
      `Checklist from rule card destination-testland (Testland). ${SYNTHETIC_CARD_LABEL}.`,
      `TL-01: An import permit is prepared before shipping. Import permit: missing. (${SYNTHETIC_CARD_LABEL})`,
      `TL-02: Controlled medicines are not shipped. (${SYNTHETIC_CARD_LABEL})`,
    ]);
    expect(checklist(testland, new Set(["TL-01"]))[1]).toBe(
      `TL-01: An import permit is prepared before shipping. Import permit: prepared. (${SYNTHETIC_CARD_LABEL})`,
    );
    const verified = read(
      card(
        {
          status: "verified",
          source: {
            url: "https://example.org/synthetic/destination-testland",
            verified_date: "2026-11-17",
            verified_by: "Synthetic Reviewer",
          },
        },
        [
          {
            id: "TL-01",
            requirement: "Controlled medicines are not shipped.",
            document: null,
            label: null,
          },
        ],
        { synthetic: false },
      ),
    );
    expect(checklist(verified, new Set())).toEqual([
      "Checklist from rule card destination-testland (Testland).",
      "TL-01: Controlled medicines are not shipped.",
    ]);
  });
});

describe("Rule cards after the owner's review (REV-012 part 1)", () => {
  const item = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    requirement: "An import permit is prepared before shipping.",
    document: "Import permit",
    label: SYNTHETIC_CARD_LABEL,
    ...extra,
  });

  it("[TC-138] Given a card whose id does not match its country, then it is refused; a country of several words is written with hyphens", () => {
    expect(
      readDestinationCard(card({}, undefined, { country: "Nigeria" })),
    ).toEqual({
      ok: false,
      errors: [
        "the card's id destination-testland does not match its country Nigeria: it must be destination-nigeria",
      ],
    });
    expect(
      readDestinationCard(
        card({ id: "destination-south-testland" }, undefined, {
          country: "South  Testland",
        }),
      ).ok,
    ).toBe(true);
  });

  it("[TC-138] Given an item whose prefix differs from the card's first item, then it is refused", () => {
    expect(
      readDestinationCard(card({}, [item("TL-01"), item("NG-02")])),
    ).toEqual({
      ok: false,
      errors: ["item NG-02 does not share the card's prefix TL"],
    });
  });

  it("[SYS-309, TC-138] Given a card whose item or document makes a forbidden claim, then it is refused", () => {
    expect(
      readDestinationCard(
        card({}, [
          item("TL-01", {
            requirement: "An approved import permit is prepared.",
            document: "Clearance certificate",
          }),
        ]),
      ),
    ).toEqual({
      ok: false,
      errors: [
        'item TL-01 says "approved": a rule card never claims an approval',
        'item TL-01 says "clearance": a rule card never claims an approval',
      ],
    });
  });

  it("[TC-138] Given a card for every destination, then its id must not name a destination, and on a placeholder each item still needs a label", () => {
    const general = { country: null, synthetic: false };
    expect(readDestinationCard(card({}, undefined, general))).toEqual({
      ok: false,
      errors: [
        "the card applies to every destination, so its id must not start with destination- (destination-testland)",
      ],
    });
    expect(
      readDestinationCard(
        card(
          { id: "testland-guidelines" },
          [item("TL-01", { label: null })],
          general,
        ),
      ),
    ).toEqual({
      ok: false,
      errors: [
        "item TL-01 has no label, as every item on a placeholder card must",
      ],
    });
    const ok = read(card({ id: "testland-guidelines" }, undefined, general));
    expect(ok.country).toBeNull();
    expect(checklist(ok, new Set())[0]).toBe(
      "Checklist from rule card testland-guidelines (every destination).",
    );
  });

  it("[TC-138] Given the WHO donation guidelines card, then it applies to every destination, cites the source's articles, and every item says it is not yet verified", () => {
    const result = readDestinationCard(
      readFileSync(join(rulesDir, "who-donation-guidelines.json"), "utf8"),
    );
    expect(result).toMatchObject({
      ok: true,
      card: {
        id: "who-donation-guidelines",
        country: null,
        status: "placeholder",
        sourceUrl: "https://www.who.int/publications/i/item/9789241501989",
      },
    });
    if (!result.ok) return;
    expect(result.card.items.length).toBeGreaterThanOrEqual(9);
    for (const each of result.card.items) {
      expect(each.id).toMatch(/^WHO-\d{2}$/);
      expect(each.requirement, each.id).toMatch(
        /\((?:articles? \d+|section 4)/,
      );
      expect(each.label, each.id).toMatch(/not yet verified/);
    }
  });
});
