import "server-only";

// Dashboard — activity feed reads.

import { db } from "@/services/db";

export const listActivity = () => db.activity;
