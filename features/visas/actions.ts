"use server";

// Visas — write operations.

import { db, rid, patchById, removeById } from "@/services/db";
import type { Visa } from "@/lib/types";

function normalizeVisa(input: Partial<Visa>): Visa {
  return {
    id: input.id || rid("v"),
    athleteId: input.athleteId || "",
    kind: input.kind || "Other",
    type: input.type || "",
    event: input.event || "",
    validFrom: input.validFrom || "",
    validTo: input.validTo || "",
    embassy: input.embassy || "",
    sentToFederation: input.sentToFederation ?? false,
    note: input.note || "",
  };
}

export async function createVisa(input: Partial<Visa>) {
  const visa = normalizeVisa(input);
  db.visas.unshift(visa);
  return visa;
}

export async function updateVisa(id: string, patch: Partial<Visa>) {
  return patchById(db.visas, id, patch, "Visa");
}

export async function removeVisa(id: string) {
  return removeById(db.visas, id, "Visa");
}
