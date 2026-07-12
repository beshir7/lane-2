// =========================================================================
// Lane 2 — Domain types
// =========================================================================

export type EventCategoryKey =
  | "sprints"
  | "middle"
  | "long"
  | "hurdles"
  | "jumps"
  | "throws"
  | "relays";

export interface EventCategory {
  label: string;
  color: string;
  events: string[];
}

// Old system (photo_33/caption 4): exactly four states — Attivo / Infortunato /
// Incinta / Non attivo. No "training" state.
export type AthleteStatus = "active" | "injury" | "pregnant" | "inactive";
export type Gender = "F" | "M" | "X";

/** Contract/management tag shown next to a name: (E) Eric, (M) Monica, or none. */
export type ContractTag = "E" | "M" | null;

export interface Medals {
  gold: number;
  silver: number;
  bronze: number;
}

export interface Contact {
  email: string;
  phone: string;
}

export interface Athlete {
  id: string;
  first: string;
  last: string;
  initials: string;
  color: string;
  nationality: string;
  dob: string;
  age: number;
  gender: Gender;
  specialty: string;
  category: EventCategoryKey | string;
  squad: string;
  status: AthleteStatus;
  /** Disciplines chosen via "Seleziona discipline" — the ones shown in the
   *  athlete's personal-best table (photo_32 / caption 5). Keys of `pb`. */
  disciplines?: string[];
  joined: string;
  pb: Record<string, string>;
  medals: Medals;
  nextEvent: string;
  coach: string;
  progress: number;
  bio: string;
  contact: Contact;
  email: string;

  // ---- Agency fields (distance-runner management) ----
  /** (E) Eric-managed, (M) Monica-managed, null = no tag (e.g. Italian). */
  contract?: ContractTag;
  placeOfBirth?: string;
  residence?: string;
  maritalStatus?: string;
  employment?: string;
  taxCode?: string;
  fidalNumber?: string;
  club?: string;
  height?: number; // value in `heightUnit`
  heightUnit?: "cm" | "ft";
  weight?: number; // value in `weightUnit`
  weightUnit?: "kg" | "lb";
  sponsor?: string;
  shoeSize?: string;
  clothingSize?: string;
}

// =========================================================================
// Passports & visas — first-class travel documents per athlete.
// =========================================================================

export interface Passport {
  id: string;
  athleteId: string;
  number: string;
  nation: string;
  issued: string;   // ISO date
  expiry: string;   // ISO date
  photo?: string;   // scanned image as a data: URL
  note?: string;
}

/** Free-form but conventionally: "Schengen M90", "Schengen single", "UK M180", "US B1/B2", "US P1", "US Green card". */
export type VisaKind = "Schengen" | "UK" | "US" | "Other";

export interface Visa {
  id: string;
  athleteId: string;
  kind: VisaKind;
  number?: string;   // visa number (photo_29: "Numero")
  type: string;      // full label, e.g. "Schengen M90"
  event?: string;    // context: "Road", "Meeting", "Road / Cross", …
  validFrom: string; // ISO date
  validTo: string;   // ISO date
  notKnown?: boolean;// "Dato non conosciuto" — dates unknown
  embassy: string;   // issuing embassy nationality, e.g. "Italiana"
  sentToFederation?: boolean; // "Spedito a federazione"
  sentToAgent?: boolean;      // "Spedito a Sangita o Gemedu"
  appointment?: string;       // "Appuntamento" — embassy appointment date
  archived?: boolean;         // "Archivia"
  photo?: string;             // scanned image as a data: URL
  note?: string;
}

// =========================================================================
// Race organizers, meeting disciplines & entries (the entry workflow).
// =========================================================================

export interface Organizer {
  id: string;
  name: string;        // display name — conventionally "Lastname Firstname"
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  nation: string;
}

/** Race level / label (photo_19 dropdown): national, international, DL, Gold… */
export const RACE_LEVELS = ["National", "International", "DL", "Gold", "Silver", "Bronze", "Label"] as const;
export type RaceLevel = (typeof RACE_LEVELS)[number] | string;

/** Race category used for filtering the calendar. */
export type RaceCategory =
  | "marathon"
  | "half-marathon"
  | "road"
  | "cross"
  | "meeting"
  | "indoor";

/** A discipline offered at a meeting/race, split by gender and dated. */
export interface MeetingDiscipline {
  discipline: string;       // "100m", "Marathon", "10Km", …
  gender: "M" | "W";
  date: string;             // ISO date (a meeting can span days)
  indoor?: boolean;         // photo_16 "Indoor" checkbox
  toConfirm?: boolean;      // photo_16 "Da confermare"
}

