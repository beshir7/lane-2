"use client";

// =========================================================================
// LaneProvider — the single client-side source of truth.
//
// SUPABASE MODE: the eight core collections (athletes, organizers,
// competitions, race entries, visas, passports, calendar events, documents)
// are loaded from and written to Supabase. This is ONE SHARED WORKSPACE —
// every signed-in member sees and edits the same data, and every member is an
// admin; Row-Level Security only keeps anonymous callers out. Every mutation
// updates local state optimistically and mirrors the change to the database.
// The remaining UI-only collections (results, notifications, posts, …) live in
// memory for this session.
// =========================================================================

import { translate, type Lang } from "@/lib/i18n";
import { isBetterMark } from "@/utils";
import { daysUntil, todayIso } from "@/utils/dates";
import { createClient } from "@/lib/supabase/client";
import { clearAllRows, deleteRow, fetchLaneData, logPageLoadBreakdown, perfEnabled, saveRow, updateRow } from "@/lib/supabase/lane-db";
import type {
    ActivityItem,
    AppNotification,
    Athlete,
    AuditEntry,
    CalendarEvent,
    Competition,
    DeviceSession,
    LaneDocument,
    Organizer,
    Page,
    Passport,
    Post,
    RaceEntry,
    Result,
    ResultsMap,
    TeamUser,
    Tweaks,
    Visa,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "./primitives";

const LANG_KEY = "lane-lang";
const newId = (p: string) => p + Math.random().toString(36).slice(2, 8);
const today = todayIso;

// The signed-in account, shaped for display in the topbar / sidebar. Built from
// the Supabase user + the profile fields stored in user_metadata at signup and
// in Settings → Profile.
export interface CurrentUser {
  name: string;
  email: string;
  color: string;
  title: string;
}

function toCurrentUser(user: { email?: string | null; user_metadata?: Record<string, any> | null }): CurrentUser {
  const m = (user.user_metadata || {}) as Record<string, string>;
  const name = `${m.first_name || ""} ${m.last_name || ""}`.trim() || user.email || "Account";
  return { name, email: user.email || "", color: m.color || "#5b6ef5", title: m.title || "Member" };
}

interface LaneContextValue {
  loading: boolean;
  /** Re-read every collection from the database. Throttled unless `force`. */
  refresh: (force?: boolean) => Promise<void>;

  currentUser: CurrentUser | null;
  // Shared workspace: every signed-in member is an admin.
  isAdmin: boolean;

  athletes: Athlete[];
  competitions: Competition[];
  events: CalendarEvent[];
  results: ResultsMap;
  notifications: AppNotification[];
  documents: LaneDocument[];
  users: TeamUser[];
  posts: Post[];
  activity: ActivityItem[];
  audit: AuditEntry[];
  sessions: DeviceSession[];
  passports: Passport[];
  visas: Visa[];
  organizers: Organizer[];
  entries: RaceEntry[];
  unreadCount: number;

  createAthlete: (data: Partial<Athlete>) => void;
  updateAthlete: (id: string, data: Partial<Athlete>) => void;
  deleteAthlete: (id: string) => void;

  createCompetition: (data: Partial<Competition>) => void;
  updateCompetition: (id: string, data: Partial<Competition>) => void;
  deleteCompetition: (id: string) => void;
  loadResults: (compId: string) => void;
  addResult: (compId: string, r: Partial<Result>) => void;

  createEvent: (data: Partial<CalendarEvent>) => void;
  updateEvent: (id: string, data: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  addDocuments: (files: { name: string; size?: string }[]) => void;
  deleteDocument: (id: string) => void;

  inviteUser: (data: Partial<TeamUser>) => void;
  removeUser: (id: string) => void;

  savePost: (data: Partial<Post> & { id?: string }, isNew: boolean) => void;

  revokeSession: (id: string) => void;

  createPassport: (data: Partial<Passport>) => void;
  updatePassport: (id: string, data: Partial<Passport>) => void;
  deletePassport: (id: string) => void;

  createVisa: (data: Partial<Visa>) => void;
  updateVisa: (id: string, data: Partial<Visa>) => void;
  deleteVisa: (id: string) => void;

  createOrganizer: (data: Partial<Organizer>) => void;
  updateOrganizer: (id: string, data: Partial<Organizer>) => void;
  deleteOrganizer: (id: string) => void;

  createEntry: (data: Partial<RaceEntry>) => void;
  updateEntry: (id: string, data: Partial<RaceEntry>) => void;
  deleteEntry: (id: string) => void;

  markAllRead: () => void;

  resetAll: () => void;

  tweaks: Tweaks;
  setTweak: (k: keyof Tweaks | Partial<Tweaks>, v?: string) => void;

  authenticated: boolean;
  setAuthenticated: (v: boolean) => void;

  cmdOpen: boolean;
  setCmdOpen: (v: boolean) => void;

  tweaksOpen: boolean;
  setTweaksOpen: (v: boolean) => void;

  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;

  navigate: (page: Page | string, arg?: string | null) => void;
  // Warm the client Router Cache for a route so a later navigate() is instant.
  prefetch: (page: Page | string, arg?: string | null) => void;
}

const LaneCtx = createContext<LaneContextValue | null>(null);

const TWEAK_DEFAULTS: Tweaks = { theme: "dark", sidebar: "expanded", accent: "#6b7dff", density: "comfortable" };

export function LaneProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const push = useToast();
  const supabase = useMemo(() => createClient(), []);
  // The signed-in user's id, stamped onto every insert so RLS accepts the row.
  const userIdRef = useRef<string | null>(null);

  // Mirror a database write to the server; surface a toast if it fails so an
  // optimistic local change that didn't persist doesn't go unnoticed.
  const persist = useCallback(
    (p: PromiseLike<{ error: { message: string } | null }>) => {
      Promise.resolve(p).then((res) => {
        const error = (res as { error: { message: string } | null }).error;
        if (error) push({ title: "Couldn't save to server", body: error.message, variant: "danger" });
      });
    },
    [push]
  );

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [results, setResults] = useState<ResultsMap>({});
  // Notifications are derived live from real data (races, expiries); this set
  // tracks which the user has marked read.
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set());
  const [documents, setDocuments] = useState<LaneDocument[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [passports, setPassports] = useState<Passport[]>([]);
  const [visas, setVisas] = useState<Visa[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [entries, setEntries] = useState<RaceEntry[]>([]);
  // Latest athletes/competitions, readable from callbacks without stale closures
  // (used by the personal-best sync when a result is entered).
  const athletesRef = useRef<Athlete[]>([]);
  const competitionsRef = useRef<Competition[]>([]);
  useEffect(() => { athletesRef.current = athletes; }, [athletes]);
  useEffect(() => { competitionsRef.current = competitions; }, [competitions]);

  const [authenticated, setAuthenticated] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  // ----- Language (persisted; English default) -----
  // Starts "en" on server + first client render (no hydration mismatch), then
  // adopts the saved choice on mount.
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "it" || saved === "en") setLangState(saved);
    } catch {}
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(LANG_KEY, l); } catch {}
  }, []);
  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);

  // ----- Tweaks (persisted) -----
  const [tweaks, setTweaks] = useState<Tweaks>(TWEAK_DEFAULTS);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lane-tweaks");
      if (saved) setTweaks((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}
  }, []);
  const setTweak = useCallback<LaneContextValue["setTweak"]>((k, v) => {
    setTweaks((prev) => {
      const next = typeof k === "object" ? { ...prev, ...k } : { ...prev, [k]: v };
      try {
        localStorage.setItem("lane-tweaks", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
    document.documentElement.style.setProperty("--accent", tweaks.accent);
    document.documentElement.style.setProperty("--accent-soft", tweaks.accent + "22");
  }, [tweaks.theme, tweaks.accent]);

  // ----- Load the eight core collections from Supabase (per-user via RLS) -----
  // When the collections were last read, so a revalidation can skip work that
  // would only repeat a fetch we just did.
  const loadedAtRef = useRef(0);

  const applyData = useCallback((d: Awaited<ReturnType<typeof fetchLaneData>>) => {
    setAthletes(d.athletes);
    setCompetitions(d.competitions);
    setOrganizers(d.organizers);
    setEntries(d.entries);
    setVisas(d.visas);
    setPassports(d.passports);
    setEvents(d.events);
    setDocuments(d.documents);
    loadedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      // The auth check and the table reads don't depend on each other — RLS
      // scopes every row to the caller server-side — so they run together
      // instead of one after the other. That removes a full round-trip from
      // the time-to-first-paint on every cold load.
      const perf = perfEnabled();
      const t0 = perf ? performance.now() : 0;
      const [userRes, data] = await Promise.all([
        perf
          ? supabase.auth.getUser().then((r: Awaited<ReturnType<typeof supabase.auth.getUser>>) => {
              // eslint-disable-next-line no-console
              console.info(`[lane-perf] ${"auth.getUser".padEnd(16)} ${(performance.now() - t0).toFixed(0).padStart(5)} ms`);
              return r;
            })
          : supabase.auth.getUser(),
        fetchLaneData(supabase).catch(() => null),
      ]);
      if (perf) {
        // eslint-disable-next-line no-console
        console.info(`[lane-perf] ${"TOTAL to data".padEnd(16)} ${(performance.now() - t0).toFixed(0).padStart(5)} ms  ·  page loaded at ${performance.now().toFixed(0)} ms`);
        logPageLoadBreakdown();
      }
      if (!active) return;
      const user = userRes.data.user;
      if (!user) { setLoading(false); return; } // middleware will redirect to /signin
      userIdRef.current = user.id;
      setCurrentUser(toCurrentUser(user));
      if (data) applyData(data);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [supabase, applyData]);

  // ----- Revalidation -------------------------------------------------------
  // The collections are a client-side cache of the database. Local writes keep
  // it correct for this tab, but a change made elsewhere (another tab, another
  // device, the Supabase dashboard) would otherwise never arrive. Re-read when
  // the tab regains focus or the network comes back, throttled so hopping
  // between windows doesn't hammer the API.
  const REVALIDATE_AFTER_MS = 60_000;
  const refreshingRef = useRef(false);
  const refresh = useCallback(async (force = false) => {
    if (!userIdRef.current || refreshingRef.current) return;
    if (!force && Date.now() - loadedAtRef.current < REVALIDATE_AFTER_MS) return;
    refreshingRef.current = true;
    try {
      applyData(await fetchLaneData(supabase));
    } catch {
      // keep whatever is on screen; the next focus will try again
    } finally {
      refreshingRef.current = false;
    }
  }, [supabase, applyData]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const onOnline = () => { void refresh(true); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [refresh]);

  // Keep the displayed account in sync with auth changes: a profile save
  // (USER_UPDATED), a fresh sign-in, or a sign-out all refresh it live.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, session: { user: { email?: string | null; user_metadata?: Record<string, any> | null } } | null) => {
      setCurrentUser(session?.user ? toCurrentUser(session.user) : null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // ----- Navigation -----
  // Resolve a page (+optional id) to its URL, shared by navigate() and prefetch().
  const hrefFor = useCallback((page: Page | string, arg?: string | null) => {
    const routes: Record<string, string> = {
      dashboard: "/dashboard",
      athletes: "/athletes",
      competitions: "/competitions",
      races: "/competitions",
      organizers: "/organizers",
      calendar: "/calendar",
      documents: "/documents",
      cms: "/cms",
      reports: "/reports",
      notifications: "/notifications",
      role: "/role",
    };
    if (page === "athlete-detail") return `/athletes/${arg}`;
    if (page === "competition-detail") return `/competitions/${arg}`;
    if (page === "settings") return arg ? `/settings?tab=${arg}` : "/settings";
    return routes[page as string] || `/${page}`;
  }, []);
  const navigate = useCallback<LaneContextValue["navigate"]>((page, arg) => {
    router.push(hrefFor(page, arg));
  }, [router, hrefFor]);
  const prefetch = useCallback<LaneContextValue["prefetch"]>((page, arg) => {
    try { router.prefetch(hrefFor(page, arg)); } catch { /* prefetch is best-effort */ }
  }, [router, hrefFor]);

  // ----- Athletes -----
  const createAthlete = useCallback((data: Partial<Athlete>) => {
    const a = {
      medals: { gold: 0, silver: 0, bronze: 0 }, pb: {}, contact: { email: "", phone: "" },
      color: "#5b6ef5", progress: 50, status: "active", squad: "Senior B", nextEvent: "—", joined: today(),
      ...data,
      id: data.id || newId("a"),
      initials: data.initials || ((data.first?.[0] || "") + (data.last?.[0] || "")).toUpperCase(),
    } as Athlete;
    setAthletes((prev) => [a, ...prev]);
    if (userIdRef.current) persist(saveRow(supabase, userIdRef.current, "athlete", a));
    push({ title: "Athlete added", body: `${a.first} ${a.last}`, variant: "success" });
  }, [push, persist, supabase]);
  const updateAthlete = useCallback((id: string, data: Partial<Athlete>) => {
    setAthletes((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
    persist(updateRow(supabase, "athlete", id, data));
    push({ title: "Profile saved", variant: "success" });
  }, [push, persist, supabase]);
  const deleteAthlete = useCallback((id: string) => {
    // FK cascade removes the athlete's passports, visas and entries server-side.
    setAthletes((prev) => prev.filter((x) => x.id !== id));
    setPassports((prev) => prev.filter((p) => p.athleteId !== id));
    setVisas((prev) => prev.filter((v) => v.athleteId !== id));
    setEntries((prev) => prev.filter((e) => e.athleteId !== id));
    persist(deleteRow(supabase, "athlete", id));
    push({ title: "Athlete removed", variant: "info" });
  }, [push, persist, supabase]);

  // ----- Competitions & results -----
  const createCompetition = useCallback((data: Partial<Competition>) => {
    const c = { events: [], disciplines: [], entries: 0, results: 0, status: "upcoming", tier: "tier-1", ...data, id: data.id || newId("c") } as Competition;
    setCompetitions((prev) => [c, ...prev]);
    if (userIdRef.current) persist(saveRow(supabase, userIdRef.current, "competition", c));
    push({ title: "Competition created", body: c.name, variant: "success" });
  }, [push, persist, supabase]);
  const updateCompetition = useCallback((id: string, data: Partial<Competition>) => {
    setCompetitions((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    persist(updateRow(supabase, "competition", id, data));
    push({ title: "Competition saved", variant: "success" });
  }, [push, persist, supabase]);
  const deleteCompetition = useCallback((id: string) => {
    // FK cascade removes this competition's race entries server-side.
    setCompetitions((prev) => prev.filter((c) => c.id !== id));
    setEntries((prev) => prev.filter((e) => e.competitionId !== id));
    persist(deleteRow(supabase, "competition", id));
    push({ title: "Competition removed", variant: "info" });
  }, [push, persist, supabase]);
  const loadResults = useCallback(() => {}, []);
  const addResult = useCallback((compId: string, r: Partial<Result>) => {
    const place = Number(r.place ?? 1);
    const full: Result = { athleteId: r.athleteId || "", event: r.event || "", mark: r.mark || "", place, points: r.points ?? Math.max(0, 10 - place + 1), wind: r.wind || "", note: r.note || "" };
    setResults((prev) => ({ ...prev, [compId]: [...(prev[compId] || []), full] }));
    setCompetitions((prev) => prev.map((c) => (c.id === compId ? { ...c, results: (c.results || 0) + 1 } : c)));
    push({ title: "Result saved", variant: "success" });
  }, [push]);

  // ----- Events -----
  const createEvent = useCallback((data: Partial<CalendarEvent>) => {
    const e = { athletes: [], category: "meeting", startHour: 9, duration: 1.5, location: "", ...data, id: data.id || newId("e") } as CalendarEvent;
    setEvents((prev) => [e, ...prev]);
    if (userIdRef.current) persist(saveRow(supabase, userIdRef.current, "event", e));
    push({ title: "Event scheduled", body: e.title, variant: "success" });
  }, [push, persist, supabase]);
  const updateEvent = useCallback((id: string, data: Partial<CalendarEvent>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
    persist(updateRow(supabase, "event", id, data));
    push({ title: "Event updated", variant: "info" });
  }, [push, persist, supabase]);
  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    persist(deleteRow(supabase, "event", id));
    push({ title: "Event removed", variant: "info" });
  }, [push, persist, supabase]);

  // ----- Documents -----
  const addDocuments = useCallback((files: { name: string; size?: string }[]) => {
    const created = files.map((f) => {
      const isPdf = f.name.toLowerCase().endsWith(".pdf");
      return { id: newId("d"), name: f.name, type: isPdf ? "pdf" : "image", icon: isPdf ? "filePdf" : "fileImage", category: "media", size: f.size || "—", athleteId: null, uploaded: today(), expires: null } as LaneDocument;
    });
    setDocuments((prev) => [...created, ...prev]);
    if (userIdRef.current) created.forEach((d) => persist(saveRow(supabase, userIdRef.current!, "document", d)));
    push({ title: `${created.length} file${created.length > 1 ? "s" : ""} added`, variant: "success" });
  }, [push, persist, supabase]);
  const deleteDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    persist(deleteRow(supabase, "document", id));
    push({ title: "Document deleted", variant: "info" });
  }, [push, persist, supabase]);

  // ----- Users -----
  const inviteUser = useCallback((data: Partial<TeamUser>) => {
    const u = { color: "#5b6ef5", active: true, last: "Invited", role: "r-coach", ...data, id: newId("u"), initials: (data.name || "?").split(" ").map((s) => s[0]).join("").toUpperCase().slice(0, 2) } as TeamUser;
    setUsers((prev) => [u, ...prev]);
    push({ title: "Invitation sent", body: data.email, variant: "success" });
  }, [push]);
  const removeUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    push({ title: "Member removed", variant: "info" });
  }, [push]);

  // ----- Posts (CMS) -----
  const savePost = useCallback((data: Partial<Post> & { id?: string }, isNew: boolean) => {
    if (isNew) {
      const p = { author: "You", color: "#5b6ef5", date: today(), views: 0, status: "draft", category: "News", ...data, id: newId("p") } as Post;
      setPosts((prev) => [p, ...prev]);
    } else if (data.id) {
      setPosts((prev) => prev.map((p) => (p.id === data.id ? { ...p, ...data } : p)));
    }
    push({ title: data.status === "published" ? "Post published" : "Draft saved", body: data.title, variant: "success" });
  }, [push]);

  // ----- Sessions -----
  const revokeSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    push({ title: "Session revoked", variant: "info" });
  }, [push]);

  // ----- Passports -----
  const createPassport = useCallback((data: Partial<Passport>) => {
    const pp = { nation: "", number: "", issued: "", expiry: "", note: "", ...data, id: data.id || newId("pp") } as Passport;
    setPassports((prev) => [pp, ...prev]);
    if (userIdRef.current) persist(saveRow(supabase, userIdRef.current, "passport", pp));
    push({ title: "Passport added", variant: "success" });
  }, [push, persist, supabase]);
  const updatePassport = useCallback((id: string, data: Partial<Passport>) => {
    setPassports((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    persist(updateRow(supabase, "passport", id, data));
    push({ title: "Passport updated", variant: "info" });
  }, [push, persist, supabase]);
  const deletePassport = useCallback((id: string) => {
    setPassports((prev) => prev.filter((x) => x.id !== id));
    persist(deleteRow(supabase, "passport", id));
    push({ title: "Passport removed", variant: "info" });
  }, [push, persist, supabase]);

  // ----- Visas -----
  const createVisa = useCallback((data: Partial<Visa>) => {
    const v = { kind: "Other", type: "", event: "", validFrom: "", validTo: "", embassy: "", sentToFederation: false, note: "", ...data, id: data.id || newId("v") } as Visa;
    setVisas((prev) => [v, ...prev]);
    if (userIdRef.current) persist(saveRow(supabase, userIdRef.current, "visa", v));
    push({ title: "Visa added", variant: "success" });
  }, [push, persist, supabase]);
  const updateVisa = useCallback((id: string, data: Partial<Visa>) => {
    setVisas((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    persist(updateRow(supabase, "visa", id, data));
    push({ title: "Visa updated", variant: "info" });
  }, [push, persist, supabase]);
  const deleteVisa = useCallback((id: string) => {
    setVisas((prev) => prev.filter((x) => x.id !== id));
    persist(deleteRow(supabase, "visa", id));
    push({ title: "Visa removed", variant: "info" });
  }, [push, persist, supabase]);

  // ----- Organizers -----
  const createOrganizer = useCallback((data: Partial<Organizer>) => {
    const o = { name: "", email: "", phone: "", nation: "", ...data, id: data.id || newId("o") } as Organizer;
    setOrganizers((prev) => [o, ...prev]);
    if (userIdRef.current) persist(saveRow(supabase, userIdRef.current, "organizer", o));
    push({ title: "Organizer added", body: data.name, variant: "success" });
  }, [push, persist, supabase]);
  const updateOrganizer = useCallback((id: string, data: Partial<Organizer>) => {
    setOrganizers((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    persist(updateRow(supabase, "organizer", id, data));
    push({ title: "Organizer updated", variant: "info" });
  }, [push, persist, supabase]);
  const deleteOrganizer = useCallback((id: string) => {
    setOrganizers((prev) => prev.filter((x) => x.id !== id));
    persist(deleteRow(supabase, "organizer", id));
    push({ title: "Organizer removed", variant: "info" });
  }, [push, persist, supabase]);

  // ----- Personal bests -----
  // A result that beats the athlete's stored PB for that discipline promotes it
  // automatically, recording which competition it came from so the profile can
  // link back to it.
  const syncPb = useCallback((entry: Pick<RaceEntry, "athleteId" | "discipline" | "time" | "competitionId" | "position">) => {
    if (!entry.time || !entry.discipline) return;
    const athlete = athletesRef.current.find((a) => a.id === entry.athleteId);
    if (!athlete) return;
    if (!isBetterMark(entry.time, athlete.pb?.[entry.discipline])) return;
    const comp = competitionsRef.current.find((c) => c.id === entry.competitionId);
    const pb = { ...(athlete.pb || {}), [entry.discipline]: entry.time };
    const pbMeta = {
      ...(athlete.pbMeta || {}),
      [entry.discipline]: {
        competitionId: entry.competitionId,
        date: comp?.date || "",
        place: entry.position,
        venue: comp?.location || "",
      },
    };
    setAthletes((prev) => prev.map((a) => (a.id === athlete.id ? { ...a, pb, pbMeta } : a)));
    persist(updateRow(supabase, "athlete", athlete.id, { pb, pbMeta }));
    push({ title: "New personal best", body: `${athlete.first} ${athlete.last} · ${entry.discipline} ${entry.time}`, variant: "success" });
  }, [push, persist, supabase]);

  // ----- Race entries (recount keeps competition counts in sync) -----
  const recount = useCallback((competitionId: string, list: RaceEntry[]) => {
    const forComp = list.filter((e) => e.competitionId === competitionId);
    const counts = { entries: forComp.length, results: forComp.filter((e) => e.position != null || e.time).length };
    setCompetitions((prev) => prev.map((c) => (c.id === competitionId ? { ...c, ...counts } : c)));
    persist(updateRow(supabase, "competition", competitionId, counts));
  }, [persist, supabase]);
  const createEntry = useCallback((data: Partial<RaceEntry>) => {
    const entry = { discipline: "", gender: "M", status: "proposed", time: "", wind: "", note: "", ...data, id: data.id || newId("en") } as RaceEntry;
    setEntries((prev) => { const next = [entry, ...prev]; recount(entry.competitionId, next); return next; });
    if (userIdRef.current) persist(saveRow(supabase, userIdRef.current, "entry", entry));
    syncPb(entry);
    push({ title: "Athlete entered", variant: "success" });
  }, [push, persist, supabase, recount, syncPb]);
  const updateEntry = useCallback((id: string, data: Partial<RaceEntry>) => {
    let merged: RaceEntry | undefined;
    setEntries((prev) => { const next = prev.map((x) => (x.id === id ? { ...x, ...data } : x)); merged = next.find((x) => x.id === id); if (merged) recount(merged.competitionId, next); return next; });
    persist(updateRow(supabase, "entry", id, data));
    if (merged) syncPb(merged);
  }, [persist, supabase, recount, syncPb]);
  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => { const gone = prev.find((x) => x.id === id); const next = prev.filter((x) => x.id !== id); if (gone) recount(gone.competitionId, next); return next; });
    persist(deleteRow(supabase, "entry", id));
    push({ title: "Entry removed", variant: "info" });
  }, [push, persist, supabase, recount]);

  // ----- Notifications (derived live from real data) -----
  // Built from upcoming races and passport / visa / document expiries so the
  // bell always reflects true activity and deadlines — no seeded data.
  const notifications = useMemo<AppNotification[]>(() => {
    const dayWord = (n: number) => (Math.abs(n) === 1 ? translate(lang, "time.day") : translate(lang, "time.days"));
    const nameOf = (id: string) => { const a = athletes.find((x) => x.id === id); return a ? `${a.first} ${a.last}` : ""; };
    const tr = (k: string) => translate(lang, k);
    const list: AppNotification[] = [];

    // Upcoming races within the next 30 days.
    competitions.forEach((c) => {
      const d = daysUntil(c.date);
      if (d == null || d < 0 || d > 30) return;
      const entered = entries.filter((e) => e.competitionId === c.id).length;
      list.push({
        id: `race-${c.id}`, type: d <= 3 ? "warn" : "info", icon: "trophy", category: "competition",
        title: d === 0 ? tr("notif.raceToday") : `${tr("notif.raceIn")} ${d} ${dayWord(d)}`,
        body: `${c.name}${c.location ? " · " + c.location : ""} · ${entered} ${tr("dash.entered")}`,
        time: c.date, unread: true, page: "competition-detail", arg: c.id,
      });
    });
    // Passport expiries (up to 90 days out, or expired within the last 30).
    passports.forEach((p) => {
      const d = daysUntil(p.expiry);
      if (d == null || d > 90 || d < -30) return;
      list.push({
        id: `pp-${p.id}`, type: d < 0 ? "alert" : d < 30 ? "warn" : "info", icon: "globe", category: "document",
        title: d < 0 ? tr("notif.passportExpired") : `${tr("notif.passportIn")} ${d} ${dayWord(d)}`,
        body: nameOf(p.athleteId), time: p.expiry || "", unread: true, page: "athlete-detail", arg: p.athleteId,
      });
    });
    // Visa expiries.
    visas.forEach((v) => {
      if (v.archived) return;
      const d = daysUntil(v.validTo);
      if (d == null || d > 90 || d < -30) return;
      list.push({
        id: `visa-${v.id}`, type: d < 0 ? "alert" : d < 30 ? "warn" : "info", icon: "fileText", category: "document",
        title: d < 0 ? tr("notif.visaExpired") : `${tr("notif.visaIn")} ${d} ${dayWord(d)}`,
        body: `${nameOf(v.athleteId)}${v.type ? " · " + v.type : ""}`, time: v.validTo || "", unread: true, page: "athlete-detail", arg: v.athleteId,
      });
    });
    // Other document expiries (e.g. contracts).
    documents.forEach((doc) => {
      const d = daysUntil(doc.expires);
      if (d == null || d > 90 || d < -30) return;
      list.push({
        id: `doc-${doc.id}`, type: d < 0 ? "alert" : d < 30 ? "warn" : "info", icon: "fileText", category: "document",
        title: d < 0 ? tr("notif.docExpired") : `${tr("notif.docIn")} ${d} ${dayWord(d)}`,
        body: doc.name, time: doc.expires || "", unread: true, page: "documents",
      });
    });

    // Soonest / most overdue first, then apply read state.
    list.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    return list.map((n) => ({ ...n, unread: !readNotifIds.has(n.id) }));
  }, [competitions, entries, passports, visas, documents, athletes, readNotifIds, lang]);

  // Recent activity (dashboard) — derived from what actually happened: results
  // already recorded, and documents that have been uploaded. Newest first.
  const activity = useMemo<ActivityItem[]>(() => {
    const today = todayIso();
    const items: ActivityItem[] = [];

    entries.forEach((e) => {
      if (e.position == null) return;
      const c = competitions.find((x) => x.id === e.competitionId);
      const a = athletes.find((x) => x.id === e.athleteId);
      if (!c || !a || !c.date || c.date > today) return;
      items.push({
        id: `act-res-${e.id}`, user: `${a.first} ${a.last}`, initials: a.initials, color: a.color,
        action: translate(lang, "act.result", { p: e.position }),
        target: c.name, time: c.date, icon: "trophy",
      });
    });

    documents.forEach((d) => {
      const a = d.athleteId ? athletes.find((x) => x.id === d.athleteId) : undefined;
      items.push({
        id: `act-doc-${d.id}`,
        user: a ? `${a.first} ${a.last}` : translate(lang, "act.agency"),
        initials: a?.initials || "LA", color: a?.color || "var(--accent)",
        action: translate(lang, "act.uploaded"), target: d.name, time: d.uploaded || "", icon: "upload",
      });
    });

    return items.sort((x, y) => (y.time || "").localeCompare(x.time || ""));
  }, [entries, competitions, athletes, documents, lang]);

  const markAllRead = useCallback(() => {
    setReadNotifIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      return next;
    });
    push({ title: "All caught up", variant: "success" });
  }, [push, notifications]);

  // ----- Reset everything -----
  const resetAll = useCallback(() => {
    setAthletes([]); setCompetitions([]); setEvents([]); setResults({}); setReadNotifIds(new Set()); setDocuments([]);
    setUsers([]); setPosts([]); setAudit([]); setSessions([]); setPassports([]); setVisas([]); setOrganizers([]); setEntries([]);
    if (userIdRef.current) persist(clearAllRows(supabase).then(() => ({ error: null })));
    push({ title: "All data cleared", variant: "info" });
  }, [push, persist, supabase]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const value = useMemo<LaneContextValue>(
    () => ({
      loading, refresh, currentUser, isAdmin: !!currentUser, athletes, competitions, events, results, notifications, documents, users, posts, activity, audit, sessions,
      passports, visas, organizers, entries, unreadCount,
      createAthlete, updateAthlete, deleteAthlete,
      createCompetition, updateCompetition, deleteCompetition, loadResults, addResult,
      createEvent, updateEvent, deleteEvent,
      addDocuments, deleteDocument,
      inviteUser, removeUser,
      savePost,
      revokeSession,
      createPassport, updatePassport, deletePassport,
      createVisa, updateVisa, deleteVisa,
      createOrganizer, updateOrganizer, deleteOrganizer,
      createEntry, updateEntry, deleteEntry,
      markAllRead, resetAll,
      tweaks, setTweak,
      authenticated, setAuthenticated,
      cmdOpen, setCmdOpen,
      tweaksOpen, setTweaksOpen,
      lang, setLang, t,
      navigate,
      prefetch,
    }),
    [
      loading, refresh, currentUser, athletes, competitions, events, results, notifications, documents, users, posts, activity, audit, sessions,
      passports, visas, organizers, entries, unreadCount,
      createAthlete, updateAthlete, deleteAthlete, createCompetition, updateCompetition, deleteCompetition, loadResults, addResult,
      createEvent, updateEvent, deleteEvent, addDocuments, deleteDocument, inviteUser, removeUser, savePost, revokeSession,
      createPassport, updatePassport, deletePassport, createVisa, updateVisa, deleteVisa,
      createOrganizer, updateOrganizer, deleteOrganizer, createEntry, updateEntry, deleteEntry,
      markAllRead, resetAll, tweaks, setTweak, authenticated, cmdOpen, tweaksOpen, lang, setLang, t, navigate,
      prefetch,
    ]
  );

  return <LaneCtx.Provider value={value}>{children}</LaneCtx.Provider>;
}

export function useLane(): LaneContextValue {
  const ctx = useContext(LaneCtx);
  if (!ctx) throw new Error("useLane must be used within LaneProvider");
  return ctx;
}
