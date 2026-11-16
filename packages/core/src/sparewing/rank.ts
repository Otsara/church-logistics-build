/**
 * SpareWing proposed plan (ARC-301; safety-critical). Options are ranked in strict order, with no
 * weights: fewest missed community flights, then earliest return to service (unknown last), then
 * fewest transfers between bases; cost is shown, not ranked (SYS-308, ADR-015). Every option stays
 * in view with the reason for its place. The first is proposed for people to review and verify;
 * nothing is decided here (SYS-309).
 */
import { daysBetween, type IsoDate } from "../dates.ts";

export interface PlanOption {
  readonly id: string;
  /** Null when unknown (data missing); ranks after every known count (owner, 2026-11-16; ADR-032). */
  readonly missedFlights: number | null;
  readonly returnToService: IsoDate | null;
  readonly transfers: number;
  readonly cost: string | null;
}

export interface RankedOption {
  readonly rank: number;
  readonly option: PlanOption;
  readonly proposed: boolean;
  readonly reasons: readonly string[];
}

const count = (n: number, noun: string): string =>
  `${String(n)} ${noun}${n === 1 ? "" : "s"}`;

/** Negative when a returns to service first; an unknown return comes last. */
function byReturn(a: IsoDate | null, b: IsoDate | null): number {
  if (a === null || b === null)
    return (a === null ? 1 : 0) - (b === null ? 1 : 0);
  return daysBetween(b, a);
}

/** Negative when a misses fewer flights; an unknown count comes last. */
function byMissed(a: number | null, b: number | null): number {
  if (a === null || b === null)
    return (a === null ? 1 : 0) - (b === null ? 1 : 0);
  return a - b;
}

function compare(a: PlanOption, b: PlanOption): number {
  return (
    byMissed(a.missedFlights, b.missedFlights) ||
    byReturn(a.returnToService, b.returnToService) ||
    a.transfers - b.transfers
  );
}

function why(option: PlanOption, above: PlanOption): string {
  const below = `ranked below ${above.id}`;
  if (byMissed(option.missedFlights, above.missedFlights) !== 0) {
    return option.missedFlights === null
      ? `${below}: missed flights unknown (data missing)`
      : `${below}: more missed flights (${String(option.missedFlights)} against ${String(above.missedFlights)})`;
  }
  if (byReturn(option.returnToService, above.returnToService) !== 0) {
    return option.returnToService === null
      ? `${below}: same missed flights, return to service unknown`
      : `${below}: same missed flights, later return to service (${option.returnToService} against ${String(above.returnToService)})`;
  }
  if (option.transfers !== above.transfers) {
    return `${below}: same missed flights and return to service, more transfers (${String(option.transfers)} against ${String(above.transfers)})`;
  }
  return `tied with ${above.id} on every ranked criterion: kept in the order entered`;
}

/** Ranks every option; none is removed. A stable sort keeps tied options in the order entered. */
export function rankOptions(options: readonly PlanOption[]): RankedOption[] {
  const sorted = [...options].sort(compare);
  return sorted.map((option, index) => {
    const missed =
      option.missedFlights === null
        ? "missed flights unknown"
        : count(option.missedFlights, "missed flight");
    const facts = `${missed}, return to service ${option.returnToService ?? "unknown"}, ${count(option.transfers, "transfer")}`;
    const above = sorted[index - 1];
    const place =
      above === undefined
        ? "proposed plan, for the flight base director, mechanic and pilot to review and verify"
        : why(option, above);
    return {
      rank: index + 1,
      option,
      proposed: index === 0,
      reasons: [
        facts,
        place,
        ...(option.cost === null
          ? []
          : [`cost ${option.cost} (shown, not ranked)`]),
      ],
    };
  });
}
