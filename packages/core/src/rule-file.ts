/**
 * Rule files in /rules (F-4): JSON that a pharmacist or mechanic can read and correct.
 * Every file cites a source link. A verified file also records the verified date and who
 * verified it; a placeholder says so, and is not to be relied on (CLAUDE.md, definition of done).
 */
import { z } from "zod";
import { isIsoDate } from "./dates.ts";

const isoDate = z
  .string()
  .refine(isIsoDate, "must be a date-only ISO string (YYYY-MM-DD)");

const source = z.strictObject({
  url: z.url(),
  verified_date: isoDate.nullable(),
  verified_by: z.string().min(1).nullable(),
});

export const ruleFileSchema = z
  .strictObject({
    id: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be lower-case kebab-case"),
    product: z.enum(["prepped", "sparewing", "shared"]),
    title: z.string().min(1),
    status: z.enum(["placeholder", "verified"]),
    source,
    notes: z.string().optional(),
    data: z.unknown(),
  })
  .refine(
    (file) =>
      file.status === "placeholder" ||
      (file.source.verified_date !== null && file.source.verified_by !== null),
    {
      message:
        "a verified rule file needs source.verified_date and source.verified_by",
      path: ["source"],
    },
  );

/** A validated rule file. Dates are narrowed to IsoDate by the schema's type guard. */
export type RuleFile = z.infer<typeof ruleFileSchema>;

export type RuleFileResult =
  | { readonly ok: true; readonly file: RuleFile }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Validates parsed JSON from a rule file. Never throws; every problem is listed. */
export function parseRuleFile(json: unknown): RuleFileResult {
  const result = ruleFileSchema.safeParse(json);
  if (result.success) {
    return { ok: true, file: result.data };
  }
  return {
    ok: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join(".") || "(file)"}: ${issue.message}`,
    ),
  };
}
