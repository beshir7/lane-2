"use client";

// Races list + create modal.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Badge, ConfirmModal, Drawer, Modal, Segmented } from "@/components/primitives";
import { DateStack, EntryStatusBadge, FilterDropdown, Stat } from "@/components/shared";
import { PlacementStats } from "@/components/placement-stats";
import { useLane } from "@/components/lane-provider";
import { localeOf } from "@/lib/i18n";
import { ALL_DISCIPLINES } from "@/lib/reference";
import { placementColor, downloadWordDoc } from "@/utils";
import { esc } from "@/utils/print";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { RACE_LEVELS, FOLLOWED_BY_OPTIONS } from "@/lib/types";
import type { Athlete, Competition, CompetitionStatus, EntryStatus, Organizer, RaceCategory, RaceEntry } from "@/lib/types";
import { OrganizerPicker } from "@/features/organizers/components/organizer-picker";
import { ResultModal } from "./competition-detail";

// Single categories — used by the race form.
const RACE_CATEGORIES: { v: RaceCategory; l: string }[] = [
  { v: "half-marathon", l: "Half marathon" },
  { v: "marathon", l: "Marathon" },
  { v: "meeting", l: "Meeting" },
  { v: "road", l: "Road" },
  { v: "cross", l: "Cross" },
  { v: "indoor", l: "Indoor" },
];

// Map one free-text token (from the "Tipo" search box, photo_22) to a category.
// The old dropdown let you type/pick "marathon", "road+cross+half marathon", etc.,
// so we resolve each token fuzzily by label or key.
function matchCategoryToken(token: string): RaceCategory | null {
  const t = token.trim().toLowerCase();
  if (!t) return null;
  for (const c of RACE_CATEGORIES) {
    const label = c.l.toLowerCase();
    const key = c.v.replace(/-/g, " ");
    if (label === t || key === t || label.includes(t) || key.includes(t) || t.includes(label)) return c.v;
  }
  if (t === "hm" || t === "half") return "half-marathon";
  if (t === "mar") return "marathon";
  return null;
}

// Split a "+"-separated type query into the set of categories it selects.
// "half marathon + marathon" → ["half-marathon", "marathon"] (races in either pass).
function parseCategoryQuery(query: string): RaceCategory[] {
  const out: RaceCategory[] = [];
  for (const part of query.split("+")) {
    const cat = matchCategoryToken(part);
    if (cat && !out.includes(cat)) out.push(cat);
  }
  return out;
}

// Race calendar colour code (caption 16 / photo_22 legend):
//  green  = past event      amber = taking place today
//  blue   = upcoming soon    pink  = already scheduled in a future year
type RaceColor = "past" | "today" | "upcoming" | "nextyear";
const RACE_COLORS: Record<RaceColor, string> = {
  past: "#22c55e",
  today: "#f59e0b",
  upcoming: "#3b82f6",
  nextyear: "#ec4899",
};
export function raceColorKey(dateIso: string): RaceColor {
  const d = new Date(dateIso + "T00:00");
  if (isNaN(d.getTime())) return "upcoming";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return "today";
  if (d.getFullYear() > today.getFullYear()) return "nextyear";
  if (diffDays < 0) return "past";
  return "upcoming";
}
export function raceColor(dateIso: string): string {
  return RACE_COLORS[raceColorKey(dateIso)];
}

// Time-range filter (caption): Today / This week / This month / This year /
// Future (more than a year away).
type WhenKey = "all" | "today" | "week" | "month" | "year" | "future";
const WHEN_OPTIONS: { v: WhenKey; l: string }[] = [
  { v: "all", l: "All dates" },
  { v: "today", l: "Today" },
  { v: "week", l: "This week" },
  { v: "month", l: "This month" },
  { v: "year", l: "This year" },
  { v: "future", l: "Future (>1 year)" },
];
function inWhen(dateIso: string, when: WhenKey): boolean {
  if (when === "all") return true;
  const d = new Date((dateIso || "") + "T00:00");
  if (isNaN(d.getTime())) return false;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (when === "today") return d.getTime() === now.getTime();
  if (when === "week") {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay());
    const end = new Date(start); end.setDate(start.getDate() + 7);
    return d >= start && d < end;
  }
  if (when === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  if (when === "year") return d.getFullYear() === now.getFullYear();
  if (when === "future") { const oneYear = new Date(now); oneYear.setFullYear(now.getFullYear() + 1); return d > oneYear; }
  return true;
}

