/**
 * Importer for FDA drug directory (openFDA NDC) product records (DAT-101, ARC-015).
 * Safety-critical: the scope and controlled-substance flags it sets feed eligibility (SYS-103,
 * SYS-109). A route it cannot map is out of scope. A record without a DEA schedule is read as not
 * controlled in the US, and the entry says so, because openFDA omits the field for products that
 * are not scheduled (OD-044; owner, 2026-11-12).
 */
import { z } from "zod";

/**
 * Route categories from the owner's scope decisions (SYS-109; owner, 2026-11-10 and 2026-11-11).
 * Feeding tube is not a category: suitability is the clinician's judgement (OD-045).
 */
export const ROUTE_CATEGORIES = [
  "oral",
  "sublingual",
  "rectal",
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
  /** FDA product types treated as cold chain whatever the lot says: biologics (OD-049). */
  cold_chain_product_types: z.array(z.string().min(1)),
});
export type RouteScopeRules = z.infer<typeof routeScopeSchema>;

/** US controlled-substance status from the FDA drug directory; `controlledBasis` says why. */
export type Controlled = "yes" | "no";

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
  readonly controlledBasis: string;
  /** Established pharmacologic classes (EPC) from the directory, for comparable alternatives (OD-022). */
  readonly classes: readonly string[];
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
  pharm_class: z.array(z.string()).optional(),
  product_type: z.string().optional(),
});

const EPC = " [EPC]";

/** The established pharmacologic classes, without their "[EPC]" tag, sorted and unique. */
function classesFrom(pharmClass: readonly string[] | undefined): string[] {
  if (pharmClass === undefined) return [];
  // After trimming, a tag alone ("[EPC]") cannot end with " [EPC]", so no class is ever empty.
  const classes = pharmClass
    .map((c) => c.trim())
    .filter((c) => c.endsWith(EPC))
    .map((c) => c.slice(0, -EPC.length).trim());
  return [...new Set(classes)].sort();
}

const controlledFrom = (
  schedule: string | null | undefined,
): Pick<CatalogEntry, "controlled" | "controlledBasis"> => {
  const value = schedule?.trim() ?? "";
  return value === ""
    ? {
        controlled: "no",
        controlledBasis:
          "FDA drug directory: no DEA schedule recorded (US scheduling only)",
      }
    : {
        controlled: "yes",
        controlledBasis: `FDA drug directory: DEA schedule ${value}`,
      };
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
  // A biologic is treated as cold chain whatever its route, and that reason comes first (OD-049).
  const productType = record.product_type?.trim().toUpperCase();
  if (
    productType !== undefined &&
    rules.cold_chain_product_types.includes(productType)
  )
    scopeReason = `biologic, treated as cold chain: ${productType}`;
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
      ...controlledFrom(record.dea_schedule),
      classes: classesFrom(record.pharm_class),
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
 * routes, the entry keeps the most cautious reading: controlled wins over not controlled (the
 * first schedule found is kept), and any out-of-scope reading makes the entry out of scope.
 */
export function buildCatalog(
  records: readonly unknown[],
  rules: RouteScopeRules,
): Catalog {
  const byKey = new Map<string, CatalogEntry>();
  const rejected: Extract<ParseResult, { ok: false }>[] = [];
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
      classes: [...new Set([...prior.classes, ...e.classes])].sort(),
      // A scheduled reading replaces "no"; an earlier schedule is kept.
      ...(prior.controlled === "no"
        ? { controlled: e.controlled, controlledBasis: e.controlledBasis }
        : {}),
    });
  }
  return { entries: [...byKey.values()], rejected };
}
