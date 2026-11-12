/**
 * Building blocks for synthetic names (DAT-003). First names are nature words; surnames and place
 * names are built from invented syllables, so they are unlikely to match real people or places.
 * Donors are named by code, not by name.
 */
import type { Rng } from "./rng.ts";

export const FIRST_NAMES: readonly string[] = [
  "Alder",
  "Birch",
  "Cedar",
  "Dune",
  "Ember",
  "Fern",
  "Glen",
  "Heath",
  "Iris",
  "Juniper",
  "Kestrel",
  "Linden",
  "Moss",
  "Nettle",
  "Oriel",
  "Pike",
  "Quill",
  "Rowan",
  "Sedge",
  "Tamar",
  "Umber",
  "Vale",
  "Wren",
  "Yarrow",
];

export const SYLLABLES: readonly string[] = [
  "ka",
  "lo",
  "ven",
  "tri",
  "mo",
  "sa",
  "rul",
  "dei",
  "qua",
  "zen",
  "bo",
  "ri",
  "tal",
  "nu",
  "vex",
  "lia",
  "pon",
  "dre",
  "ish",
  "gor",
];

const capitalise = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1);

/** An invented word of two or three syllables, for surnames and place names. */
export function inventedWord(rng: Rng): string {
  const count = rng.int(2, 3);
  let word = "";
  for (let i = 0; i < count; i += 1) word += rng.pick(SYLLABLES);
  return capitalise(word);
}

/** A synthetic person's name: a nature word and an invented surname. */
export function personName(rng: Rng): string {
  return `${rng.pick(FIRST_NAMES)} ${inventedWord(rng)}`;
}

/** True if a name could only have come from personName(). */
export function isSyntheticPersonName(name: string): boolean {
  const [first, last, ...rest] = name.split(" ");
  if (first === undefined || last === undefined || rest.length > 0)
    return false;
  if (!FIRST_NAMES.includes(first)) return false;
  const body = last.toLowerCase();
  const matches = (rem: string, used: number): boolean => {
    if (rem === "") return used >= 2 && used <= 3;
    return SYLLABLES.some(
      (s) => rem.startsWith(s) && matches(rem.slice(s.length), used + 1),
    );
  };
  return last === capitalise(body) && matches(body, 0);
}
