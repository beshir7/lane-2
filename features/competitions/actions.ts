"use server";

// Competitions & results — write operations.

import { db, rid, patchById, removeById, requireById, findById } from "@/services/db";
import type { Competition, Result } from "@/lib/types";

function normalizeCompetition(input: Partial<Competition>): Competition {
  return {
    id: input.id || rid("c"),
    name: input.name || "",
    short: input.short || "",
    location: input.location || "",
    country: input.country || "",
    date: input.date || "",
    endDate: input.endDate || input.date || "",
    type: input.type || "Diamond League",
    tier: input.tier || "tier-1",
    status: input.status || "upcoming",
    entries: input.entries ?? 0,
    results: input.results ?? 0,
    events: input.events || [],
    summary: input.summary,
    category: input.category,
    level: input.level || "",
    organizerId: input.organizerId ?? null,
    disciplines: input.disciplines || [],
    webSite: input.webSite || "",
    notes: input.notes || "",
  };
}

export async function createCompetition(input: Partial<Competition>) {
  const competition = normalizeCompetition(input);
  db.competitions.unshift(competition);
  return competition;
}

export async function updateCompetition(id: string, patch: Partial<Competition>) {
  return patchById(db.competitions, id, patch, "Competition");
}

export async function removeCompetition(id: string) {
  const removed = removeById(db.competitions, id, "Competition");
  delete db.results[id];
  return removed;
}

export async function addResult(compId: string, input: Partial<Result>) {
  requireById(db.competitions, compId, "Competition");
  const place = Number(input.place ?? 1);
  const result: Result = {
    athleteId: input.athleteId || "",
    event: input.event || "",
    mark: input.mark || "",
    place,
    points: input.points ?? Math.max(0, 10 - place + 1),
    wind: input.wind || "",
    note: input.note || "",
  };
  db.results[compId] = [...(db.results[compId] || []), result];
  const comp = findById(db.competitions, compId);
  if (comp) comp.results = db.results[compId].length;
  return result;
}
