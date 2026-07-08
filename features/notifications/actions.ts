"use server";

// Notifications — write operations.

import { db } from "@/services/db";

export async function markAllNotificationsRead() {
  db.notifications = db.notifications.map((n) => ({ ...n, unread: false }));
  return db.notifications;
}
