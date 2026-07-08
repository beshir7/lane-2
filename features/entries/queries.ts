import "server-only";

// Race entries — server-side reads. An entry is one athlete in one discipline
// of one competition, with pipeline status (proposed → waiting → accepted → ok)
// and, once run, a result.

import { db, requireById } from "@/services/db";

export const listEntries = () => db.entries;

export const entriesForCompetition = (competitionId: string) =>
  db.entries.filter((e) => e.competitionId === competitionId);

export const entriesForAthlete = (athleteId: string) =>
  db.entries.filter((e) => e.athleteId === athleteId);

export const getEntry = (id: string) => requireById(db.entries, id, "Entry");
