"use server";

// Race organizers — write operations.

import { db, rid, patchById, removeById } from "@/services/db";
import type { Organizer } from "@/lib/types";

function normalizeOrganizer(input: Partial<Organizer>): Organizer {
  return {
    id: input.id || rid("o"),
    name: input.name || "",
    email: input.email || "",
    phone: input.phone || "",
    nation: input.nation || "",
  };
}

export async function createOrganizer(input: Partial<Organizer>) {
  const organizer = normalizeOrganizer(input);
  db.organizers.unshift(organizer);
  return organizer;
}

export async function updateOrganizer(id: string, patch: Partial<Organizer>) {
  return patchById(db.organizers, id, patch, "Organizer");
}

export async function removeOrganizer(id: string) {
  return removeById(db.organizers, id, "Organizer");
}
