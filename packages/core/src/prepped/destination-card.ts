/**
 * Destination rule cards (ARC-004; SYS-004, SYS-120; safety-critical): what a destination asks of
 * a medicine shipment, one card per country in `rules/prepped/destination-<country>.json`. The AI
 * may state a requirement only by citing a card item (SYS-004), and code builds the checklist from
 * the card word for word (owner, 2026-11-16; ADR-039). For the demo every card is a synthetic
 * placeholder and every item is labelled so (OD-003, ADR-042). Cards are read from their text, so
 * a key named twice is refused (ADR-034). Never throws.
 */
import { z } from "zod";
import { readJsonText } from "../json-text.ts";
import { parseRuleFile } from "../rule-file.ts";

export const SYNTHETIC_CARD_LABEL =
  "Synthetic example for the demo: not a real import rule";

const itemSchema = z.strictObject({
  id: z.string().regex(/^[A-Z]{2}-\d{2}$/, "must be like HN-01"),
  requirement: z.string().trim().min(1),
  document: z.string().trim().min(1).nullable(),
  label: z.string().min(1).nullable(),
});

const dataSchema = z.strictObject({
  country: z.string().trim().min(1),
  items: z.array(itemSchema).min(1),
});

export type CardItem = z.infer<typeof itemSchema>;

export interface DestinationCard {
  readonly id: string;
  readonly country: string;
  readonly status: "placeholder" | "verified";
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
  const items = data.data.items;
  const errors = [
    ...items
      .filter(
        (item, i) => items.findIndex((other) => other.id === item.id) !== i,
      )
      .map((item) => `item ${item.id} is on the card more than once`),
    ...(file.status === "placeholder"
      ? items
          .filter((item) => item.label !== SYNTHETIC_CARD_LABEL)
          .map(
            (item) =>
              `item ${item.id} is not labelled "${SYNTHETIC_CARD_LABEL}", as every item on a placeholder card must be`,
          )
      : []),
  ];
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    card: {
      id: file.id,
      country: data.data.country,
      status: file.status,
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
  const heading = `Checklist from rule card ${card.id} (${card.country}).`;
  return [
    card.status === "placeholder"
      ? `${heading} ${SYNTHETIC_CARD_LABEL}.`
      : heading,
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
