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
  disciplines: "disciplines", joined: "joined", pb: "pb", medals: "medals",
  nextEvent: "next_event", coach: "coach", progress: "progress", bio: "bio",
  contact: "contact", email: "email", contract: "contract",
  placeOfBirth: "place_of_birth", residence: "residence", maritalStatus: "marital_status",
  employment: "employment", taxCode: "tax_code", fidalNumber: "fidal_number", club: "club",
  height: "height", heightUnit: "height_unit", weight: "weight", weightUnit: "weight_unit",
  sponsor: "sponsor", shoeSize: "shoe_size", clothingSize: "clothing_size",
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

// Pull every collection the signed-in user owns, in one round of parallel queries.
export async function fetchLaneData(sb: SupabaseClient): Promise<LaneData> {
  const [a, o, c, e, v, p, ev, d] = await Promise.all([
    sb.from("athletes").select("*"),
    sb.from("organizers").select("*"),
    sb.from("competitions").select("*"),
    sb.from("race_entries").select("*"),
    sb.from("visas").select("*"),
    sb.from("passports").select("*"),
    sb.from("calendar_events").select("*"),
    sb.from("documents").select("*"),
  ]);
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

// Wipe every collection the user owns (used by "reset all").
export async function clearAllRows(sb: SupabaseClient, userId: string) {
  const tables = ["race_entries", "visas", "passports", "documents", "calendar_events", "competitions", "athletes", "organizers"];
  for (const t of tables) await sb.from(t).delete().eq("user_id", userId);
}
