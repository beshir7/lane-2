import "server-only";

// Athletes — server-side reads (BFF). Called by app/api routes and RSC.

import { db, requireById } from "@/services/db";

export const listAthletes = () => db.athletes;

export const getAthlete = (id: string) => requireById(db.athletes, id, "Athlete");
