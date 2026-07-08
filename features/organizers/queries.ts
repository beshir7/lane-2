import "server-only";

// Race organizers — server-side reads.

import { db, requireById } from "@/services/db";

export const listOrganizers = () => db.organizers;

export const getOrganizer = (id: string) => requireById(db.organizers, id, "Organizer");
