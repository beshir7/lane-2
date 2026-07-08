"use server";

// Passports — write operations.

import { db, rid, patchById, removeById } from "@/services/db";
import type { Passport } from "@/lib/types";

function normalizePassport(input: Partial<Passport>): Passport {
  return {
    id: input.id || rid("pp"),
    athleteId: input.athleteId || "",
    number: input.number || "",
    nation: input.nation || "",
    issued: input.issued || "",
    expiry: input.expiry || "",
    note: input.note || "",
  };
}

export async function createPassport(input: Partial<Passport>) {
  const passport = normalizePassport(input);
  db.passports.unshift(passport);
  return passport;
}

export async function updatePassport(id: string, patch: Partial<Passport>) {
  return patchById(db.passports, id, patch, "Passport");
}

export async function removePassport(id: string) {
  return removeById(db.passports, id, "Passport");
}
