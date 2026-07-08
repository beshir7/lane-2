"use client";

// =========================================================================
// LaneProvider — the single client-side source of truth.
//
// LOCAL MODE (for now): every collection starts EMPTY and is persisted to
// localStorage. No network, no seed — so pages load instantly and you can
// enter your own data to test. Swap the load/save effects for the REST API
// (services/externalApi) when the backend/Supabase is wired.
// =========================================================================

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./primitives";
import type {
  Athlete,
  Competition,
  CalendarEvent,
  ResultsMap,
  Result,
  AppNotification,
  LaneDocument,
  TeamUser,
  Post,
  ActivityItem,
  AuditEntry,
  DeviceSession,
  Passport,
  Visa,
  Organizer,
  RaceEntry,
  Tweaks,
  Page,
} from "@/lib/types";
import { translate, type Lang } from "@/lib/i18n";

const LS_KEY = "lane-data-v1";
const LANG_KEY = "lane-lang";
const newId = (p: string) => p + Math.random().toString(36).slice(2, 8);
const today = () => new Date().toISOString().slice(0, 10);

interface LaneContextValue {
  loading: boolean;

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
  t: (key: string) => string;

  navigate: (page: Page | string, arg?: string | null) => void;
}

const LaneCtx = createContext<LaneContextValue | null>(null);

const TWEAK_DEFAULTS: Tweaks = { theme: "dark", sidebar: "expanded", accent: "#6b7dff", density: "comfortable" };

