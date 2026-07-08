import "server-only";

// =========================================================================
// Core datastore (services layer). A single mutable snapshot of every
// collection, seeded once and preserved across HMR via globalThis.
//
// This is the ONLY module that owns state. Today it's in-memory; swap the
// body of the read/write helpers for Supabase (see lib/supabase.ts) and the
// feature queries/actions above it stay unchanged.
// =========================================================================

import * as seed from "./seed";
import { notFound } from "@/lib/http";
import type {
  Athlete,
  Competition,
  ResultsMap,
  CalendarEvent,
  LaneDocument,
  AppNotification,
  ActivityItem,
  TeamUser,
  Post,
  AuditEntry,
  DeviceSession,
  Passport,
  Visa,
  Organizer,
  RaceEntry,
} from "@/lib/types";

export interface Database {
  athletes: Athlete[];
  competitions: Competition[];
  results: ResultsMap;
  events: CalendarEvent[];
  documents: LaneDocument[];
  notifications: AppNotification[];
  activity: ActivityItem[];
  users: TeamUser[];
  posts: Post[];
  audit: AuditEntry[];
  sessions: DeviceSession[];
  passports: Passport[];
  visas: Visa[];
  organizers: Organizer[];
  entries: RaceEntry[];
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function freshDatabase(): Database {
  return {
    athletes: clone(seed.ATHLETES),
    competitions: clone(seed.COMPETITIONS),
    results: clone(seed.SAMPLE_RESULTS),
    events: clone(seed.CALENDAR_EVENTS),
    documents: clone(seed.DOCUMENTS),
    notifications: clone(seed.NOTIFICATIONS),
    activity: clone(seed.ACTIVITY),
    users: clone(seed.TEAM_USERS),
    posts: clone(seed.POSTS),
    audit: clone(seed.AUDIT_LOG),
    sessions: clone(seed.SESSIONS),
    passports: clone(seed.PASSPORTS),
    visas: clone(seed.VISAS),
    organizers: clone(seed.ORGANIZERS),
    entries: clone(seed.ENTRIES),
  };
}

const globalRef = globalThis as unknown as { __laneDb?: Database };
if (!globalRef.__laneDb) globalRef.__laneDb = freshDatabase();

export const db: Database = globalRef.__laneDb;

/** Generate a short prefixed id, e.g. rid("a") -> "a4f2". */
export const rid = (prefix: string) => prefix + Math.random().toString(36).slice(2, 6);

// ---- Generic id-collection helpers --------------------------------------
// Shared by every feature's queries/actions so record access stays uniform.

export function findById<T extends { id: string }>(arr: T[], id: string): T | undefined {
  return arr.find((x) => x.id === id);
}

export function requireById<T extends { id: string }>(arr: T[], id: string, label: string): T {
  const found = findById(arr, id);
  if (!found) notFound(label);
  return found as T;
}

export function patchById<T extends { id: string }>(arr: T[], id: string, patch: Partial<T>, label: string): T {
  const idx = arr.findIndex((x) => x.id === id);
  if (idx === -1) notFound(label);
  arr[idx] = { ...arr[idx], ...patch, id };
  return arr[idx];
}

export function removeById<T extends { id: string }>(arr: T[], id: string, label: string): T {
  const idx = arr.findIndex((x) => x.id === id);
  if (idx === -1) notFound(label);
  return arr.splice(idx, 1)[0];
}
