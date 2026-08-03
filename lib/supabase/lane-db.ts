"use client";

// =========================================================================
// LaneDB — the read/write bridge between the app's camelCase domain objects
// and the Supabase snake_case tables. RLS makes every query implicitly scoped
// to the signed-in user, so callers never filter by user_id on reads; on
// writes we stamp user_id = the current user so the RLS check passes.
// =========================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Athlete,
  Organizer,
  Competition,
  RaceEntry,
  Visa,
  Passport,
  CalendarEvent,
  LaneDocument,
} from "@/lib/types";

// appKey -> db column. Keys omitted here are never read or written.
type FieldMap = Record<string, string>;

const ATHLETE_MAP: FieldMap = {
  id: "id", first: "first", last: "last", initials: "initials", color: "color",
  nationality: "nationality", dob: "dob", age: "age", gender: "gender",
  specialty: "specialty", category: "category", squad: "squad", status: "status",
  disciplines: "disciplines", joined: "joined", pb: "pb", pbMeta: "pb_meta", medals: "medals",
  nextEvent: "next_event", coach: "coach", progress: "progress", bio: "bio",
  contact: "contact", email: "email", contract: "contract",
  placeOfBirth: "place_of_birth", residence: "residence", maritalStatus: "marital_status",
  employment: "employment", taxCode: "tax_code", fidalNumber: "fidal_number", club: "club",
  height: "height", heightUnit: "height_unit", weight: "weight", weightUnit: "weight_unit",
  sponsor: "sponsor", shoeSize: "shoe_size", clothingSize: "clothing_size",
  whereabouts: "whereabouts",
};

const ORGANIZER_MAP: FieldMap = {
  id: "id", name: "name", firstName: "first_name", lastName: "last_name",
  email: "email", phone: "phone", nation: "nation",
};

const COMPETITION_MAP: FieldMap = {
  id: "id", name: "name", short: "short", location: "location", country: "country",
  date: "date", endDate: "end_date", type: "type", tier: "tier", status: "status",
  entries: "entries", results: "results", events: "events", summary: "summary",
  category: "category", level: "level", organizerId: "organizer_id",
  contactSurname: "contact_surname", contactName: "contact_name",
  contactPhone: "contact_phone", contactEmail: "contact_email",
  disciplines: "disciplines", webSite: "web_site", notes: "notes",
  followedBy: "followed_by",
};

const ENTRY_MAP: FieldMap = {
  id: "id", competitionId: "competition_id", athleteId: "athlete_id",
  discipline: "discipline", gender: "gender", status: "status",
  position: "position", time: "time", wind: "wind", note: "note",
};

const VISA_MAP: FieldMap = {
  id: "id", athleteId: "athlete_id", kind: "kind", number: "number", type: "type",
  event: "event", validFrom: "valid_from", validTo: "valid_to", notKnown: "not_known",
  embassy: "embassy", sentToFederation: "sent_to_federation", sentToAgent: "sent_to_agent",
  appointment: "appointment", archived: "archived", photo: "photo", note: "note",
};

const PASSPORT_MAP: FieldMap = {
  id: "id", athleteId: "athlete_id", number: "number", nation: "nation",
  issued: "issued", expiry: "expiry", photo: "photo", note: "note",
};

const EVENT_MAP: FieldMap = {
  id: "id", title: "title", category: "category", date: "date",
  startHour: "start_hour", duration: "duration", athletes: "athletes",
  location: "location", competitionId: "competition_id",
};

const DOCUMENT_MAP: FieldMap = {
  id: "id", name: "name", type: "type", category: "category", size: "size",
  athleteId: "athlete_id", uploaded: "uploaded", expires: "expires", icon: "icon",
};

function fromRow<T>(row: Record<string, any>, map: FieldMap): T {
  const o: Record<string, any> = {};
  for (const [appKey, dbCol] of Object.entries(map)) {
    if (dbCol in row && row[dbCol] !== null) o[appKey] = row[dbCol];
  }
  return o as T;
}

function toRow(obj: Record<string, any>, map: FieldMap): Record<string, any> {
  const r: Record<string, any> = {};
  for (const [appKey, dbCol] of Object.entries(map)) {
    if (obj[appKey] !== undefined) r[dbCol] = obj[appKey];
  }
  return r;
}

export type Entity =
  | "athlete" | "organizer" | "competition" | "entry"
  | "visa" | "passport" | "event" | "document";

const ENTITY: Record<Entity, { table: string; map: FieldMap }> = {
  athlete: { table: "athletes", map: ATHLETE_MAP },
  organizer: { table: "organizers", map: ORGANIZER_MAP },
  competition: { table: "competitions", map: COMPETITION_MAP },
  entry: { table: "race_entries", map: ENTRY_MAP },
  visa: { table: "visas", map: VISA_MAP },
  passport: { table: "passports", map: PASSPORT_MAP },
  event: { table: "calendar_events", map: EVENT_MAP },
  document: { table: "documents", map: DOCUMENT_MAP },
};

export interface LaneData {
  athletes: Athlete[];
  organizers: Organizer[];
  competitions: Competition[];
  entries: RaceEntry[];
  visas: Visa[];
  passports: Passport[];
  events: CalendarEvent[];
  documents: LaneDocument[];
}

/** Opt-in timing, so production latency can be measured instead of guessed.
 *  Turn on in the browser console with:  localStorage.setItem("lane-perf", "1")
 *  …then reload. Off by default; costs nothing when disabled. */
export function perfEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("lane-perf") === "1" || new URLSearchParams(location.search).has("perf");
  } catch {
    return false;
  }
}

