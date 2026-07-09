"use client";

// Races list + create modal.

import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Badge, Modal, Segmented, Tabs } from "@/components/primitives";
import { DateStack } from "@/components/shared";
import { PlacementStats } from "@/components/placement-stats";
import { useLane } from "@/components/lane-provider";
import { ALL_DISCIPLINES } from "@/lib/reference";
import { placementColor } from "@/utils";
import { RACE_LEVELS } from "@/lib/types";
import type { Athlete, Competition, CompetitionStatus, Organizer, RaceCategory, RaceEntry } from "@/lib/types";
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

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); commit(); }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  });

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
    <div ref={ref} style={{ position: "relative", minWidth: 240 }}>
      <div className="input-group">
        <Icon name="filter" size={14} />
        <input
          className="input"
          placeholder={t("races.typeFilter")}
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
            position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: 240, zIndex: 20,
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
              <div className="text-xs muted" style={{ padding: "6px 10px 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("races.recent")}</div>
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
  if (status === "live") return <Badge variant="danger" dot>LIVE</Badge>;
  if (status === "upcoming") return <Badge variant="accent" dot>Upcoming</Badge>;
  if (status === "completed") return <Badge variant="success" dot>Completed</Badge>;
  return <Badge>{status}</Badge>;
}

export function CompetitionsScreen() {
  const { competitions, athletes, organizers, entries, navigate, createCompetition, t } = useLane();
  const [view, setView] = useState<"table" | "cards">("table");
  const [filter, setFilter] = useState<"all" | CompetitionStatus>("all");
  const [catQuery, setCatQuery] = useState("");
  const [catHistory, setCatHistory] = useState<string[]>([]);
  const [monthFilter, setMonthFilter] = useState(""); // "YYYY-MM"
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [resultFor, setResultFor] = useState<RaceEntry | null>(null);
  const PAGE_SIZE = 10;

  const pushHistory = (q: string) => setCatHistory((prev) => [q, ...prev.filter((h) => h !== q)].slice(0, 6));

  // Any filter change resets to the first page of the races list.
  useEffect(() => { setPage(0); }, [filter, catQuery, monthFilter, search]);

  const catSet = parseCategoryQuery(catQuery);
  const filtered = competitions
    .filter((c) => (filter === "all" ? true : c.status === filter))
    .filter((c) => (catSet.length === 0 ? true : c.category ? catSet.includes(c.category) : false))
    .filter((c) => (!monthFilter ? true : (c.date || "").slice(0, 7) === monthFilter))
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.location.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

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
          <h1 className="page-title">{t("races.title")}</h1>
          <p className="page-subtitle">{t("races.subtitle")}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Icon name="plus" size={14} /> {t("races.new")}</button>
        </div>
      </div>

      <Tabs
        tabs={[
          { value: "all", label: "All", count: counts.all },
          { value: "upcoming", label: "Upcoming", count: counts.upcoming },
          { value: "live", label: "Live now", count: counts.live },
          { value: "completed", label: "Completed", count: counts.completed },
        ]}
        value={filter}
        onChange={setFilter}
      />

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ padding: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div className="input-group" style={{ flex: 1, minWidth: 200 }}>
            <Icon name="search" size={14} />
            <input className="input" placeholder={t("races.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <CategorySearchFilter value={catQuery} onChange={setCatQuery} history={catHistory} onCommit={pushHistory} />
          <div className="input-group" style={{ maxWidth: 168 }} title={t("races.month")}>
            <Icon name="calendar" size={14} />
            <input className="input" type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
            {monthFilter && <button className="icon-btn" title={t("common.clear")} onClick={() => setMonthFilter("")}><Icon name="close" size={13} /></button>}
          </div>
          <Segmented options={[{ value: "table", icon: "list", label: "Table" }, { value: "cards", icon: "grid", label: "Cards" }]} value={view} onChange={setView} />
        </div>
      </div>

      {view === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {filtered.map((c) => <CompetitionCard key={c.id} c={c} athletes={athletes} onOpen={() => navigate("competition-detail", c.id)} />)}
        </div>
      ) : (
        <div className="col" style={{ gap: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {/* LEFT — races list (Data · Competizione · Nazione), 10 per page (photo_25) */}
            <div className="card" style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th style={{ width: 104 }}>Date</th><th>Competition</th><th style={{ width: 64 }}>Nation</th></tr>
                  </thead>
                  <tbody>
                    {paged.map((c) => (
                      <tr key={c.id}
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
                        <td className="text-sm mono">{c.country || "—"}</td>
                      </tr>
                    ))}
                    {paged.length === 0 && <tr><td colSpan={3} className="text-sm muted" style={{ padding: 16 }}>No races match your filters.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-1)" }}>
                <span className="text-xs muted">{filtered.length === 0 ? "0" : `${safePage * PAGE_SIZE + 1}–${Math.min(filtered.length, safePage * PAGE_SIZE + PAGE_SIZE)}`} / {filtered.length}</span>
                <div className="row" style={{ gap: 6, alignItems: "center" }}>
                  <button className="btn btn-secondary btn-sm" disabled={safePage <= 0} onClick={() => setPage(safePage - 1)}><Icon name="chevronLeft" size={13} /> Prev</button>
                  <span className="text-xs muted mono">{safePage + 1}/{pageCount}</span>
                  <button className="btn btn-secondary btn-sm" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>Next <Icon name="chevronRight" size={13} /></button>
                </div>
              </div>
            </div>

            {/* RIGHT — athletes competing in the selected race (Nome · Disciplina · Posizione · Tempo) */}
            <RaceEntriesPanel
              race={selectedRace}
              entries={selectedEntries}
              athletes={athletes}
              onEditResult={setResultFor}
              onOpen={() => selectedRaceId && navigate("competition-detail", selectedRaceId)}
            />
          </div>

          <div className="card" style={{ padding: 0 }}><RaceLegend /></div>

          {/* Placement statistics below the competition table (photo_28). */}
          {hasResults && (
            <div className="card card-pad">
              <PlacementStats entries={raceEntries} totalLabelKey="stats.results" title={t("stats.allRaces")} />
            </div>
          )}
        </div>
      )}

      {resultFor && <ResultModal entry={resultFor} athletes={athletes} onClose={() => setResultFor(null)} />}
      {showCreate && <CompetitionFormModal organizers={organizers} athletes={athletes} onClose={() => setShowCreate(false)} onSave={(d) => { createCompetition(d); setShowCreate(false); }} />}
    </div>
  );
}

// The selected race's competing athletes (photo_25): Name · Discipline · Position
// · Time, coloured by placement. Results are edited by right-clicking a row (a
// modern take on the old right-mouse action) — or double-click / the pencil.
function RaceEntriesPanel({ race, entries, athletes, onEditResult, onOpen }: {
  race: Competition | null;
  entries: RaceEntry[];
  athletes: Athlete[];
  onEditResult: (e: RaceEntry) => void;
  onOpen: () => void;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number; entry: RaceEntry } | null>(null);
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

  if (!race) {
    return (
      <div className="card" style={{ flex: 1, minWidth: 0 }}>
        <div className="col" style={{ alignItems: "center", justifyContent: "center", gap: 10, padding: 48, textAlign: "center", minHeight: 300 }}>
          <Icon name="trophy" size={30} style={{ color: "var(--fg-3)" }} />
          <div className="text-sm muted" style={{ maxWidth: 300 }}>Select a race to see the athletes competing, with their discipline, position and time.</div>
        </div>
      </div>
    );
  }

  const menuItem: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 4, textAlign: "left", fontSize: 13, background: "transparent", color: "var(--fg-1)", width: "100%" };

  return (
    <div className="card" style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
      <div className="card-header">
        <div className="row" style={{ gap: 8, alignItems: "baseline", minWidth: 0 }}>
          <div className="card-title" style={{ color: raceColor(race.date) }}>{race.name}</div>
          <span className="text-sm muted">{race.location}</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onOpen}><Icon name="external" size={13} /> Open race</button>
      </div>
      <div className="table-wrap" style={{ maxHeight: "calc(100vh - 430px)", minHeight: 200, overflowY: "auto" }}>
        <table className="table" style={{ margin: 0 }}>
          <thead>
            <tr><th>Name</th><th>Discipline</th><th style={{ width: 72 }}>Position</th><th style={{ width: 92 }}>Time</th><th style={{ width: 40 }}></th></tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={5} className="text-sm muted" style={{ padding: 16 }}>No athletes entered in this race.</td></tr>
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
                  <td className="fw-700 mono" style={{ color }}>{placeText(e)}</td>
                  <td className="mono" style={{ color }}>{e.time || "—"}</td>
                  <td onClick={(ev) => ev.stopPropagation()}>
                    <button className="icon-btn" title="Edit result" onClick={() => onEditResult(e)}><Icon name="edit" size={13} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-xs muted" style={{ padding: "8px 14px", borderTop: "1px solid var(--border-1)" }}>
        Right-click (or double-click) an athlete to edit their result.
      </div>

      {menu && (
        <div style={{ position: "fixed", top: menu.y, left: menu.x, zIndex: 50, background: "var(--bg-1)", border: "1px solid var(--border-2)", borderRadius: "var(--r-md)", boxShadow: "var(--shadow-lift)", padding: 4, minWidth: 168 }}>
          <button style={menuItem} onClick={() => { onEditResult(menu.entry); setMenu(null); }}><Icon name="edit" size={13} /> Edit result</button>
          <button style={menuItem} onClick={() => { onOpen(); setMenu(null); }}><Icon name="external" size={13} /> Open race</button>
        </div>
      )}
    </div>
  );
}

function CompetitionCard({ c, athletes, onOpen }: { c: Competition; athletes: Athlete[]; onOpen: () => void }) {
  return (
    <button className="card" onClick={onOpen} style={{ padding: 0, textAlign: "left", overflow: "hidden", cursor: "pointer" }}>
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
        <div className="row">
          <DateStack date={c.date} />
          <div style={{ flex: 1 }}>
            <div className="display fw-700" style={{ fontSize: 16, letterSpacing: "-0.02em" }}>{c.short || c.name}</div>
            <div className="text-sm muted">{c.location}</div>
          </div>
          <CompStatusBadge status={c.status} />
        </div>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div className="text-xs muted mono fw-700" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Events</div>
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {c.events.map((e) => <span key={e} className="tag">{e}</span>)}
          </div>
        </div>
        <div className="row" style={{ borderTop: "1px solid var(--border-1)", paddingTop: 12 }}>
          <div className="text-xs muted">Entries</div>
          <div className="spacer" />
          {c.entries > 0 ? (
            <div className="avatar-stack">
              {athletes.slice(0, Math.min(c.entries, 4)).map((a) => <Avatar key={a.id} name={a.first + " " + a.last} color={a.color} size="xs" />)}
              {c.entries > 4 && <span className="avatar avatar-xs" style={{ background: "var(--bg-3)", color: "var(--fg-2)" }}>+{c.entries - 4}</span>}
            </div>
          ) : (
            <span className="muted text-sm">None yet</span>
          )}
        </div>
      </div>
    </button>
  );
}

function CompetitionFormModal({ onClose, onSave, organizers, athletes }: { onClose: () => void; onSave: (d: any) => void; organizers: Organizer[]; athletes: Athlete[] }) {
  const [form, setForm] = useState<any>({
    name: "", short: "", location: "", country: "",
    date: "", endDate: "", type: "Diamond League", tier: "tier-1",
    events: [] as string[], status: "upcoming", entries: 0,
    category: "meeting" as RaceCategory, level: "International", organizerId: "",
    contactSurname: "", contactName: "", contactPhone: "", contactEmail: "",
    participants: [] as string[],
  });
  const { t, createEntry } = useLane();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [discFilter, setDiscFilter] = useState<string>("all"); // participants panel filter
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

  // Athletes shown on the right (photo_19): filtered by the disciplines the race
  // offers. Clicking a discipline on the left narrows to athletes who run it.
  const hasDisc = (a: Athlete, ev: string) => (a.disciplines || []).includes(ev);
  const eligible = athletes.filter((a) => {
    if (form.events.length === 0) return false;
    if (discFilter !== "all") return hasDisc(a, discFilter);
    return form.events.some((ev: string) => hasDisc(a, ev)) || (a.disciplines || []).length === 0;
  });

  const submit = () => {
    const e: Record<string, string> = {};
    if (!form.name) e.name = "Required";
    if (!form.date) e.date = "Required";
    if (!form.location) e.location = "Required";
    setErrors(e);
    if (Object.keys(e).length === 0) {
      const catLabel = RACE_CATEGORIES.find((c) => c.v === form.category)?.l || "Race";
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
      onSave(payload);
      // Enter each selected participant into a discipline they run.
      for (const aid of form.participants as string[]) {
        const a = athletes.find((x) => x.id === aid);
        if (!a) continue;
        const disc = form.events.find((ev: string) => hasDisc(a, ev)) || (discFilter !== "all" ? discFilter : form.events[0]) || "";
        createEntry({ competitionId: id, athleteId: aid, discipline: disc, gender: a.gender === "F" ? "W" : "M", status: "proposed" });
      }
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      size="lg"
      title={t("races.new")}
      footer={<><button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button><button className="btn btn-primary" onClick={submit}>{t("races.new")}</button></>}
    >
      <div className="col" style={{ gap: 14 }}>
        <div className="field">
          <label className="field-label">{t("race.name")}</label>
          <input className="input" placeholder="e.g. Lille Half Marathon" value={form.name} onChange={(e) => update("name", e.target.value)} aria-invalid={!!errors.name} />
          {errors.name && <span className="field-error"><Icon name="alert" size={11} /> {errors.name}</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field">
            <label className="field-label">{t("race.venue")}</label>
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
            <label className="field-label">{t("races.type")}</label>
            <select className="input" value={form.category} onChange={(e) => update("category", e.target.value)}>
              {RACE_CATEGORIES.map((c) => <option key={c.v} value={c.v}>{t(`cat.${c.v}`)}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">{t("race.level")}</label>
            <select className="input" value={form.level} onChange={(e) => update("level", e.target.value)}>
              {RACE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="field-label">{t("race.organizer")}</label>
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
          <label className="field-label">{t("race.contact")}</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input className="input" placeholder={t("race.contactSurname")} value={form.contactSurname} onChange={(e) => update("contactSurname", e.target.value)} />
            <input className="input" placeholder={t("race.contactName")} value={form.contactName} onChange={(e) => update("contactName", e.target.value)} />
            <input className="input" placeholder={t("org.phone")} value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} />
            <input className="input" type="email" placeholder={t("org.email")} value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} />
          </div>
        </div>

        {/* Disciplines (left) & participants (right), side by side — photo_19.
            Tick disciplines the race offers on the left; click one to filter the
            eligible athletes on the right by who runs it. */}
        <div className="field">
          <label className="field-label">{t("race.disciplines")} &amp; {t("race.participants")}</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {/* LEFT — disciplines */}
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="card-header" style={{ padding: "8px 12px" }}>
                <div className="card-title text-sm">{t("race.disciplines")}</div>
                {form.events.length > 0 && <span className="text-xs muted">{form.events.length}</span>}
              </div>
              <div style={{ padding: 6, maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
                {allEvents.map((ev) => {
                  const inRace = form.events.includes(ev);
                  const active = discFilter === ev;
                  return (
                    <div key={ev} className="row" style={{ gap: 8, padding: "4px 8px", borderRadius: 6, background: active ? "var(--accent-soft)" : "transparent" }}>
                      <input type="checkbox" checked={inRace} onChange={() => toggleEvent(ev)} />
                      <button
                        onClick={() => setDiscFilter(active ? "all" : ev)}
                        className="text-sm"
                        style={{ flex: 1, textAlign: "left", background: "transparent", color: inRace ? (active ? "var(--accent)" : "var(--fg-1)") : "var(--fg-3)", fontWeight: inRace ? 600 : 400 }}
                      >
                        {ev}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT — participants */}
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="card-header" style={{ padding: "8px 12px" }}>
                <div className="card-title text-sm">{t("race.participants")}{discFilter !== "all" ? ` · ${discFilter}` : ""}</div>
                {discFilter !== "all" && <button className="btn btn-ghost btn-sm" onClick={() => setDiscFilter("all")}>{t("common.all")}</button>}
              </div>
              <div style={{ padding: 6, maxHeight: 260, overflowY: "auto" }}>
                {form.events.length === 0 ? (
                  <div className="text-sm muted" style={{ padding: 8 }}>{t("race.pickDisciplines")}</div>
                ) : eligible.length === 0 ? (
                  <div className="text-sm muted" style={{ padding: 8 }}>{t("race.noEligible")}</div>
                ) : (
                  eligible.map((a) => (
                    <label key={a.id} className="row" style={{ gap: 8, padding: "6px 8px", cursor: "pointer", borderRadius: 6, background: form.participants.includes(a.id) ? "var(--accent-soft)" : "transparent" }}>
                      <input type="checkbox" checked={form.participants.includes(a.id)} onChange={() => toggleParticipant(a.id)} />
                      <Avatar name={a.first + " " + a.last} color={a.color} size="xs" />
                      <span className="fw-600 text-sm" style={{ flex: 1 }}>{a.first} {a.last}</span>
                      <span className="text-xs muted">{(a.disciplines || []).join(", ") || a.specialty}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          {form.participants.length > 0 && <span className="text-xs muted">{form.participants.length} {t("race.participants").toLowerCase()}</span>}
        </div>
      </div>

      {showOrgPicker && (
        <OrganizerPicker
          onClose={() => setShowOrgPicker(false)}
          onChoose={(id) => { pickOrganizer(id); setShowOrgPicker(false); }}
        />
      )}
    </Modal>
  );
}
