// Typed client for the Lane 2 REST API. The single boundary between the
// browser and the backend — components never call fetch() directly.

import type {
  Athlete,
  Competition,
  Result,
  CalendarEvent,
  LaneDocument,
  AppNotification,
  TeamUser,
  Post,
  ActivityItem,
  AuditEntry,
  DeviceSession,
  Role,
  PermissionGroup,
  Passport,
  Visa,
  VisaKind,
  Organizer,
  RaceEntry,
} from "@/lib/types";
import type { VisaListRow } from "@/features/visas/queries";

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init?.headers } : init?.headers,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.error || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

const body = (data: unknown) => JSON.stringify(data);

export const api = {
  athletes: {
    list: () => request<Athlete[]>("/api/athletes"),
    get: (id: string) => request<Athlete>(`/api/athletes/${id}`),
    create: (data: Partial<Athlete>) => request<Athlete>("/api/athletes", { method: "POST", body: body(data) }),
    update: (id: string, data: Partial<Athlete>) => request<Athlete>(`/api/athletes/${id}`, { method: "PATCH", body: body(data) }),
    remove: (id: string) => request<Athlete>(`/api/athletes/${id}`, { method: "DELETE" }),
  },
  competitions: {
    list: () => request<Competition[]>("/api/competitions"),
    get: (id: string) => request<Competition>(`/api/competitions/${id}`),
    create: (data: Partial<Competition>) => request<Competition>("/api/competitions", { method: "POST", body: body(data) }),
    update: (id: string, data: Partial<Competition>) => request<Competition>(`/api/competitions/${id}`, { method: "PATCH", body: body(data) }),
    remove: (id: string) => request<Competition>(`/api/competitions/${id}`, { method: "DELETE" }),
    results: (id: string) => request<Result[]>(`/api/competitions/${id}/results`),
    addResult: (id: string, data: Partial<Result>) => request<Result>(`/api/competitions/${id}/results`, { method: "POST", body: body(data) }),
  },
  events: {
    list: () => request<CalendarEvent[]>("/api/events"),
    create: (data: Partial<CalendarEvent>) => request<CalendarEvent>("/api/events", { method: "POST", body: body(data) }),
    update: (id: string, data: Partial<CalendarEvent>) => request<CalendarEvent>(`/api/events/${id}`, { method: "PATCH", body: body(data) }),
    remove: (id: string) => request<CalendarEvent>(`/api/events/${id}`, { method: "DELETE" }),
  },
  documents: {
    list: () => request<LaneDocument[]>("/api/documents"),
    create: (data: Partial<LaneDocument>) => request<LaneDocument>("/api/documents", { method: "POST", body: body(data) }),
    remove: (id: string) => request<LaneDocument>(`/api/documents/${id}`, { method: "DELETE" }),
  },
  notifications: {
    list: () => request<AppNotification[]>("/api/notifications"),
    markAllRead: () => request<AppNotification[]>("/api/notifications", { method: "PATCH", body: body({ action: "mark-all-read" }) }),
  },
  users: {
    list: () => request<TeamUser[]>("/api/users"),
    invite: (data: Partial<TeamUser>) => request<TeamUser>("/api/users", { method: "POST", body: body(data) }),
    remove: (id: string) => request<TeamUser>(`/api/users/${id}`, { method: "DELETE" }),
  },
  posts: {
    list: () => request<Post[]>("/api/posts"),
    create: (data: Partial<Post>) => request<Post>("/api/posts", { method: "POST", body: body(data) }),
    update: (id: string, data: Partial<Post>) => request<Post>(`/api/posts/${id}`, { method: "PATCH", body: body(data) }),
  },
  activity: { list: () => request<ActivityItem[]>("/api/activity") },
  audit: { list: () => request<AuditEntry[]>("/api/audit") },
  sessions: {
    list: () => request<DeviceSession[]>("/api/sessions"),
    remove: (id: string) => request<DeviceSession>(`/api/sessions/${id}`, { method: "DELETE" }),
  },
  roles: () => request<{ roles: Role[]; permissions: PermissionGroup[]; matrix: Record<string, string[]> }>("/api/roles"),
  passports: {
    list: () => request<Passport[]>("/api/passports"),
    forAthlete: (athleteId: string) => request<Passport[]>(`/api/passports?athleteId=${athleteId}`),
    create: (data: Partial<Passport>) => request<Passport>("/api/passports", { method: "POST", body: body(data) }),
    update: (id: string, data: Partial<Passport>) => request<Passport>(`/api/passports/${id}`, { method: "PATCH", body: body(data) }),
    remove: (id: string) => request<Passport>(`/api/passports/${id}`, { method: "DELETE" }),
  },
  visas: {
    list: () => request<Visa[]>("/api/visas"),
    forAthlete: (athleteId: string) => request<Visa[]>(`/api/visas?athleteId=${athleteId}`),
    create: (data: Partial<Visa>) => request<Visa>("/api/visas", { method: "POST", body: body(data) }),
    update: (id: string, data: Partial<Visa>) => request<Visa>(`/api/visas/${id}`, { method: "PATCH", body: body(data) }),
    remove: (id: string) => request<Visa>(`/api/visas/${id}`, { method: "DELETE" }),
    listReport: (kind?: VisaKind) => request<VisaListRow[]>(`/api/visas/list${kind ? `?kind=${kind}` : ""}`),
  },
  organizers: {
    list: () => request<Organizer[]>("/api/organizers"),
    create: (data: Partial<Organizer>) => request<Organizer>("/api/organizers", { method: "POST", body: body(data) }),
    update: (id: string, data: Partial<Organizer>) => request<Organizer>(`/api/organizers/${id}`, { method: "PATCH", body: body(data) }),
    remove: (id: string) => request<Organizer>(`/api/organizers/${id}`, { method: "DELETE" }),
  },
  entries: {
    list: () => request<RaceEntry[]>("/api/entries"),
    forCompetition: (competitionId: string) => request<RaceEntry[]>(`/api/entries?competitionId=${competitionId}`),
    forAthlete: (athleteId: string) => request<RaceEntry[]>(`/api/entries?athleteId=${athleteId}`),
    create: (data: Partial<RaceEntry>) => request<RaceEntry>("/api/entries", { method: "POST", body: body(data) }),
    update: (id: string, data: Partial<RaceEntry>) => request<RaceEntry>(`/api/entries/${id}`, { method: "PATCH", body: body(data) }),
    remove: (id: string) => request<RaceEntry>(`/api/entries/${id}`, { method: "DELETE" }),
  },
};
