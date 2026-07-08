import "server-only";

// Passports — server-side reads.

import { db, requireById } from "@/services/db";

export const listPassports = () => db.passports;

export const passportsForAthlete = (athleteId: string) =>
  db.passports.filter((p) => p.athleteId === athleteId);

export const getPassport = (id: string) => requireById(db.passports, id, "Passport");
