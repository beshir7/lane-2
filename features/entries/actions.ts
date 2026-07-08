"use server";

// Race entries — write operations, incl. the entry-status workflow and results.

import { db, rid, patchById, removeById, findById } from "@/services/db";
import type { RaceEntry } from "@/lib/types";

/** Keep a competition's cached `entries`/`results` counts in sync. */
function recount(competitionId: string) {
  const comp = findById(db.competitions, competitionId);
  if (!comp) return;
  const forComp = db.entries.filter((e) => e.competitionId === competitionId);
  comp.entries = forComp.length;
  comp.results = forComp.filter((e) => e.position != null || e.time).length;
}

function normalizeEntry(input: Partial<RaceEntry>): RaceEntry {
  return {
    id: input.id || rid("en"),
    competitionId: input.competitionId || "",
    athleteId: input.athleteId || "",
    discipline: input.discipline || "",
    gender: input.gender || "M",
    status: input.status || "proposed",
    position: input.position,
    time: input.time || "",
    wind: input.wind || "",
    note: input.note || "",
  };
}

export async function createEntry(input: Partial<RaceEntry>) {
  const entry = normalizeEntry(input);
  db.entries.unshift(entry);
  recount(entry.competitionId);
  return entry;
}

export async function updateEntry(id: string, patch: Partial<RaceEntry>) {
  const updated = patchById(db.entries, id, patch, "Entry");
  recount(updated.competitionId);
  return updated;
}

export async function removeEntry(id: string) {
  const removed = removeById(db.entries, id, "Entry");
  recount(removed.competitionId);
  return removed;
}
