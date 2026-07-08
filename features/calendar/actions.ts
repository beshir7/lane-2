"use server";

// Calendar events — write operations.

import { db, rid, patchById, removeById } from "@/services/db";
import type { CalendarEvent } from "@/lib/types";

function normalizeEvent(input: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: input.id || rid("e"),
    title: input.title || "",
    category: input.category || "training",
    date: input.date || "",
    startHour: input.startHour ?? 9,
    duration: input.duration ?? 1.5,
    athletes: input.athletes || [],
    location: input.location || "",
    competitionId: input.competitionId,
  };
}

export async function createEvent(input: Partial<CalendarEvent>) {
  const event = normalizeEvent(input);
  db.events.unshift(event);
  return event;
}

export async function updateEvent(id: string, patch: Partial<CalendarEvent>) {
  return patchById(db.events, id, patch, "Event");
}

export async function removeEvent(id: string) {
  return removeById(db.events, id, "Event");
}
