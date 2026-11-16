/**
 * SpareWing's two rule files (ARC-004, ARC-301; safety-critical): the pilot ratings each aircraft
 * type requires (`rules/sparewing/aircraft-type-ratings.json`, SYS-303) and the bases able to
 * cover each community's flights (`rules/sparewing/cover-bases.json`, SYS-307, ADR-015). Both are
 * placeholders derived from the synthetic data until a program supplies its own (OD-005). Lookups
 * use maps, so a name such as "constructor" is never mistaken for an entry. The readers take the
 * file's text, so a type or community named twice is refused rather than silently replaced, and
 * aircraft types are matched ignoring leading and trailing spaces and letter case (owner,
 * 2026-11-16; ADR-034).
 */
import { z } from "zod";
import { readJsonText } from "../json-text.ts";
import { parseRuleFile } from "../rule-file.ts";

const names = z.array(z.string().trim().min(1)).min(1);

const ratingsSchema = z.strictObject({
  ratings_by_aircraft_type: z.record(z.string().min(1), names),
});

const coverSchema = z.strictObject({
  scenarios: z.record(z.string().min(1), z.record(z.string().min(1), names)),
});

interface Read {
  readonly ok: true;
  readonly status: "placeholder" | "verified";
  readonly sourceUrl: string;
}
type Failed = { readonly ok: false; readonly errors: readonly string[] };

export type AircraftTypeRatings =
  (Read & { readonly byType: ReadonlyMap<string, readonly string[]> }) | Failed;

export type CoverBases =
  | (Read & {
      readonly byScenario: ReadonlyMap<
        string,
        ReadonlyMap<string, readonly string[]>
      >;
    })
  | Failed;

/** An aircraft type as compared: no leading or trailing spaces, letter case ignored (ADR-034). */
const comparable = (type: string): string => type.trim().toUpperCase();

/** Checks the text, the envelope, id and product, then the data against its schema. */
function read<T>(
  text: string,
  id: string,
  schema: z.ZodType<T>,
): { readonly ok: true; readonly data: T; readonly head: Read } | Failed {
  const parsed = readJsonText(text);
  if (!parsed.ok) return parsed;
  const envelope = parseRuleFile(parsed.json);
  if (!envelope.ok) return envelope;
  const { file } = envelope;
  if (file.id !== id) return { ok: false, errors: [`id: must be "${id}"`] };
  if (file.product !== "sparewing") {
    return { ok: false, errors: ['product: must be "sparewing"'] };
  }
  const data = schema.safeParse(file.data);
  if (!data.success) {
    return {
      ok: false,
      errors: data.error.issues.map(
        (issue) =>
          `data${issue.path.map((p) => `.${String(p)}`).join("")}: ${issue.message}`,
      ),
    };
  }
  return {
    ok: true,
    data: data.data,
    head: { ok: true, status: file.status, sourceUrl: file.source.url },
  };
}

/** Reads the aircraft-type ratings file's text. Never throws; every problem is listed. */
export function readAircraftTypeRatings(text: string): AircraftTypeRatings {
  const result = read(text, "aircraft-type-ratings", ratingsSchema);
  if (!result.ok) return result;
  const byType = new Map<string, readonly string[]>();
  const named = new Map<string, string>();
  const errors: string[] = [];
  for (const [type, ratings] of Object.entries(
    result.data.ratings_by_aircraft_type,
  )) {
    const key = comparable(type);
    const earlier = named.get(key);
    if (earlier !== undefined) {
      errors.push(
        `data.ratings_by_aircraft_type: "${earlier}" and "${type}" name the same aircraft type`,
      );
    }
    named.set(key, type);
    byType.set(key, ratings);
  }
  return errors.length > 0 ? { ok: false, errors } : { ...result.head, byType };
}

/** The ratings a type requires; none when the type is not listed (then pilots are data missing). */
export function ratingsForType(
  rules: AircraftTypeRatings & { readonly ok: true },
  aircraftType: string,
): readonly string[] {
  return rules.byType.get(comparable(aircraftType)) ?? [];
}

/** Reads the cover-bases file's text. Never throws; every problem is listed. */
export function readCoverBases(text: string): CoverBases {
  const result = read(text, "cover-bases", coverSchema);
  if (!result.ok) return result;
  return {
    ...result.head,
    byScenario: new Map(
      Object.entries(result.data.scenarios).map(([scenario, communities]) => [
        scenario,
        new Map(Object.entries(communities)),
      ]),
    ),
  };
}

/** The bases listed to cover a community; null when the scenario or community is not listed. */
export function coverBasesFor(
  rules: CoverBases & { readonly ok: true },
  scenarioId: string,
  communityId: string,
): readonly string[] | null {
  return rules.byScenario.get(scenarioId)?.get(communityId) ?? null;
}
