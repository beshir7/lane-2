import "server-only";

// Calendar events — server-side reads.

import { db } from "@/services/db";

export const listEvents = () => db.events;
