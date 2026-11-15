/**
 * The floor-list picker label (SYS-118; ARC-101). A controlled medicine stays in the catalogue so a
 * donated lot of it is recognised and blocked, and the picker labels it, with its basis, so a floor
 * item is never chosen without knowing it cannot be met (owner, 2026-11-12; REV-001, ADR-020).
 */
export const CONTROLLED_LABEL = "Controlled: cannot be packed in this build";

/** The label for one catalogue entry in the picker, or null when none is needed. */
export function pickerLabel(entry: {
  readonly controlled: "yes" | "no";
  readonly controlledBasis: string;
}): { readonly label: typeof CONTROLLED_LABEL; readonly basis: string } | null {
  return entry.controlled === "yes"
    ? { label: CONTROLLED_LABEL, basis: entry.controlledBasis }
    : null;
}
