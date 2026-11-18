/**
 * Destination rule cards (ARC-004; SYS-004, SYS-120; safety-critical): what a destination asks of
 * a medicine shipment, one card per country in `rules/prepped/destination-<country>.json`. The AI
 * may state a requirement only by citing a card item (SYS-004), and code builds the checklist from
 * the card word for word (owner, 2026-11-16; ADR-039). For the demo every card is a synthetic
 * placeholder and every item is labelled so (OD-003, ADR-042). A card may instead apply to every
 * destination, such as the WHO donation guidelines. After the owner's review (REV-012, ADR-044): a
 * card's id matches its country, its items share one prefix, and no item claims an approval. Cards
 * are read from their text, so a key named twice is refused (ADR-034). Never throws.
 */
import { z } from "zod";
import { forbiddenClaims } from "../claims.ts";
import { readJsonText } from "../json-text.ts";
import { parseRuleFile } from "../rule-file.ts";

export const SYNTHETIC_CARD_LABEL =
  "Synthetic example for the demo: not a real import rule";

const itemSchema = z.strictObject({
  id: z.string().regex(/^[A-Z]{2,3}-\d{2}$/, "must be like HN-01"),
  requirement: z.string().trim().min(1),
  document: z.string().trim().min(1).nullable(),
  label: z.string().min(1).nullable(),
});

const dataSchema = z.strictObject({
  /** The destination, or null for a card that applies to every destination. */
  country: z.string().trim().min(1).nullable(),
  /** A synthetic example written for the demo, not a real rule (OD-003). */
  synthetic: z.boolean(),
  items: z.array(itemSchema).min(1),
});

export type CardItem = z.infer<typeof itemSchema>;

export interface DestinationCard {
  readonly id: string;
  /** The destination, or null for a card that applies to every destination. */
  readonly country: string | null;
  readonly status: "placeholder" | "verified";
  /** A synthetic example written for the demo, not a real rule (OD-003). */
  readonly synthetic: boolean;
  readonly sourceUrl: string;
  readonly items: readonly CardItem[];
}

export type DestinationCardResult =
  | { readonly ok: true; readonly card: DestinationCard }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Reads a destination card from its file's text, listing every problem. */
export function readDestinationCard(text: string): DestinationCardResult {
  const json = readJsonText(text);
  if (!json.ok) return json;
  const envelope = parseRuleFile(json.json);
  if (!envelope.ok) return envelope;
  const file = envelope.file;
  if (file.product !== "prepped") {
    return {
      ok: false,
      errors: ["a destination rule card must be a Prepped rule file"],
    };
  }
  const data = dataSchema.safeParse(file.data);
  if (!data.success) {
    return {
      ok: false,
      errors: data.error.issues.map(
        (issue) => `data.${issue.path.join(".")}: ${issue.message}`,
      ),
    };
  }
  const { country, synthetic, items } = data.data;
  const prefix = items[0]?.id.split("-")[0];
  const expectedId =
    country === null
      ? null
      : `destination-${country.toLowerCase().replace(/\s+/g, "-")}`;
  const errors = [
    ...(expectedId === null
      ? file.id.startsWith("destination-")
        ? [
            `the card applies to every destination, so its id must not start with destination- (${file.id})`,
          ]
        : []
      : file.id === expectedId
        ? []
        : [
            `the card's id ${file.id} does not match its country ${String(country)}: it must be ${expectedId}`,
          ]),
    ...items
      .filter(
        (item, i) => items.findIndex((other) => other.id === item.id) !== i,
      )
      .map((item) => `item ${item.id} is on the card more than once`),
    ...items
      .filter((item) => item.id.split("-")[0] !== prefix)
      .map(
        (item) =>
          `item ${item.id} does not share the card's prefix ${String(prefix)}`,
      ),
    ...items.flatMap((item) =>
      forbiddenClaims(`${item.requirement} ${item.document ?? ""}`).map(
        (claim) =>
          `item ${item.id} says "${claim}": a rule card never claims an approval`,
      ),
    ),
    ...(synthetic
      ? items
          .filter((item) => item.label !== SYNTHETIC_CARD_LABEL)
          .map(
            (item) =>
              `item ${item.id} is not labelled "${SYNTHETIC_CARD_LABEL}", as every item on a synthetic card must be`,
          )
      : file.status === "placeholder"
        ? items
            .filter((item) => item.label === null)
            .map(
              (item) =>
                `item ${item.id} has no label, as every item on a placeholder card must`,
            )
        : []),
  ];
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    card: {
      id: file.id,
      country,
      status: file.status,
      synthetic,
      sourceUrl: file.source.url,
      items,
    },
  };
}

/** The documents the card asks for, each with the card item that asks for it. */
export function requiredDocuments(
  card: DestinationCard,
): { readonly cardItemId: string; readonly name: string }[] {
  return card.items.flatMap((item) =>
    item.document === null
      ? []
      : [{ cardItemId: item.id, name: item.document }],
  );
}

/**
 * The checklist for the paperwork, built by code from the card word for word: a heading naming
 * the card, then every item with its id, each document as prepared or missing (TC-105), and the
 * item's label where it has one.
 */
export function checklist(
  card: DestinationCard,
  preparedItemIds: ReadonlySet<string>,
): string[] {
  const heading = `Checklist from rule card ${card.id} (${card.country ?? "every destination"}).`;
  return [
    card.synthetic ? `${heading} ${SYNTHETIC_CARD_LABEL}.` : heading,
    ...card.items.map((item) =>
      [
        `${item.id}: ${item.requirement}`,
        ...(item.document === null
          ? []
          : [
              `${item.document}: ${preparedItemIds.has(item.id) ? "prepared" : "missing"}.`,
            ]),
        ...(item.label === null ? [] : [`(${item.label})`]),
      ].join(" "),
    ),
  ];
}
