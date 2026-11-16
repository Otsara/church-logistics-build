/**
 * SpareWing's two rule files (ARC-004, ARC-301; safety-critical): the pilot ratings each aircraft
 * type requires (`rules/sparewing/aircraft-type-ratings.json`, SYS-303) and the bases able to
 * cover each community's flights (`rules/sparewing/cover-bases.json`, SYS-307, ADR-015). Both are
 * placeholders derived from the synthetic data until a program supplies its own (OD-005). Lookups
 * use maps, so a name such as "constructor" is never mistaken for an entry.
 */
import { z } from "zod";
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

/** Checks the envelope, id and product, then the data against its schema. */
function read<T>(
  json: unknown,
  id: string,
  schema: z.ZodType<T>,
): { readonly ok: true; readonly data: T; readonly head: Read } | Failed {
  const envelope = parseRuleFile(json);
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

/** Reads parsed JSON from the aircraft-type ratings file. Never throws; every problem is listed. */
export function readAircraftTypeRatings(json: unknown): AircraftTypeRatings {
  const result = read(json, "aircraft-type-ratings", ratingsSchema);
  if (!result.ok) return result;
  return {
    ...result.head,
    byType: new Map(Object.entries(result.data.ratings_by_aircraft_type)),
  };
}

/** The ratings a type requires; none when the type is not listed (then pilots are data missing). */
export function ratingsForType(
  rules: AircraftTypeRatings & { readonly ok: true },
  aircraftType: string,
): readonly string[] {
  return rules.byType.get(aircraftType) ?? [];
}

/** Reads parsed JSON from the cover-bases file. Never throws; every problem is listed. */
export function readCoverBases(json: unknown): CoverBases {
  const result = read(json, "cover-bases", coverSchema);
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
