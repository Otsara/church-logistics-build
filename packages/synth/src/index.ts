/**
 * Synthetic data for building and testing (ARC-012, ARC-015, ARC-016; DOC-065). Synthetic data only:
 * no real personal or health data (DAT-003).
 */
export { createRng, type Rng } from "./rng.ts";
export {
  FIRST_NAMES,
  SYLLABLES,
  inventedWord,
  isSyntheticPersonName,
  personName,
} from "./words.ts";
export { addDays } from "./dates.ts";
export {
  canonicalJson,
  sealManifest,
  splitHeldBack,
  verifyManifest,
  type Identified,
  type Manifest,
  type Split,
} from "./split.ts";
export {
  ROUTE_CATEGORIES,
  buildCatalog,
  parseNdcRecord,
  routeScopeSchema,
  type Catalog,
  type CatalogEntry,
  type Controlled,
  type ParseResult,
  type RouteCategory,
  type RouteScopeRules,
} from "./fda.ts";
export {
  generatePrepped,
  type PreppedData,
  type PreppedOptions,
} from "./prepped.ts";
export {
  AIRCRAFT_ID,
  PART_NUMBER,
  WEEKDAYS,
  generateSpareWing,
  type SpareWingData,
  type SpareWingOptions,
} from "./sparewing.ts";
