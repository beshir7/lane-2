import "server-only";

// Notifications — server-side reads.

import { db } from "@/services/db";

export const listNotifications = () => db.notifications;
