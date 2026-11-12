/**
 * The shelf-life rule file, `rules/prepped/shelf-life.json` (SYS-102, ARC-004; safety-critical):
 * the minimum days of shelf life a lot must have left on the trip's arrival date.
 */
import { z } from "zod";
import { parseRuleFile } from "../rule-file.ts";

const dataSchema = z.strictObject({
  minimum_days_at_arrival: z.number().int().positive(),
});

export type ShelfLifeReading =
  | {
      readonly ok: true;
      readonly minimumDaysAtArrival: number;
      readonly status: "placeholder" | "verified";
      readonly sourceUrl: string;
    }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Reads parsed JSON from the shelf-life rule file. Never throws; every problem is listed. */
export function readShelfLifeRules(json: unknown): ShelfLifeReading {
  const envelope = parseRuleFile(json);
  if (!envelope.ok) return envelope;
  const { file } = envelope;
  if (file.id !== "shelf-life") {
    return { ok: false, errors: ['id: must be "shelf-life"'] };
  }
  if (file.product !== "prepped") {
    return { ok: false, errors: ['product: must be "prepped"'] };
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
  return {
    ok: true,
    minimumDaysAtArrival: data.data.minimum_days_at_arrival,
    status: file.status,
    sourceUrl: file.source.url,
  };
}