export function LaneProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const push = useToast();

  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [results, setResults] = useState<ResultsMap>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [documents, setDocuments] = useState<LaneDocument[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [passports, setPassports] = useState<Passport[]>([]);
  const [visas, setVisas] = useState<Visa[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [entries, setEntries] = useState<RaceEntry[]>([]);

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
  const t = useCallback((key: string) => translate(lang, key), [lang]);

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

  // ----- Load everything from localStorage once (instant, no network) -----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setAthletes(d.athletes ?? []);
        setCompetitions(d.competitions ?? []);
        setEvents(d.events ?? []);
        setResults(d.results ?? {});
        setNotifications(d.notifications ?? []);
        setDocuments(d.documents ?? []);
        setUsers(d.users ?? []);
        setPosts(d.posts ?? []);
        setActivity(d.activity ?? []);
        setAudit(d.audit ?? []);
        setSessions(d.sessions ?? []);
        setPassports(d.passports ?? []);
        setVisas(d.visas ?? []);
        setOrganizers(d.organizers ?? []);
        setEntries(d.entries ?? []);
      }
    } catch {}
    setLoading(false);
  }, []);

  // ----- Persist every change back to localStorage -----
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ athletes, competitions, events, results, notifications, documents, users, posts, activity, audit, sessions, passports, visas, organizers, entries })
      );
    } catch {}
  }, [loading, athletes, competitions, events, results, notifications, documents, users, posts, activity, audit, sessions, passports, visas, organizers, entries]);

  // ----- Navigation -----
  const navigate = useCallback<LaneContextValue["navigate"]>((page, arg) => {
    const routes: Record<string, string> = {
      dashboard: "/dashboard",
      athletes: "/athletes",
      competitions: "/races",
      races: "/races",
      organizers: "/organizers",
      calendar: "/calendar",
      documents: "/documents",
      cms: "/cms",
      reports: "/reports",
      notifications: "/notifications",
      role: "/role",
    };
    if (page === "athlete-detail") return router.push(`/athletes/${arg}`);
    if (page === "competition-detail") return router.push(`/races/${arg}`);
    if (page === "settings") return router.push(arg ? `/settings?tab=${arg}` : "/settings");
    router.push(routes[page as string] || `/${page}`);
  }, [router]);

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
    push({ title: "Athlete added", body: `${a.first} ${a.last}`, variant: "success" });
  }, [push]);
  const updateAthlete = useCallback((id: string, data: Partial<Athlete>) => {
    setAthletes((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
    push({ title: "Profile saved", variant: "success" });
  }, [push]);
  const deleteAthlete = useCallback((id: string) => {
    setAthletes((prev) => prev.filter((x) => x.id !== id));
    setPassports((prev) => prev.filter((p) => p.athleteId !== id));
    setVisas((prev) => prev.filter((v) => v.athleteId !== id));
    setEntries((prev) => prev.filter((e) => e.athleteId !== id));
    push({ title: "Athlete removed", variant: "info" });
  }, [push]);

  // ----- Competitions & results -----
  const createCompetition = useCallback((data: Partial<Competition>) => {
    const c = { events: [], disciplines: [], entries: 0, results: 0, status: "upcoming", tier: "tier-1", ...data, id: data.id || newId("c") } as Competition;
    setCompetitions((prev) => [c, ...prev]);
    push({ title: "Competition created", body: c.name, variant: "success" });
  }, [push]);
  const updateCompetition = useCallback((id: string, data: Partial<Competition>) => {
    setCompetitions((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    push({ title: "Competition saved", variant: "success" });
  }, [push]);
  const deleteCompetition = useCallback((id: string) => {
    setCompetitions((prev) => prev.filter((c) => c.id !== id));
    setEntries((prev) => prev.filter((e) => e.competitionId !== id));
    push({ title: "Competition removed", variant: "info" });
  }, [push]);
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
    const e = { athletes: [], category: "training", startHour: 9, duration: 1.5, location: "", ...data, id: data.id || newId("e") } as CalendarEvent;
    setEvents((prev) => [e, ...prev]);
    push({ title: "Event scheduled", body: e.title, variant: "success" });
  }, [push]);
  const updateEvent = useCallback((id: string, data: Partial<CalendarEvent>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
    push({ title: "Event updated", variant: "info" });
  }, [push]);
  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    push({ title: "Event removed", variant: "info" });
  }, [push]);

  // ----- Documents -----
  const addDocuments = useCallback((files: { name: string; size?: string }[]) => {
    const created = files.map((f) => {
      const isPdf = f.name.toLowerCase().endsWith(".pdf");
      return { id: newId("d"), name: f.name, type: isPdf ? "pdf" : "image", icon: isPdf ? "filePdf" : "fileImage", category: "media", size: f.size || "—", athleteId: null, uploaded: today(), expires: null } as LaneDocument;
    });
    setDocuments((prev) => [...created, ...prev]);
    push({ title: `${created.length} file${created.length > 1 ? "s" : ""} added`, variant: "success" });
  }, [push]);
  const deleteDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    push({ title: "Document deleted", variant: "info" });
  }, [push]);

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
    setPassports((prev) => [{ nation: "", number: "", issued: "", expiry: "", note: "", ...data, id: data.id || newId("pp") } as Passport, ...prev]);
    push({ title: "Passport added", variant: "success" });
  }, [push]);
  const updatePassport = useCallback((id: string, data: Partial<Passport>) => {
    setPassports((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    push({ title: "Passport updated", variant: "info" });
  }, [push]);
  const deletePassport = useCallback((id: string) => {
    setPassports((prev) => prev.filter((x) => x.id !== id));
    push({ title: "Passport removed", variant: "info" });
  }, [push]);

  // ----- Visas -----
  const createVisa = useCallback((data: Partial<Visa>) => {
    setVisas((prev) => [{ kind: "Other", type: "", event: "", validFrom: "", validTo: "", embassy: "", sentToFederation: false, note: "", ...data, id: data.id || newId("v") } as Visa, ...prev]);
    push({ title: "Visa added", variant: "success" });
  }, [push]);
  const updateVisa = useCallback((id: string, data: Partial<Visa>) => {
    setVisas((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    push({ title: "Visa updated", variant: "info" });
  }, [push]);
  const deleteVisa = useCallback((id: string) => {
    setVisas((prev) => prev.filter((x) => x.id !== id));
    push({ title: "Visa removed", variant: "info" });
  }, [push]);

  // ----- Organizers -----
  const createOrganizer = useCallback((data: Partial<Organizer>) => {
    setOrganizers((prev) => [{ name: "", email: "", phone: "", nation: "", ...data, id: data.id || newId("o") } as Organizer, ...prev]);
    push({ title: "Organizer added", body: data.name, variant: "success" });
  }, [push]);
  const updateOrganizer = useCallback((id: string, data: Partial<Organizer>) => {
    setOrganizers((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    push({ title: "Organizer updated", variant: "info" });
  }, [push]);
  const deleteOrganizer = useCallback((id: string) => {
    setOrganizers((prev) => prev.filter((x) => x.id !== id));
    push({ title: "Organizer removed", variant: "info" });
  }, [push]);

  // ----- Race entries (recount keeps competition counts in sync) -----
  const recount = useCallback((competitionId: string, list: RaceEntry[]) => {
    const forComp = list.filter((e) => e.competitionId === competitionId);
    setCompetitions((prev) => prev.map((c) => (c.id === competitionId ? { ...c, entries: forComp.length, results: forComp.filter((e) => e.position != null || e.time).length } : c)));
  }, []);
  const createEntry = useCallback((data: Partial<RaceEntry>) => {
    const entry = { discipline: "", gender: "M", status: "proposed", time: "", wind: "", note: "", ...data, id: data.id || newId("en") } as RaceEntry;
    setEntries((prev) => { const next = [entry, ...prev]; recount(entry.competitionId, next); return next; });
    push({ title: "Athlete entered", variant: "success" });
  }, [push, recount]);
  const updateEntry = useCallback((id: string, data: Partial<RaceEntry>) => {
    setEntries((prev) => { const next = prev.map((x) => (x.id === id ? { ...x, ...data } : x)); const e = next.find((x) => x.id === id); if (e) recount(e.competitionId, next); return next; });
  }, [recount]);
  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => { const gone = prev.find((x) => x.id === id); const next = prev.filter((x) => x.id !== id); if (gone) recount(gone.competitionId, next); return next; });
    push({ title: "Entry removed", variant: "info" });
  }, [push, recount]);

  // ----- Notifications -----
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    push({ title: "All caught up", variant: "success" });
  }, [push]);

  // ----- Reset everything -----
  const resetAll = useCallback(() => {
    setAthletes([]); setCompetitions([]); setEvents([]); setResults({}); setNotifications([]); setDocuments([]);
    setUsers([]); setPosts([]); setActivity([]); setAudit([]); setSessions([]); setPassports([]); setVisas([]); setOrganizers([]); setEntries([]);
    try { localStorage.removeItem(LS_KEY); } catch {}
    push({ title: "All data cleared", variant: "info" });
  }, [push]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const value = useMemo<LaneContextValue>(
    () => ({
      loading, athletes, competitions, events, results, notifications, documents, users, posts, activity, audit, sessions,
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
    }),
    [
      loading, athletes, competitions, events, results, notifications, documents, users, posts, activity, audit, sessions,
      passports, visas, organizers, entries, unreadCount,
      createAthlete, updateAthlete, deleteAthlete, createCompetition, updateCompetition, deleteCompetition, loadResults, addResult,
      createEvent, updateEvent, deleteEvent, addDocuments, deleteDocument, inviteUser, removeUser, savePost, revokeSession,
      createPassport, updatePassport, deletePassport, createVisa, updateVisa, deleteVisa,
      createOrganizer, updateOrganizer, deleteOrganizer, createEntry, updateEntry, deleteEntry,
      markAllRead, resetAll, tweaks, setTweak, authenticated, cmdOpen, tweaksOpen, lang, setLang, t, navigate,
    ]
  );

  return <LaneCtx.Provider value={value}>{children}</LaneCtx.Provider>;
}

export function useLane(): LaneContextValue {
  const ctx = useContext(LaneCtx);
  if (!ctx) throw new Error("useLane must be used within LaneProvider");
  return ctx;
}