// ---- Sophisticated search -----------------------------------------------
// Everything a competition can be found by: its own fields (name, venue,
// country, type, level/label, category, status, dates, notes, website), its
// organizer and contact, who follows it, its disciplines/events, and the
// athletes entered in it. Terms are separated by "+" and ALL must match, so
// "Marathon + Half marathon" only returns competitions that have both.
function buildHaystack(c: Competition, organizerName: string, athleteNames: string[], categoryLabel: string): string {
  return [
    c.name, c.short, c.location, c.country, c.type, c.level, c.category, categoryLabel,
    c.status, c.date, c.endDate, c.followedBy, c.notes, c.webSite,
    c.contactName, c.contactSurname, c.contactEmail, c.contactPhone,
    organizerName,
    ...(c.events || []),
    ...(c.disciplines || []).map((d) => `${d.discipline} ${d.gender === "W" ? "women" : "men"}`),
    ...athleteNames,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Split the query on "+" into the terms that must all be present. */
export function parseSearchTerms(query: string): string[] {
  return query.split("+").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

// One control for "when": the preset ranges (All dates / Today / This week …)
// and the exact-month picker live in the same dropdown, because they answer the
// same question and only one of them can be active at a time. Picking a month
// clears the preset and vice versa.
function PeriodFilter({
  when,
  month,
  onWhen,
  onMonth,
}: {
  when: WhenKey;
  month: string;
  onWhen: (v: WhenKey) => void;
  onMonth: (v: string) => void;
}) {
  const { t, lang } = useLane();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false), open);

  const monthLabel = month
    ? new Date(month + "-01T00:00").toLocaleDateString(localeOf(lang), { month: "short", year: "numeric" })
    : "";
  const active = !!month || when !== "all";
  const current = monthLabel || t("when." + when);

  return (
    <div ref={ref} style={{ position: "relative", flex: "0 0 auto" }}>
      <button className="btn btn-secondary btn-sm" onClick={() => setOpen(!open)} title={t("rs.when")}>
        <Icon name="calendar" size={13} style={{ color: active ? "var(--accent)" : "var(--fg-3)" }} />
        <span style={{ color: active ? "var(--accent)" : undefined, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current}</span>
        <Icon name="chevronDown" size={12} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 20,
            width: "min(230px, calc(100vw - 24px))",
            background: "var(--bg-1)", border: "1px solid var(--border-2)", borderRadius: "var(--r-md)",
            boxShadow: "var(--shadow-lift)", padding: 4, display: "flex", flexDirection: "column", gap: 1,
          }}
        >
          {WHEN_OPTIONS.map((o) => {
            const on = !month && o.v === when;
            return (
              <button
                key={o.v}
                onClick={() => { onWhen(o.v); onMonth(""); setOpen(false); }}
                style={{
                  padding: "7px 10px", borderRadius: 4, textAlign: "left", fontSize: 13,
                  background: on ? "var(--accent-soft)" : "transparent",
                  color: on ? "var(--accent)" : "var(--fg-1)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                {t("when." + o.v)}
                {on && <Icon name="check" size={12} />}
              </button>
            );
          })}
          <div style={{ height: 1, background: "var(--border-1)", margin: "4px 0" }} />
          <div style={{ padding: "2px 10px 6px" }}>
            <div className="text-xs muted" style={{ marginBottom: 4 }}>{t("competitions.month")}</div>
            <div className="input-group" style={{ width: "100%" }}>
              <input
                className="input"
                style={{ flex: 1, minWidth: 0, width: "auto" }}
                type="month"
                value={month}
                onChange={(e) => { onMonth(e.target.value); if (e.target.value) onWhen("all"); }}
              />
              {month && (
                <button className="icon-btn" title={t("common.clear")} onClick={() => onMonth("")}>
                  <Icon name="close" size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RaceLegend() {
  const { t } = useLane();
  const items: RaceColor[] = ["past", "today", "upcoming", "nextyear"];
  return (
    <div className="row" style={{ gap: 16, flexWrap: "wrap", padding: "10px 14px" }}>
      {items.map((k) => (
        <div key={k} className="row" style={{ gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: RACE_COLORS[k], display: "inline-block" }} />
          <span className="text-xs muted">{t(`legend.${k}`)}</span>
        </div>
      ))}
    </div>
  );
}

// Searchable "Tipo" filter (photo_22): the user types free text instead of
// picking from a fixed dropdown. Suggestions appear as you type, applied
// queries are remembered as recent history, and "+" combines categories.
function CategorySearchFilter({
  value,
  onChange,
  history,
  onCommit,
}: {
  value: string;
  onChange: (v: string) => void;
  history: string[];
  onCommit: (v: string) => void;
}) {
  const { t } = useLane();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const commit = () => { const v = value.trim(); if (v) onCommit(v); };

  useOutsideClick(ref, () => { setOpen(false); commit(); }, open);

  // The token being typed is the text after the last "+".
  const parts = value.split("+");
  const active = (parts[parts.length - 1] || "").trim().toLowerCase();
  const suggestions = RACE_CATEGORIES.filter(
    (c) => !active || c.l.toLowerCase().includes(active) || c.v.replace(/-/g, " ").includes(active)
  );

  const applyCategory = (label: string) => {
    const head = parts.slice(0, -1).map((s) => s.trim()).filter(Boolean);
    onChange([...head, label].join(" + "));
    setOpen(true);
  };

  return (
    <div ref={ref} style={{ position: "relative", flex: "1 1 160px", minWidth: 150, maxWidth: 220 }}>
      <div className="input-group">
        <Icon name="filter" size={14} />
        <input
          className="input"
          placeholder={t("competitions.typeFilter")}
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Enter") { commit(); setOpen(false); } }}
        />
        {value && (
          <button className="icon-btn" title={t("common.clear")} onClick={() => { onChange(""); setOpen(false); }}>
            <Icon name="close" size={13} />
          </button>
        )}
      </div>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, width: "max(100%, 220px)", zIndex: 20,
            background: "var(--bg-1)", border: "1px solid var(--border-2)", borderRadius: "var(--r-md)",
            boxShadow: "var(--shadow-lift)", padding: 4, display: "flex", flexDirection: "column", gap: 1,
          }}
        >
          {suggestions.map((c) => (
            <button
              key={c.v}
              onClick={() => applyCategory(c.l)}
              style={{ padding: "7px 10px", borderRadius: 4, textAlign: "left", fontSize: 13, background: "transparent", color: "var(--fg-1)" }}
            >
              {t(`cat.${c.v}`)}
            </button>
          ))}
          {history.length > 0 && (
            <>
              {suggestions.length > 0 && <div style={{ height: 1, background: "var(--border-1)", margin: "4px 0" }} />}
              {history.map((h) => (
                <button
                  key={h}
                  onClick={() => { onChange(h); onCommit(h); setOpen(false); }}
                  style={{ padding: "6px 10px", borderRadius: 4, textAlign: "left", fontSize: 13, background: "transparent", color: "var(--fg-2)", display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Icon name="clock" size={12} style={{ color: "var(--fg-3)" }} /> {h}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function CompStatusBadge({ status }: { status: string }) {
  const { t } = useLane();
  if (status === "live") return <Badge variant="danger" dot>LIVE</Badge>;
  if (status === "upcoming") return <Badge variant="accent" dot>{t("rs.upcoming")}</Badge>;
  if (status === "completed") return <Badge variant="success" dot>{t("rs.completed")}</Badge>;
  return <Badge>{status}</Badge>;
}

export function CompetitionsScreen() {
  const { competitions, athletes, organizers, entries, navigate, prefetch, createCompetition, t } = useLane();
  const [view, setView] = useState<"cards" | "list">("cards");
  const [filter, setFilter] = useState<"all" | CompetitionStatus>("all");
  const [catQuery, setCatQuery] = useState("");
  const [catHistory, setCatHistory] = useState<string[]>([]);
  const [when, setWhen] = useState<WhenKey>("all");
  const [monthFilter, setMonthFilter] = useState(""); // "YYYY-MM"
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [resultFor, setResultFor] = useState<RaceEntry | null>(null);
  const [editEntry, setEditEntry] = useState<RaceEntry | null>(null);
  const PAGE_SIZE = 10;

  const pushHistory = (q: string) => setCatHistory((prev) => [q, ...prev.filter((h) => h !== q)].slice(0, 6));

  // Any filter change resets to the first page of the races list.
  useEffect(() => { setPage(0); }, [filter, catQuery, monthFilter, search, when]);

  const catSet = parseCategoryQuery(catQuery);
  // One searchable text blob per competition, rebuilt only when the underlying
  // data changes rather than on every keystroke.
  const haystacks = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of competitions) {
      const organizerName = organizers.find((o) => o.id === c.organizerId)?.name || "";
      const athleteNames = entries
        .filter((e) => e.competitionId === c.id)
        .map((e) => { const a = athletes.find((x) => x.id === e.athleteId); return a ? `${a.first} ${a.last}` : ""; });
      const categoryLabel = RACE_CATEGORIES.find((x) => x.v === c.category)?.l || "";
      map.set(c.id, buildHaystack(c, organizerName, athleteNames, categoryLabel));
    }
    return map;
  }, [competitions, organizers, entries, athletes]);

  const searchTerms = parseSearchTerms(search);
  // Row order (caption): today first, then upcoming, then future-year, then past.
  // Within a group races run soonest-first, except past ones show most-recent-first.
  const RACE_ORDER: Record<RaceColor, number> = { today: 0, upcoming: 1, nextyear: 2, past: 3 };
  const filtered = competitions
    .filter((c) => (filter === "all" ? true : c.status === filter))
    .filter((c) => (catSet.length === 0 ? true : c.category ? catSet.includes(c.category) : false))
    .filter((c) => inWhen(c.date, when))
    .filter((c) => (!monthFilter ? true : (c.date || "").slice(0, 7) === monthFilter))
    // Every "+"-separated term must appear somewhere in the competition.
    .filter((c) => { const h = haystacks.get(c.id) || ""; return searchTerms.every((term) => h.includes(term)); })
    .sort((a, b) => {
      const ka = raceColorKey(a.date), kb = raceColorKey(b.date);
      if (RACE_ORDER[ka] !== RACE_ORDER[kb]) return RACE_ORDER[ka] - RACE_ORDER[kb];
      const da = +new Date(a.date), db = +new Date(b.date);
      return ka === "past" ? db - da : da - db;
    });

  const counts = {
    all: competitions.length,
    upcoming: competitions.filter((c) => c.status === "upcoming").length,
    live: competitions.filter((c) => c.status === "live").length,
    completed: competitions.filter((c) => c.status === "completed").length,
  };

  // Placement statistics aggregated over the races currently in view (photo_28).
  const filteredIds = new Set(filtered.map((c) => c.id));
  const raceEntries = entries.filter((e) => filteredIds.has(e.competitionId));
  const hasResults = raceEntries.some((e) => e.position != null);

  // Races list is paginated 10 per page (photo_25).
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const selectedRace = competitions.find((c) => c.id === selectedRaceId) || null;
  const selectedEntries = entries.filter((e) => e.competitionId === selectedRaceId);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("competitions.title")}</h1>
          <p className="page-subtitle">{t("competitions.subtitle")}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Icon name="plus" size={14} /> {t("competitions.new")}</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ padding: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div className="input-group" style={{ flex: "2 1 200px", minWidth: 180 }}>
            <Icon name="search" size={14} />
            <input
              className="input"
              placeholder={t("competitions.searchAll")}
              title={t("competitions.searchHint")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="icon-btn" title={t("common.clear")} onClick={() => setSearch("")}><Icon name="close" size={13} /></button>
            )}
          </div>
          {/* Status filter — a dropdown rather than a row of tabs. */}
          <FilterDropdown
            label={t("common.status")}
            value={filter}
            options={[
              { v: "all", l: `${t("rs.all")} (${counts.all})` },
              { v: "upcoming", l: `${t("rs.upcoming")} (${counts.upcoming})` },
              { v: "live", l: `${t("rs.liveNow")} (${counts.live})` },
              { v: "completed", l: `${t("rs.completed")} (${counts.completed})` },
            ]}
            onChange={(v) => setFilter(v as "all" | CompetitionStatus)}
          />
          <CategorySearchFilter value={catQuery} onChange={setCatQuery} history={catHistory} onCommit={pushHistory} />
          {/* Presets + exact month in one control. */}
          <PeriodFilter when={when} month={monthFilter} onWhen={setWhen} onMonth={setMonthFilter} />
          <Segmented options={[{ value: "cards", icon: "grid", label: t("rs.grid") }, { value: "list", icon: "list", label: t("rs.list") }]} value={view} onChange={setView} />
        </div>
      </div>

      {view === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {filtered.map((c) => (
            <CompetitionCard
              key={c.id}
              c={c}
              athletes={athletes}
              entries={entries}
              organizerName={organizers.find((o) => o.id === c.organizerId)?.name}
              onPeek={() => setSelectedRaceId(c.id)}
              onHover={() => prefetch("competition-detail", c.id)}
            />
          ))}
          {filtered.length === 0 && <div className="card card-pad text-sm muted" style={{ gridColumn: "1 / -1" }}>{t("rs.noMatch")}</div>}
        </div>
      ) : (
        <div className="col" style={{ gap: 12 }}>
          {/* Full-width races list (Data · Competizione · Nazione), 10 per page. */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th style={{ width: "14%" }}>{t("rs.date")}</th><th style={{ width: "44%" }}>{t("rs.competition")}</th><th style={{ width: "16%" }}>{t("rs.type")}</th><th style={{ width: "12%" }}>{t("rs.entries")}</th><th style={{ width: "14%" }}>{t("rs.nation")}</th></tr>
                </thead>
                <tbody>
                  {paged.map((c) => (
                    <tr key={c.id}
                      onMouseEnter={() => prefetch("competition-detail", c.id)}
                      onClick={() => setSelectedRaceId(c.id)}
                      onDoubleClick={() => navigate("competition-detail", c.id)}
                      style={{ cursor: "pointer", background: c.id === selectedRaceId ? "var(--accent-soft)" : undefined }}>
                      <td className="text-sm mono" style={{ whiteSpace: "nowrap" }}>{c.date}</td>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          <span title={raceColorKey(c.date)} style={{ width: 8, height: 8, borderRadius: 999, background: raceColor(c.date), flex: "none" }} />
                          <span className="fw-600" style={{ color: raceColor(c.date) }}>{c.name}</span>
                          {c.level && <span className="text-xs muted">· {c.level}</span>}
                        </div>
                      </td>
                      <td className="text-sm muted">{c.category || "—"}</td>
                      <td className="text-sm mono">{c.entries || 0}</td>
                      <td className="text-sm mono">{c.country || "—"}</td>
                    </tr>
                  ))}
                  {paged.length === 0 && <tr><td colSpan={5} className="text-sm muted" style={{ padding: 16 }}>{t("rs.noMatch")}</td></tr>}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-1)" }}>
              <span className="text-xs muted">{filtered.length === 0 ? "0" : `${safePage * PAGE_SIZE + 1}–${Math.min(filtered.length, safePage * PAGE_SIZE + PAGE_SIZE)}`} / {filtered.length}</span>
              <div className="row" style={{ gap: 6, alignItems: "center" }}>
                <button className="btn btn-secondary btn-sm" disabled={safePage <= 0} onClick={() => setPage(safePage - 1)}><Icon name="chevronLeft" size={13} /> {t("rs.prev")}</button>
                <span className="text-xs muted mono">{safePage + 1}/{pageCount}</span>
                <button className="btn btn-secondary btn-sm" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>{t("rs.next")} <Icon name="chevronRight" size={13} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, marginTop: 12 }}><RaceLegend /></div>

      {/* Placement statistics across the races in view (photo_28). */}
      {hasResults && (
        <div className="card card-pad" style={{ marginTop: 12 }}>
          <PlacementStats entries={raceEntries} totalLabelKey="stats.results" title={t("stats.allRaces")} />
        </div>
      )}

      {/* Peek: quick-look of the race — its entered athletes — before opening it. */}
      <RacePeek
        race={selectedRace}
        entries={selectedEntries}
        athletes={athletes}
        onEditResult={setResultFor}
        onEditEntry={setEditEntry}
        onClose={() => setSelectedRaceId(null)}
        onOpen={() => selectedRaceId && navigate("competition-detail", selectedRaceId)}
      />

      {resultFor && <ResultModal entry={resultFor} athletes={athletes} onClose={() => setResultFor(null)} />}
      {editEntry && <EntryEditModal entry={editEntry} race={competitions.find((c) => c.id === editEntry.competitionId) || null} athletes={athletes} onClose={() => setEditEntry(null)} />}
      {showCreate && <CompetitionFormModal organizers={organizers} athletes={athletes} onClose={() => setShowCreate(false)} onSave={(d) => { createCompetition(d); setShowCreate(false); }} />}
    </div>
  );
}

const ENTRY_STATUS_KEYS: EntryStatus[] = ["proposed", "waiting", "accepted", "ok"];

// The selected race's competing athletes (photo_25): Name · Discipline · Position
// · Time, coloured by placement. Right-clicking a row opens the athlete's race
// menu (photo_23): edit info (athlete/discipline), edit result, set status
// (Da proporre / Lista attesa / Accettato / OK), or open the athlete.
function RacePeek({ race, entries, athletes, onEditResult, onEditEntry, onClose, onOpen }: {
  race: Competition | null;
  entries: RaceEntry[];
  athletes: Athlete[];
  onEditResult: (e: RaceEntry) => void;
  onEditEntry: (e: RaceEntry) => void;
  onClose: () => void;
  onOpen: () => void;
}) {
  const { updateEntry, deleteEntry, navigate, t } = useLane();
  const [menu, setMenu] = useState<{ x: number; y: number; entry: RaceEntry } | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<RaceEntry | null>(null);
  const nameOf = (id: string) => { const a = athletes.find((x) => x.id === id); return a ? `${a.last}, ${a.first}` : id; };
  const colorOf = (id: string) => athletes.find((x) => x.id === id)?.color || "#5b6ef5";
  const placeText = (e: RaceEntry) => (e.position ? `#${e.position}` : e.note && /^(DNF|DNS|DQ)$/i.test(e.note) ? e.note.toUpperCase() : "—");

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("click", close); window.removeEventListener("scroll", close, true); };
  }, [menu]);

  const menuItem: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 4, textAlign: "left", fontSize: 13, background: "transparent", color: "var(--fg-1)", width: "100%" };
  const hoverOn = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.background = "var(--bg-2)");
  const hoverOff = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.background = "transparent");
  const setStatus = (e: RaceEntry, s: EntryStatus) => { updateEntry(e.id, { status: s }); setMenu(null); };
  const menuLeft = menu ? Math.min(menu.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 236) : 0;
  const menuTop = menu ? Math.min(menu.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 320) : 0;

  return (
    <Drawer
      open={!!race}
      onClose={onClose}
      size="xl"
      title={race ? <span style={{ color: raceColor(race.date) }}>{race.name}</span> : ""}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t("common.close")}</button>
          <button className="btn btn-primary" onClick={() => { onOpen(); onClose(); }}><Icon name="external" size={13} /> {t("rs.openRace")}</button>
        </>
      }
    >
      {race && (
      <div className="col" style={{ gap: 14 }}>
        {/* Meta row — Add athlete sits alongside Date / Venue / Level / Entries
            so an athlete can be entered without leaving this drawer. */}
        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "stretch" }}>
          <Stat variant="meta" label={t("rs.date")} value={race.date || "—"} mono />
          <Stat variant="meta" label={t("cd.venue")} value={[race.location, race.country].filter(Boolean).join(", ") || "—"} />
          {race.level && <Stat variant="meta" label={t("cd.level")} value={race.level} />}
          <Stat variant="meta" label={t("rs.entries")} value={String(entries.length)} />
          <button
            className="btn btn-primary"
            onClick={() => setAdding(true)}
            style={{ alignSelf: "stretch", marginLeft: "auto" }}
          >
            <Icon name="plus" size={13} /> {t("competitions.addAthlete")}
          </button>
        </div>
      <div className="card" style={{ overflow: "hidden" }}>
      <div className="table-wrap" style={{ maxHeight: "calc(100vh - 360px)", overflowY: "auto" }}>
        <table className="table" style={{ margin: 0 }}>
          <thead>
            <tr><th>{t("rs.name")}</th><th>{t("rs.discipline")}</th><th style={{ width: 96 }}>{t("common.status")}</th><th style={{ width: 60 }}>{t("rs.pos")}</th><th style={{ width: 78 }}>{t("rs.time")}</th><th style={{ width: 40 }}></th></tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={6} className="text-sm muted" style={{ padding: 16 }}>{t("rs.noAthletesInRace")}</td></tr>
            ) : entries.map((e) => {
              const color = e.position != null ? placementColor(e.position) : undefined;
              return (
                <tr key={e.id}
                  onContextMenu={(ev) => { ev.preventDefault(); setMenu({ x: ev.clientX, y: ev.clientY, entry: e }); }}
                  onDoubleClick={() => onEditResult(e)}
                  style={{ color }}>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <Avatar name={nameOf(e.athleteId)} color={colorOf(e.athleteId)} size="xs" />
                      <span className="fw-600" style={{ color }}>{nameOf(e.athleteId)}</span>
                    </div>
                  </td>
                  <td style={{ color }}>{e.discipline}</td>
                  <td><EntryStatusBadge status={e.status} /></td>
                  <td className="fw-700 mono" style={{ color }}>{placeText(e)}</td>
                  <td className="mono" style={{ color }}>{e.time || "—"}</td>
                  <td onClick={(ev) => ev.stopPropagation()}>
                    <button
                      className="icon-btn"
                      style={{ color: "var(--danger)" }}
                      title={t("competitions.removeEntry")}
                      onClick={() => setConfirmRemove(e)}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
      <div className="row" style={{ gap: 8, color: "var(--fg-3)" }}>
        <Icon name="info" size={14} />
        <span className="text-xs">{t("rs.rightClickHint")}</span>
      </div>
      </div>
      )}

      {menu && (
        <div style={{ position: "fixed", top: menuTop, left: menuLeft, zIndex: 50, width: 224, background: "var(--bg-1)", border: "1px solid var(--border-2)", borderRadius: "var(--r-md)", boxShadow: "var(--shadow-lift)", padding: 4 }}>
          <button style={menuItem} onMouseEnter={hoverOn} onMouseLeave={hoverOff} onClick={() => { onEditEntry(menu.entry); setMenu(null); }}><Icon name="user" size={13} /> {t("rs.editEntry")}</button>
          <button style={menuItem} onMouseEnter={hoverOn} onMouseLeave={hoverOff} onClick={() => { onEditResult(menu.entry); setMenu(null); }}><Icon name="edit" size={13} /> {t("rs.editResult")}</button>
          <div style={{ height: 1, background: "var(--border-1)", margin: "4px 6px" }} />
          <div className="text-xs mono fw-700 muted" style={{ textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 10px 2px" }}>{t("rs.setStatus")}</div>
          {ENTRY_STATUS_KEYS.map((s) => (
            <button key={s} style={menuItem} onMouseEnter={hoverOn} onMouseLeave={hoverOff} onClick={() => setStatus(menu.entry, s)}>
              <span style={{ width: 14, display: "inline-flex" }}>{menu.entry.status === s && <Icon name="check" size={13} style={{ color: "var(--accent)" }} />}</span>
              {t(`entry.${s}`)}
            </button>
          ))}
          <div style={{ height: 1, background: "var(--border-1)", margin: "4px 6px" }} />
          <button style={menuItem} onMouseEnter={hoverOn} onMouseLeave={hoverOff} onClick={() => { navigate("athlete-detail", menu.entry.athleteId); setMenu(null); }}><Icon name="external" size={13} /> Show athlete info</button>
        </div>
      )}

      {/* Quick-add an athlete straight from the drawer. */}
      {adding && race && (
        <QuickAddAthleteModal
          race={race}
          athletes={athletes}
          existingIds={entries.map((e) => e.athleteId)}
          onClose={() => setAdding(false)}
        />
      )}

      {confirmRemove && (
        <ConfirmModal
          title={t("competitions.removeEntry")}
          message={`${nameOf(confirmRemove.athleteId)} — ${confirmRemove.discipline || ""}`}
          onCancel={() => setConfirmRemove(null)}
          choices={[
            { label: t("common.cancel"), variant: "secondary", onClick: () => setConfirmRemove(null) },
            { label: t("common.remove"), variant: "danger", onClick: () => { deleteEntry(confirmRemove.id); setConfirmRemove(null); } },
          ]}
        />
      )}
    </Drawer>
  );
}

// Enter an athlete into a competition without leaving the peek drawer.
function QuickAddAthleteModal({ race, athletes, existingIds, onClose }: { race: Competition; athletes: Athlete[]; existingIds: string[]; onClose: () => void }) {
  const { createEntry, t } = useLane();
  // Disciplines this competition actually offers.
  const options = race.disciplines?.length
    ? race.disciplines.map((d) => d.discipline)
    : race.events?.length
    ? race.events
    : [];
  const [athleteId, setAthleteId] = useState("");
  const [discipline, setDiscipline] = useState(options[0] || "");
  const [error, setError] = useState("");
  const available = athletes.filter((a) => !existingIds.includes(a.id));

  const submit = () => {
    if (!athleteId) { setError(t("cd.chooseAthlete")); return; }
    const a = athletes.find((x) => x.id === athleteId);
    createEntry({
      competitionId: race.id,
      athleteId,
      discipline: discipline || a?.specialty || "",
      gender: a?.gender === "F" ? "W" : "M",
      status: "proposed",
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${t("competitions.addAthlete")} — ${race.short || race.name}`}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn btn-primary" onClick={submit}>{t("cd.addEntry")}</button>
        </>
      }
    >
      <div className="col" style={{ gap: 14 }}>
        <div className="field">
          <label className="field-label">{t("cd.athlete")}</label>
          <select className="input" value={athleteId} onChange={(e) => { setAthleteId(e.target.value); setError(""); }} autoFocus>
            <option value="">{t("cd.selectAthlete")}</option>
            {available.map((a) => <option key={a.id} value={a.id}>{a.first} {a.last} ({a.specialty})</option>)}
          </select>
          {error && <span className="field-error"><Icon name="alert" size={11} /> {error}</span>}
        </div>
        <div className="field">
          <label className="field-label">{t("cd.discipline")}</label>
          {options.length > 0 ? (
            <select className="input" value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
              {options.map((d, i) => <option key={`${d}-${i}`} value={d}>{d}</option>)}
            </select>
          ) : (
            <input className="input" value={discipline} onChange={(e) => setDiscipline(e.target.value)} placeholder={t("cd.discipline")} />
          )}
        </div>
      </div>
    </Modal>
  );
}

// Edit an existing entry's athlete and/or discipline (photo_23 "Modifica
// informazioni atleta per la competizione"; discipline options come from the race).
function EntryEditModal({ entry, race, athletes, onClose }: { entry: RaceEntry; race: Competition | null; athletes: Athlete[]; onClose: () => void }) {
  const { updateEntry, t } = useLane();
  const [athleteId, setAthleteId] = useState(entry.athleteId);
  const [discipline, setDiscipline] = useState(entry.discipline);
  const disciplineOptions = useMemo(() => {
    const fromRace = race?.disciplines?.length ? race.disciplines.map((d) => d.discipline) : race?.events || [];
    return Array.from(new Set([...(fromRace as string[]), ...ALL_DISCIPLINES, entry.discipline].filter(Boolean)));
  }, [race, entry.discipline]);
  const save = () => {
    const a = athletes.find((x) => x.id === athleteId);
    updateEntry(entry.id, { athleteId, discipline, gender: a ? (a.gender === "F" ? "W" : "M") : entry.gender });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={`${t("competition.participants")} — ${race?.name || ""}`} footer={<><button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button><button className="btn btn-primary" onClick={save}>{t("common.save")}</button></>}>
      <div className="col" style={{ gap: 14 }}>
        <div className="field">
          <label className="field-label">{t("competition.contactName")}</label>
          <select className="input" value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
            {athletes.map((a) => <option key={a.id} value={a.id}>{a.last}, {a.first} ({a.specialty})</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label">{t("athlete.discipline")}</label>
          <select className="input" value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
            {disciplineOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

function CompetitionCard({ c, athletes, entries, organizerName, onPeek, onHover }: { c: Competition; athletes: Athlete[]; entries: RaceEntry[]; organizerName?: string; onPeek: () => void; onHover?: () => void }) {
  const { t } = useLane();
  const [hover, setHover] = useState(false);
  // The athletes actually entered in this race (for the avatar stack + hover list).
  const entered = entries.filter((e) => e.competitionId === c.id);
  const enteredAthletes = entered.map((e) => athletes.find((a) => a.id === e.athleteId)).filter(Boolean) as Athlete[];
  return (
    <div style={{ position: "relative" }} onMouseEnter={() => { setHover(true); onHover?.(); }} onMouseLeave={() => setHover(false)}>
    <button className="card" onClick={onPeek} style={{ padding: 0, textAlign: "left", overflow: "hidden", cursor: "pointer", width: "100%" }}>
      <div
        style={{
          padding: 16,
          position: "relative",
          background:
            c.status === "live"
              ? "linear-gradient(135deg, rgba(245, 91, 110, 0.18), transparent)"
              : c.status === "completed"
              ? "linear-gradient(135deg, rgba(34, 211, 160, 0.10), transparent)"
              : "linear-gradient(135deg, rgba(107, 125, 255, 0.10), transparent)",
          borderBottom: "1px solid var(--border-1)",
        }}
      >
        {/* Race-calendar colour bar (past/today/upcoming/next-year). */}
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: raceColor(c.date) }} />
        <div className="row">
          <DateStack date={c.date} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="display fw-700" style={{ fontSize: 16, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.short || c.name}</div>
            <div className="text-sm muted">{c.location}{c.level ? ` · ${c.level}` : ""}</div>
          </div>
          <CompStatusBadge status={c.status} />
        </div>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div className="text-xs muted mono fw-700" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("rs.events")}</div>
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {c.events.length ? c.events.slice(0, 6).map((e) => <span key={e} className="tag">{e}</span>) : <span className="text-sm muted">—</span>}
            {c.events.length > 6 && <span className="tag">+{c.events.length - 6}</span>}
          </div>
        </div>
        {/* Who runs it and who from the agency follows it. */}
        <div className="col" style={{ gap: 4, borderTop: "1px solid var(--border-1)", paddingTop: 10 }}>
          <div className="row text-xs" style={{ gap: 6 }}>
            <Icon name="users" size={12} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
            <span className="muted">{t("competitions.organizer")}:</span>
            <span className="fw-600" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {organizerName || <span className="muted fw-400">{t("competitions.noOrganizer")}</span>}
            </span>
          </div>
          <div className="row text-xs" style={{ gap: 6 }}>
            <Icon name="user" size={12} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
            <span className="muted">{t("competitions.followedBy")}:</span>
            {c.followedBy ? <Badge variant="accent">{c.followedBy}</Badge> : <span className="muted">{t("competitions.followedByNone")}</span>}
          </div>
        </div>
        <div className="row" style={{ borderTop: "1px solid var(--border-1)", paddingTop: 12 }}>
          <div className="text-xs muted">{entered.length} {entered.length === 1 ? t("rs.entryOne") : t("rs.entryMany")}</div>
          <div className="spacer" />
          {enteredAthletes.length > 0 ? (
            <div className="avatar-stack">
              {enteredAthletes.slice(0, 4).map((a) => <Avatar key={a.id} name={a.first + " " + a.last} color={a.color} size="xs" />)}
              {enteredAthletes.length > 4 && <span className="avatar avatar-xs" style={{ background: "var(--bg-3)", color: "var(--fg-2)" }}>+{enteredAthletes.length - 4}</span>}
            </div>
          ) : (
            <span className="muted text-sm">{t("rs.noneYet")}</span>
          )}
        </div>
      </div>
    </button>

      {/* Hover: the full roster of athletes entered in this race (to the side). */}
      {hover && enteredAthletes.length > 0 && (
        <div
          style={{
            position: "absolute", top: 0, left: "calc(100% + 8px)", width: 210, zIndex: 30,
            background: "var(--bg-1)", border: "1px solid var(--border-2)", borderRadius: "var(--r-md)",
            boxShadow: "var(--shadow-lift)", padding: 6, maxHeight: 260, overflowY: "auto",
          }}
        >
          <div className="text-xs muted mono fw-700" style={{ textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 6px 5px" }}>{t("rs.enteredLabel")} · {enteredAthletes.length}</div>
          {enteredAthletes.map((a) => (
            <div key={a.id} className="row" style={{ gap: 7, padding: "3px 6px" }}>
              <Avatar name={a.first + " " + a.last} color={a.color} size="xs" />
              <span className="text-xs fw-500" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.first} {a.last}</span>
              <span className="text-xs muted" style={{ marginLeft: "auto" }}>{a.nationality?.slice(0, 3)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CompetitionFormModal({ competition, onClose, onSave, organizers, athletes }: { competition?: Competition; onClose: () => void; onSave?: (d: any) => void; organizers: Organizer[]; athletes: Athlete[] }) {
  const isEdit = !!competition;
  const [form, setForm] = useState<any>(
    competition
      ? { ...competition, events: competition.events || [], participants: [] }
      : {
          name: "", short: "", location: "", country: "",
          date: "", endDate: "", type: "Diamond League", tier: "tier-1",
          events: [] as string[], status: "upcoming", entries: 0,
          category: "meeting" as RaceCategory, level: "International", organizerId: "", followedBy: "",
          contactSurname: "", contactName: "", contactPhone: "", contactEmail: "",
          participants: [] as string[],
        }
  );
  const { t, createEntry, updateCompetition } = useLane();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [foglioAsk, setFoglioAsk] = useState(false);
  const update = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const allEvents = ALL_DISCIPLINES;

  const toggleEvent = (ev: string) => {
    setForm((f: any) => ({ ...f, events: f.events.includes(ev) ? f.events.filter((e: string) => e !== ev) : [...f.events, ev] }));
  };

  // Selecting an organizer pre-fills the contact block (surname/name/phone/email).
  const pickOrganizer = (id: string) => {
    const o = organizers.find((x) => x.id === id);
    setForm((f: any) => ({
      ...f,
      organizerId: id,
      contactSurname: o?.lastName || f.contactSurname,
      contactName: o?.firstName || f.contactName,
      contactPhone: o?.phone || f.contactPhone,
      contactEmail: o?.email || f.contactEmail,
    }));
  };

  const toggleParticipant = (id: string) => {
    setForm((f: any) => ({ ...f, participants: f.participants.includes(id) ? f.participants.filter((x: string) => x !== id) : [...f.participants, id] }));
  };

  // Athletes shown on the right (photo_19). Driven purely by the ticked
  // disciplines: an athlete qualifies if they run ANY of them (OR), and athletes
  // with no disciplines on file stay visible so they're still enterable.
  //
  // The order is a hierarchy: whoever covers the MOST of the ticked disciplines
  // comes first — tick "Half Marathon" + "Marathon" and the athletes who run
  // both head the list — then, among equals, the one whose best match sits
  // earliest in ALL_DISCIPLINES (shortest → longest), then by surname.
  const hasDisc = (a: Athlete, ev: string) => (a.disciplines || []).includes(ev);
  const eligible = useMemo<{ a: Athlete; matched: number; best: number }[]>(() => {
    if (form.events.length === 0) return [];
    // Ticked disciplines in hierarchy order.
    const ranked = [...form.events].sort((a: string, b: string) => allEvents.indexOf(a) - allEvents.indexOf(b));
    const scored = athletes
      .map((a) => {
        const matches = ranked.filter((ev: string) => hasDisc(a, ev));
        return { a, matched: matches.length, best: matches.length ? ranked.indexOf(matches[0]) : Number.MAX_SAFE_INTEGER };
      })
      .filter(({ a, matched }) => matched > 0 || (a.disciplines || []).length === 0);
    scored.sort(
      (x, y) =>
        y.matched - x.matched || // most disciplines covered first
        x.best - y.best || // then the earliest discipline in the hierarchy
        `${x.a.last} ${x.a.first}`.localeCompare(`${y.a.last} ${y.a.first}`)
    );
    return scored;
  }, [athletes, form.events, allEvents]);

  const submit = () => {
    const e: Record<string, string> = {};
    if (!form.name) e.name = "Required";
    if (!form.date) e.date = "Required";
    if (!form.location) e.location = "Required";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const catLabel = RACE_CATEGORIES.find((c) => c.v === form.category)?.l || "Race";
    if (isEdit) {
      // Edit an existing race — update its core fields (entries/statuses are
      // managed from the race page's Entries tab).
      const rest = { ...form };
      delete rest.participants;
      updateCompetition(competition!.id, {
        ...rest,
        endDate: form.endDate || form.date,
        type: form.level || catLabel,
      });
      onClose();
      return;
    }

    {
      const id = "c" + Math.random().toString(36).slice(2, 6);
      const payload: any = {
        ...form,
        id,
        endDate: form.endDate || form.date,
        type: form.level || catLabel,   // display badge = level (fallback: category)
        tier: form.level === "DL" || form.level === "Gold" ? "tier-1" : "tier-2",
        results: 0,
      };
      delete payload.participants; // participants become race entries, not a competition field
      onSave?.(payload);
      // Enter each selected participant into a discipline they run.
      for (const aid of form.participants as string[]) {
        const a = athletes.find((x) => x.id === aid);
        if (!a) continue;
        const disc = form.events.find((ev: string) => hasDisc(a, ev)) || form.events[0] || "";
        createEntry({ competitionId: id, athleteId: aid, discipline: disc, gender: a.gender === "F" ? "W" : "M", status: "proposed" });
      }
    }
  };

  // Foglio gara (photo_11/15): the race sheet — name/place/date, disciplines,
  // organizer contact, and (optionally) the participating athletes with columns
  // for appearance fee, prize money and travel details. Generated as Word.
  const generateFoglio = (withAthletes: boolean) => {
    setFoglioAsk(false);
    const org = `${form.contactSurname || ""} ${form.contactName || ""}`.trim() || organizers.find((o) => o.id === form.organizerId)?.name || "";
    const events = (form.events as string[]).join(" · ") || "—";
    const header = `<table><tr><th style="width:60%">${esc(form.name)}</th><th>${esc([form.location, form.country].filter(Boolean).join(" · "))}</th><th style="width:70pt">${esc(form.level || "")}</th></tr></table>`;
    const eventsBlock = `<h2>Events</h2><p>${esc(events)}</p>`;
    const orgBlock = `<h2>Organizer</h2><table class="dl">
      <tr><td class="k">Name</td><td>${esc(org)}</td><td class="k">Date</td><td>${esc(form.date)}${form.endDate && form.endDate !== form.date ? " → " + esc(form.endDate) : ""}</td></tr>
      <tr><td class="k">Phone</td><td>${esc(form.contactPhone)}</td><td class="k">E-mail</td><td>${esc(form.contactEmail)}</td></tr>
      <tr><td class="k">Note</td><td colspan="3">${esc(form.notes || "")}</td></tr></table>`;
    let athletesBlock = "";
    if (withAthletes) {
      const rows = (form.participants as string[]).map((id) => athletes.find((a) => a.id === id)).filter(Boolean)
        .map((a: any) => `<tr><td>${esc(`${a.last} ${a.first}`)} (${a.gender === "F" ? "W" : "M"})</td><td></td><td></td><td></td></tr>`).join("");
      athletesBlock = `<h2>Athletes</h2><table><tr><th>Athlete</th><th>App. fee</th><th>Prize money</th><th>Travel details</th></tr>${rows || '<tr><td colspan="4">—</td></tr>'}</table>`;
    }
    downloadWordDoc(`foglio-${(form.name || "gara").replace(/\s+/g, "-").toLowerCase()}`, `${header}${eventsBlock}${orgBlock}${athletesBlock}`, form.name || "Foglio gara");
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      size="lg"
      title={isEdit ? t("competitions.edit") : t("competitions.new")}
      footer={<><button className="btn btn-secondary" onClick={() => setFoglioAsk(true)} style={{ marginRight: "auto" }}><Icon name="fileText" size={13} /> {t("competition.sheet")}</button><button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button><button className="btn btn-primary" onClick={submit}>{isEdit ? t("competitions.save") : t("competitions.new")}</button></>}
    >
      <div className="col" style={{ gap: 14 }}>
        <div className="field">
          <label className="field-label">{t("competition.name")}</label>
          <input className="input" placeholder="e.g. Lille Half Marathon" value={form.name} onChange={(e) => update("name", e.target.value)} aria-invalid={!!errors.name} />
          {errors.name && <span className="field-error"><Icon name="alert" size={11} /> {errors.name}</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field">
            <label className="field-label">{t("competition.venue")}</label>
            <input className="input" value={form.location} onChange={(e) => update("location", e.target.value)} aria-invalid={!!errors.location} />
            {errors.location && <span className="field-error"><Icon name="alert" size={11} /> {errors.location}</span>}
          </div>
          <div className="field">
            <label className="field-label">{t("doc.nation")}</label>
            <input className="input" value={form.country} onChange={(e) => update("country", e.target.value)} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field">
            <label className="field-label">{t("doc.validFrom")}</label>
            <input type="date" className="input" value={form.date} onChange={(e) => update("date", e.target.value)} aria-invalid={!!errors.date} />
            {errors.date && <span className="field-error"><Icon name="alert" size={11} /> {errors.date}</span>}
          </div>
          <div className="field">
            <label className="field-label">{t("doc.validTo")}</label>
            <input type="date" className="input" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field">
            <label className="field-label">{t("competitions.type")}</label>
            <select className="input" value={form.category} onChange={(e) => update("category", e.target.value)}>
              {RACE_CATEGORIES.map((c) => <option key={c.v} value={c.v}>{t(`cat.${c.v}`)}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">{t("competition.level")}</label>
            <select className="input" value={form.level} onChange={(e) => update("level", e.target.value)}>
              {RACE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Which agency staff member follows this competition on the ground. */}
        <div className="field">
          <label className="field-label">{t("competitions.followedBy")}</label>
          <select className="input" value={form.followedBy || ""} onChange={(e) => update("followedBy", e.target.value)}>
            <option value="">— {t("competitions.followedByNone")} —</option>
            {FOLLOWED_BY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="field">
          <label className="field-label">{t("competition.organizer")}</label>
          <div className="row" style={{ gap: 8 }}>
            <select className="input" style={{ flex: 1 }} value={form.organizerId} onChange={(e) => pickOrganizer(e.target.value)}>
              <option value="">— {t("common.none")} —</option>
              {organizers.map((o) => <option key={o.id} value={o.id}>{o.name}{o.nation ? ` · ${o.nation}` : ""}</option>)}
            </select>
            <button className="btn btn-secondary" onClick={() => setShowOrgPicker(true)}><Icon name="users" size={13} /> {t("common.browse")}</button>
          </div>
        </div>

        {/* Organizer contact typed on the race form (caption 22). */}
        <div className="field">
          <label className="field-label">{t("competition.contact")}</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input className="input" placeholder={t("competition.contactSurname")} value={form.contactSurname} onChange={(e) => update("contactSurname", e.target.value)} />
            <input className="input" placeholder={t("competition.contactName")} value={form.contactName} onChange={(e) => update("contactName", e.target.value)} />
            <input className="input" placeholder={t("org.phone")} value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} />
            <input className="input" type="email" placeholder={t("org.email")} value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} />
          </div>
        </div>

        {/* Disciplines (left) & participants (right), side by side — photo_19.
            Ticking a discipline is the only action: the athlete list on the
            right immediately shows everyone who runs ANY ticked discipline
            (OR), ordered by the discipline hierarchy (shortest → longest). */}
        <div className="field">
          <label className="field-label">{t("competition.disciplines")}{!isEdit ? ` & ${t("competition.participants")}` : ""}</label>
          <div style={{ display: "grid", gridTemplateColumns: isEdit ? "1fr" : "1fr 1fr", gap: 10 }}>
            {/* LEFT — disciplines */}
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="card-header" style={{ padding: "8px 12px" }}>
                <div className="card-title text-sm">{t("competition.disciplines")}</div>
                <div className="row" style={{ gap: 8 }}>
                  {form.events.length > 0 && <span className="text-xs muted">{form.events.length}</span>}
                  {form.events.length > 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => update("events", [])}>{t("common.clear")}</button>
                  )}
                </div>
              </div>
              <div style={{ padding: 6, maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
                {allEvents.map((ev) => {
                  const inRace = form.events.includes(ev);
                  return (
                    <label
                      key={ev}
                      className="row"
                      style={{ gap: 8, padding: "5px 8px", borderRadius: 6, cursor: "pointer", background: inRace ? "var(--accent-soft)" : "transparent" }}
                    >
                      <input type="checkbox" checked={inRace} onChange={() => toggleEvent(ev)} />
                      <span
                        className="text-sm"
                        style={{ flex: 1, color: inRace ? "var(--accent)" : "var(--fg-2)", fontWeight: inRace ? 600 : 400 }}
                      >
                        {ev}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* RIGHT — participants (only when creating; entries are edited on the race page) */}
            {!isEdit && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="card-header" style={{ padding: "8px 12px" }}>
                <div className="card-title text-sm">{t("competition.participants")}</div>
                {eligible.length > 0 && <span className="text-xs muted">{eligible.length}</span>}
              </div>
              <div style={{ padding: 6, maxHeight: 260, overflowY: "auto" }}>
                {form.events.length === 0 ? (
                  <div className="text-sm muted" style={{ padding: 8 }}>{t("competition.pickDisciplines")}</div>
                ) : eligible.length === 0 ? (
                  <div className="text-sm muted" style={{ padding: 8 }}>{t("competition.noEligible")}</div>
                ) : (
                  eligible.map(({ a, matched }) => (
                    <label key={a.id} className="row" style={{ gap: 8, padding: "6px 8px", cursor: "pointer", borderRadius: 6, background: form.participants.includes(a.id) ? "var(--accent-soft)" : "transparent" }}>
                      <input type="checkbox" checked={form.participants.includes(a.id)} onChange={() => toggleParticipant(a.id)} />
                      <Avatar name={a.first + " " + a.last} color={a.color} size="xs" />
                      <span className="fw-600 text-sm" style={{ flex: 1 }}>{a.first} {a.last}</span>
                      {/* How many of the ticked disciplines this athlete covers. */}
                      {form.events.length > 1 && matched > 0 && (
                        <span
                          className="text-xs mono fw-700"
                          title={`${matched}/${form.events.length}`}
                          style={{
                            padding: "1px 6px", borderRadius: 999,
                            background: matched === form.events.length ? "var(--accent-soft)" : "var(--bg-2)",
                            color: matched === form.events.length ? "var(--accent)" : "var(--fg-3)",
                          }}
                        >
                          {matched}/{form.events.length}
                        </span>
                      )}
                      <span className="text-xs muted">{(a.disciplines || []).join(", ") || a.specialty}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            )}
          </div>
          {!isEdit && form.participants.length > 0 && <span className="text-xs muted">{form.participants.length} {t("competition.participants").toLowerCase()}</span>}
        </div>
      </div>

      {showOrgPicker && (
        <OrganizerPicker
          onClose={() => setShowOrgPicker(false)}
          onChoose={(id) => { pickOrganizer(id); setShowOrgPicker(false); }}
        />
      )}

      {foglioAsk && (
        <ConfirmModal
          title={t("competition.sheet")}
          message={t("competition.foglioConfirm")}
          onCancel={() => setFoglioAsk(false)}
          choices={[
            { label: t("common.cancel"), variant: "ghost", onClick: () => setFoglioAsk(false) },
            { label: t("competition.foglioNoAthletes"), variant: "secondary", onClick: () => generateFoglio(false) },
            { label: t("competition.foglioWithAthletes"), variant: "primary", onClick: () => generateFoglio(true) },
          ]}
        />
      )}
    </Modal>
  );
}
