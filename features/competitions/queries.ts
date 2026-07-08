import "server-only";

// Competitions & results — server-side reads.

import { db, requireById } from "@/services/db";

export const listCompetitions = () => db.competitions;

export const getCompetition = (id: string) => requireById(db.competitions, id, "Competition");

export const listResults = (compId: string) => db.results[compId] || [];
