import "server-only";

// Documents — server-side reads.

import { db } from "@/services/db";

export const listDocuments = () => db.documents;
