import "server-only";

// Visas — server-side reads, incl. the printable visa list (join w/ athlete).

import { db, requireById } from "@/services/db";
import type { VisaKind } from "@/lib/types";

export const listVisas = () => db.visas;

export const visasForAthlete = (athleteId: string) =>
  db.visas.filter((v) => v.athleteId === athleteId);

export const getVisa = (id: string) => requireById(db.visas, id, "Visa");

export interface VisaListRow {
  id: string;
  athleteId: string;
  athleteName: string;
  nationality: string;
  kind: VisaKind;
  type: string;
  event: string;
  validFrom: string;
  validTo: string;
  embassy: string;
}

/** Printable visa list (caption 12/13): optionally filter by kind, sorted by expiry. */
export function visaList(kind?: VisaKind): VisaListRow[] {
  return db.visas
    .filter((v) => !kind || v.kind === kind)
    .map((v) => {
      const a = db.athletes.find((x) => x.id === v.athleteId);
      return {
        id: v.id,
        athleteId: v.athleteId,
        athleteName: a ? `${a.last} ${a.first}` : "—",
        nationality: a?.nationality || "",
        kind: v.kind,
        type: v.type,
        event: v.event || "",
        validFrom: v.validFrom,
        validTo: v.validTo,
        embassy: v.embassy,
      };
    })
    .sort((a, b) => (a.validTo || "").localeCompare(b.validTo || ""));
}