/** Where the time before the app booted actually went. The data layer is only
 *  the last step of a page load; this reports the steps that precede it —
 *  server response, script download, parse/hydrate — so a slow page can be
 *  attributed to the right one instead of guessed at. */
export function logPageLoadBreakdown() {
  if (!perfEnabled() || typeof performance === "undefined") return;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!nav) return;
  const scripts = (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).filter(
    (r) => r.initiatorType === "script"
  );
  const scriptBytes = scripts.reduce((n, r) => n + (r.transferSize || 0), 0);
  const scriptsDone = scripts.reduce((t, r) => Math.max(t, r.responseEnd), 0);
  const row = (label: string, ms: number, note = "") =>
    // eslint-disable-next-line no-console
    console.info(`[lane-perf] ${label.padEnd(20)} ${ms.toFixed(0).padStart(5)} ms  ${note}`);

  // eslint-disable-next-line no-console
  console.info("[lane-perf] ---- page load breakdown ----");
  row("TTFB (server)", nav.responseStart - nav.startTime, "document request — includes middleware auth");
  row("HTML download", nav.responseEnd - nav.responseStart);
  row("scripts fetched", scriptsDone - nav.responseEnd, `${scripts.length} files, ${(scriptBytes / 1024).toFixed(0)} kB transferred`);
  row("parse + hydrate", nav.domContentLoadedEventEnd - scriptsDone);
  row("DOM interactive", nav.domInteractive);
  row("app boot → data", performance.now() - nav.domContentLoadedEventEnd, "provider work (see timings above)");
}

/** Time one query and report how long it took and how many rows came back. */
async function timed<T>(label: string, run: () => PromiseLike<T>, on: boolean): Promise<T> {
  if (!on) return run();
  const t0 = performance.now();
  const res = await run();
  const rows = (res as { data?: unknown[] })?.data?.length ?? 0;
  // eslint-disable-next-line no-console
  console.info(`[lane-perf] ${label.padEnd(16)} ${(performance.now() - t0).toFixed(0).padStart(5)} ms  ${rows} rows`);
  return res;
}

// Pull every collection the signed-in user owns, in one round of parallel queries.
export async function fetchLaneData(sb: SupabaseClient): Promise<LaneData> {
  const on = perfEnabled();
  const t0 = on ? performance.now() : 0;
  const [a, o, c, e, v, p, ev, d] = await Promise.all([
    timed("athletes", () => sb.from("athletes").select("*"), on),
    timed("organizers", () => sb.from("organizers").select("*"), on),
    timed("competitions", () => sb.from("competitions").select("*"), on),
    timed("race_entries", () => sb.from("race_entries").select("*"), on),
    timed("visas", () => sb.from("visas").select("*"), on),
    timed("passports", () => sb.from("passports").select("*"), on),
    timed("calendar_events", () => sb.from("calendar_events").select("*"), on),
    timed("documents", () => sb.from("documents").select("*"), on),
  ]);
  if (on) {
    // eslint-disable-next-line no-console
    console.info(`[lane-perf] ${"ALL QUERIES".padEnd(16)} ${(performance.now() - t0).toFixed(0).padStart(5)} ms (parallel — this is the slowest one)`);
  }
  return {
    athletes: (a.data ?? []).map((r) => fromRow<Athlete>(r, ATHLETE_MAP)),
    organizers: (o.data ?? []).map((r) => fromRow<Organizer>(r, ORGANIZER_MAP)),
    competitions: (c.data ?? []).map((r) => fromRow<Competition>(r, COMPETITION_MAP)),
    entries: (e.data ?? []).map((r) => fromRow<RaceEntry>(r, ENTRY_MAP)),
    visas: (v.data ?? []).map((r) => fromRow<Visa>(r, VISA_MAP)),
    passports: (p.data ?? []).map((r) => fromRow<Passport>(r, PASSPORT_MAP)),
    events: (ev.data ?? []).map((r) => fromRow<CalendarEvent>(r, EVENT_MAP)),
    documents: (d.data ?? []).map((r) => fromRow<LaneDocument>(r, DOCUMENT_MAP)),
  };
}

// Insert-or-replace a full object (used by create*). Stamps the owner.
export async function saveRow(sb: SupabaseClient, userId: string, entity: Entity, obj: Record<string, any>) {
  const { table, map } = ENTITY[entity];
  const row = { ...toRow(obj, map), user_id: userId };
  return sb.from(table).upsert(row);
}

// Patch a subset of columns for one row (used by update*). id is never patched.
export async function updateRow(sb: SupabaseClient, entity: Entity, id: string, patch: Record<string, any>) {
  const { table, map } = ENTITY[entity];
  const row = toRow(patch, map);
  delete row.id;
  return sb.from(table).update(row).eq("id", id);
}

// Delete one row by id. FK cascades (visas/passports/entries) run server-side.
export async function deleteRow(sb: SupabaseClient, entity: Entity, id: string) {
  const { table } = ENTITY[entity];
  return sb.from(table).delete().eq("id", id);
}

// Wipe every collection (used by "reset all"). This is a shared workspace, so
// it clears the whole agency's data, not just the rows the caller happened to
// create — matching what the button says. Child tables go first so the deletes
// don't race the foreign keys.
export async function clearAllRows(sb: SupabaseClient) {
  const tables = ["race_entries", "visas", "passports", "documents", "calendar_events", "competitions", "athletes", "organizers"];
  // PostgREST refuses an unfiltered delete; "id is not null" matches every row.
  for (const t of tables) await sb.from(t).delete().not("id", "is", null);
}
