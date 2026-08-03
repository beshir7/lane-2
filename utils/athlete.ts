// How an athlete is named and coloured, consistently everywhere they appear.
// Old-system conventions: women pink, men blue, and a contract tag — (E) Eric,
// (M) Monica — after the name for managed athletes.

import type { Athlete, ContractTag } from "@/lib/types";

export const GENDER_COLOR: Record<string, string> = { F: "#f55b6e", M: "#5b6ef5", X: "var(--fg-1)" };

export const nameColor = (gender: string): string => GENDER_COLOR[gender] || "var(--fg-1)";

export const contractSuffix = (c?: ContractTag): string => (c ? ` (${c})` : "");

/** "Aster Bekele (E)" — reading order, used in the UI. */
export const athleteName = (a: Pick<Athlete, "first" | "last" | "contract">): string =>
  `${a.first} ${a.last}${contractSuffix(a.contract)}`;

/** "Bekele, Aster (E)" — sort order, used in printed lists and pickers. */
export const athleteListName = (a: Pick<Athlete, "first" | "last" | "contract">): string =>
  `${a.last}, ${a.first}${contractSuffix(a.contract)}`;
