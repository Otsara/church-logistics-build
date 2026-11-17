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

const card = (overrides: Record<string, unknown> = {}, items?: unknown[]) =>
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
        `item TL-01 is not labelled "${SYNTHETIC_CARD_LABEL}", as every item on a placeholder card must be`,
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
    for (const id of ["XHN-01", "HN-012", "hn-01"]) {
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
      ),
    );
    expect(checklist(verified, new Set())).toEqual([
      "Checklist from rule card destination-testland (Testland).",
      "TL-01: Controlled medicines are not shipped.",
    ]);
  });
});