/** Where an athlete stands in a race's entry pipeline. */
export type EntryStatus = "proposed" | "waiting" | "accepted" | "ok";

/** One athlete entered into one discipline of one competition. */
export interface RaceEntry {
  id: string;
  competitionId: string;
  athleteId: string;
  discipline: string;
  gender: "M" | "W";
  status: EntryStatus;
  // Result (filled once the race is run):
  position?: number;
  time?: string;
  wind?: string;
  note?: string;
}

export type CompetitionStatus = "upcoming" | "live" | "completed";
export type CompetitionTier = "tier-1" | "tier-2" | "tier-3";

export interface CompetitionSummary {
  gold: number;
  silver: number;
  bronze: number;
  points: number;
}

export interface Competition {
  id: string;
  name: string;
  short: string;
  location: string;
  country: string;
  date: string;
  endDate: string;
  type: string;
  tier: CompetitionTier;
  status: CompetitionStatus;
  entries: number;
  results: number;
  events: string[];
  summary?: CompetitionSummary;

  // ---- Agency / meeting fields ----
  category?: RaceCategory;      // marathon | half-marathon | road | cross | meeting | indoor
  level?: string;              // "DL", "Gold", "Silver", "Bronze", "Label", "int'l", "national"
  organizerId?: string | null;
  // Race organizer contact typed directly on the race form (photo_19, caption 22):
  // surname, name, phone, e-mail address.
  contactSurname?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  disciplines?: MeetingDiscipline[];
  webSite?: string;
  notes?: string;
}

export interface Result {
  athleteId: string;
  event: string;
  mark: string;
  place: number;
  points: number;
  wind: string;
  note: string;
}

export type ResultsMap = Record<string, Result[]>;

export type CalendarCategory = "training" | "competition" | "travel" | "meeting";

export interface CalendarEvent {
  id: string;
  title: string;
  category: CalendarCategory;
  date: string;
  startHour: number;
  duration: number;
  athletes: string[];
  location: string;
  competitionId?: string;
}

export type DocType = "pdf" | "image" | "doc";

export interface LaneDocument {
  id: string;
  name: string;
  type: DocType;
  category: string;
  size: string;
  athleteId: string | null;
  uploaded: string;
  expires: string | null;
  icon: string;
}

export interface DocCategory {
  id: string;
  label: string;
  icon: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  users: number;
  color: string;
}

export interface Permission {
  id: string;
  label: string;
}

export interface PermissionGroup {
  group: string;
  items: Permission[];
}

export type PermissionMatrix = Record<string, Set<string>>;

export interface TeamUser {
  id: string;
  name: string;
  role: string;
  email: string;
  initials: string;
  color: string;
  active: boolean;
  last: string;
}

export type NotificationType = "alert" | "info" | "warn";

export interface AppNotification {
  id: string;
  type: NotificationType;
  icon: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  category: string;
  // Where clicking the notification navigates (live competition-derived items).
  page?: string;
  arg?: string;
}

export interface ActivityItem {
  id: string;
  user: string;
  initials: string;
  color: string;
  action: string;
  target: string;
  time: string;
  icon: string;
}

export type PostStatus = "published" | "draft" | "scheduled";

export interface Post {
  id: string;
  title: string;
  status: PostStatus;
  author: string;
  color: string;
  date: string;
  views: number;
  category: string;
  body?: string;
}

export interface AuditEntry {
  id: string;
  ts: string;
  who: string;
  whoColor: string;
  action: string;
  variant: BadgeVariant;
  target: string;
  ip: string;
}

export interface DeviceSession {
  id: string;
  device: string;
  icon: string;
  loc: string;
  current: boolean;
  last: string;
}

// ---- App-level shared UI types ------------------------------------------

export type Page =
  | "dashboard"
  | "athletes"
  | "athlete-detail"
  | "competitions"
  | "competition-detail"
  | "calendar"
  | "documents"
  | "cms"
  | "notifications"
  | "settings"
  | "rbac";

export type BadgeVariant = "accent" | "success" | "warning" | "danger" | "info" | "";

export interface Toast {
  id?: string;
  title: string;
  body?: string;
  variant?: "success" | "info" | "warning" | "danger";
  duration?: number;
}

export interface Tweaks {
  theme: "dark" | "light";
  sidebar: "expanded" | "rail" | "floating";
  accent: string;
  density: string;
}
