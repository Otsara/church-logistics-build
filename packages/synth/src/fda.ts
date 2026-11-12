/**
 * Importer for FDA drug directory (openFDA NDC) product records (DAT-101, ARC-015).
 * Safety-critical: the scope and controlled-substance flags it sets feed eligibility (SYS-103,
 * SYS-109). Anything it cannot read for certain is marked unknown or out of scope, never passed.
 */
import { z } from "zod";

/** Route categories from the owner's scope decisions (SYS-109; owner, 2026-11-10 and 2026-11-11). */
export const ROUTE_CATEGORIES = [
  "oral",
  "sublingual",
  "rectal",
  "feeding-tube",
  "topical",
  "ophthalmic",
  "inhaled",
  "nasal",
  "vaginal",
  "otic",
] as const;
export type RouteCategory = (typeof ROUTE_CATEGORIES)[number];

/** The `data` of rules/prepped/route-scope.json. */
export const routeScopeSchema = z.strictObject({
  in_scope: z.array(z.enum(ROUTE_CATEGORIES)),
  routes: z.record(z.string(), z.enum(ROUTE_CATEGORIES)),
});
export type RouteScopeRules = z.infer<typeof routeScopeSchema>;

/** Controlled-substance status: "unknown" when the record does not say. */
export type Controlled = "yes" | "no" | "unknown";

export interface CatalogEntry {
  readonly sourceId: string;
  readonly otherSourceIds: readonly string[];
  readonly genericName: string;
  readonly dosageForm: string;
  readonly strength: string | null;
  readonly fdaRoutes: readonly string[];
  readonly routes: readonly RouteCategory[];
  readonly inScope: boolean;
  readonly scopeReason: string | null;
  readonly controlled: Controlled;
}

export type ParseResult =
  | { readonly ok: true; readonly entry: CatalogEntry }
  | {
      readonly ok: false;
      readonly sourceId: string | null;
      readonly problems: readonly string[];
    };

const recordSchema = z.object({
  product_ndc: z.string().min(1),
  generic_name: z.string().min(1),
  dosage_form: z.string().min(1),
  route: z.array(z.string()).optional(),
  active_ingredients: z
    .array(
      z.object({ name: z.string().min(1), strength: z.string().optional() }),
    )
    .optional(),
  dea_schedule: z.string().nullable().optional(),
});

const controlledFrom = (raw: object): Controlled => {
  const value = (raw as { dea_schedule?: unknown }).dea_schedule;
  if (value === undefined) return "unknown";
  if (value === null || value === "") return "no";
  return "yes";
};

/** Reads one openFDA NDC product record. Never throws; every problem is listed. */
export function parseNdcRecord(
  raw: unknown,
  rules: RouteScopeRules,
): ParseResult {
  const parsed = recordSchema.safeParse(raw);
  if (!parsed.success) {
    const id =
      typeof raw === "object" && raw !== null && "product_ndc" in raw
        ? raw.product_ndc
        : null;
    return {
      ok: false,
      sourceId: typeof id === "string" ? id : null,
      problems: parsed.error.issues.map(
        (i) => `${i.path.join(".") || "(record)"}: ${i.message}`,
      ),
    };
  }
  const record = parsed.data;
  const fdaRoutes = (record.route ?? [])
    .map((r) => r.trim().toUpperCase())
    .filter((r) => r !== "");
  const routes: RouteCategory[] = [];
  let scopeReason: string | null = null;
  for (const term of fdaRoutes) {
    const category = rules.routes[term];
    if (category === undefined) {
      scopeReason ??= `route not mapped: ${term}`;
      continue;
    }
    if (!routes.includes(category)) routes.push(category);
    if (!rules.in_scope.includes(category))
      scopeReason ??= `outside this build's scope: ${category}`;
  }
  if (fdaRoutes.length === 0) scopeReason = "no route recorded";
  const strength =
    record.active_ingredients === undefined ||
    record.active_ingredients.length === 0
      ? null
      : record.active_ingredients
          .map((a) => (a.strength ? `${a.name} ${a.strength}` : a.name))
          .join("; ");
  return {
    ok: true,
    entry: {
      sourceId: record.product_ndc,
      otherSourceIds: [],
      genericName: record.generic_name.trim(),
      dosageForm: record.dosage_form.trim(),
      strength,
      fdaRoutes,
      routes,
      inScope: scopeReason === null,
      scopeReason,
      controlled: controlledFrom(raw as object),
    },
  };
}

export interface Catalog {
  readonly entries: readonly CatalogEntry[];
  readonly rejected: readonly Extract<ParseResult, { ok: false }>[];
}

/**
 * Builds a catalog from many records. Products with the same generic name, strength and dosage
 * form become one entry that keeps every source id. If they disagree on controlled status or
 * routes, the entry keeps the most cautious reading: controlled wins over unknown over not
 * controlled, and any out-of-scope reading makes the entry out of scope.
 */
export function buildCatalog(
  records: readonly unknown[],
  rules: RouteScopeRules,
): Catalog {
  const byKey = new Map<string, CatalogEntry>();
  const rejected: Extract<ParseResult, { ok: false }>[] = [];
  const caution: Record<Controlled, number> = { no: 0, unknown: 1, yes: 2 };
  for (const raw of records) {
    const result = parseNdcRecord(raw, rules);
    if (!result.ok) {
      rejected.push(result);
      continue;
    }
    const e = result.entry;
    const key = [e.genericName, e.strength ?? "", e.dosageForm]
      .map((s) => s.toLowerCase())
      .join("|");
    const prior = byKey.get(key);
    if (prior === undefined) {
      byKey.set(key, e);
      continue;
    }
    byKey.set(key, {
      ...prior,
      otherSourceIds: [...prior.otherSourceIds, e.sourceId],
      fdaRoutes: [...new Set([...prior.fdaRoutes, ...e.fdaRoutes])],
      routes: [...new Set([...prior.routes, ...e.routes])],
      inScope: prior.inScope && e.inScope,
      scopeReason: prior.scopeReason ?? e.scopeReason,
      controlled:
        caution[e.controlled] > caution[prior.controlled]
          ? e.controlled
          : prior.controlled,
    });
  }
  return { entries: [...byKey.values()], rejected };
}
