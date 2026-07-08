"use client";

// Races list + create modal.

import React, { useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Badge, Modal, Segmented, Tabs } from "@/components/primitives";
import { DateStack, FilterDropdown } from "@/components/shared";
import { useLane } from "@/components/lane-provider";
import { ALL_DISCIPLINES } from "@/lib/reference";
import { RACE_LEVELS } from "@/lib/types";
import type { Athlete, Competition, CompetitionStatus, Organizer, RaceCategory } from "@/lib/types";
import { OrganizerPicker } from "@/features/organizers/components/organizer-picker";

// Single categories — used by the race form.
const RACE_CATEGORIES: { v: RaceCategory; l: string }[] = [
  { v: "half-marathon", l: "Half marathon" },
  { v: "marathon", l: "Marathon" },
  { v: "meeting", l: "Meeting" },
  { v: "road", l: "Road" },
  { v: "cross", l: "Cross" },
  { v: "indoor", l: "Indoor" },
];

// Filter presets — includes the combined options from the old "Tipo" dropdown
// (photo_22): "half marathon + marathon" and "road + cross + half marathon".
const CATEGORY_FILTERS: { v: string; l: string; match?: RaceCategory[] }[] = [
  { v: "all", l: "All" },
  ...RACE_CATEGORIES.map((c) => ({ v: c.v as string, l: c.l })),
  { v: "hm+m", l: "Half marathon + marathon", match: ["half-marathon", "marathon"] },
  { v: "road+cross+hm", l: "Road + cross + half marathon", match: ["road", "cross", "half-marathon"] },
];

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

export function CompStatusBadge({ status }: { status: string }) {
  if (status === "live") return <Badge variant="danger" dot>LIVE</Badge>;
  if (status === "upcoming") return <Badge variant="accent" dot>Upcoming</Badge>;
  if (status === "completed") return <Badge variant="success" dot>Completed</Badge>;
  return <Badge>{status}</Badge>;
}

export function CompetitionsScreen() {
  const { competitions, athletes, organizers, navigate, createCompetition, t } = useLane();
  const [view, setView] = useState<"table" | "cards">("table");
  const [filter, setFilter] = useState<"all" | CompetitionStatus>("all");
  const [filterCat, setFilterCat] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const catFilter = CATEGORY_FILTERS.find((f) => f.v === filterCat);
  const filtered = competitions
    .filter((c) => (filter === "all" ? true : c.status === filter))
    .filter((c) => {
      if (filterCat === "all") return true;
      if (catFilter?.match) return c.category ? catFilter.match.includes(c.category) : false;
      return c.category === filterCat;
    })
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.location.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  const counts = {
    all: competitions.length,
    upcoming: competitions.filter((c) => c.status === "upcoming").length,
    live: competitions.filter((c) => c.status === "live").length,
    completed: competitions.filter((c) => c.status === "completed").length,
  };

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
          <div className="input-group" style={{ flex: 1, minWidth: 220 }}>
            <Icon name="search" size={14} />
            <input className="input" placeholder={t("races.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <FilterDropdown label={t("races.type")} value={filterCat} options={CATEGORY_FILTERS.map((f) => ({ v: f.v, l: f.v === "all" ? t("common.all") : t(`cat.${f.v}`) }))} onChange={setFilterCat} />
          <button className="btn btn-secondary btn-sm"><Icon name="sort" size={13} /> Date</button>
          <Segmented options={[{ value: "table", icon: "list", label: "Table" }, { value: "cards", icon: "grid", label: "Cards" }]} value={view} onChange={setView} />
        </div>
      </div>

      {view === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {filtered.map((c) => <CompetitionCard key={c.id} c={c} athletes={athletes} onOpen={() => navigate("competition-detail", c.id)} />)}
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Competition</th><th>Location</th><th>Type</th><th>Status</th><th>Entries</th><th>Events</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} onClick={() => navigate("competition-detail", c.id)}>
                  <td><DateStack date={c.date} /></td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <span title={raceColorKey(c.date)} style={{ width: 8, height: 8, borderRadius: 999, background: raceColor(c.date), flex: "none" }} />
                      <div className="fw-600" style={{ color: raceColor(c.date) }}>{c.name}</div>
                    </div>
                    {c.date !== c.endDate && <div className="text-xs muted mono">{c.date} → {c.endDate}</div>}
                  </td>
                  <td className="text-sm">{c.location}</td>
                  <td>
                    <Badge variant={c.tier === "tier-1" ? "accent" : ""}>{c.type}</Badge>
                    {c.level && <span className="text-xs muted" style={{ marginLeft: 6 }}>{c.level}</span>}
                  </td>
                  <td><CompStatusBadge status={c.status} /></td>
                  <td className="text-sm">
                    {c.entries === 0 ? <span className="muted">—</span> : (
                      <div className="avatar-stack">
                        {athletes.slice(0, Math.min(c.entries, 3)).map((a) => <Avatar key={a.id} name={a.first + " " + a.last} color={a.color} size="xs" />)}
                        {c.entries > 3 && <span className="avatar avatar-xs" style={{ background: "var(--bg-3)", color: "var(--fg-2)" }}>+{c.entries - 3}</span>}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="row" style={{ flexWrap: "wrap", gap: 3 }}>
                      {c.events.slice(0, 3).map((e) => <span key={e} className="tag" style={{ padding: "1px 6px", fontSize: 10 }}>{e}</span>)}
                      {c.events.length > 3 && <span className="text-xs muted">+{c.events.length - 3}</span>}
                    </div>
                  </td>
                  <td><Icon name="chevronRight" size={14} style={{ color: "var(--fg-3)" }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderTop: "1px solid var(--border-1)" }}><RaceLegend /></div>
        </div>
      )}

      {showCreate && <CompetitionFormModal organizers={organizers} onClose={() => setShowCreate(false)} onSave={(d) => { createCompetition(d); setShowCreate(false); }} />}
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

function CompetitionFormModal({ onClose, onSave, organizers }: { onClose: () => void; onSave: (d: any) => void; organizers: Organizer[] }) {
  const [form, setForm] = useState<any>({
    name: "", short: "", location: "", country: "",
    date: "", endDate: "", type: "Diamond League", tier: "tier-1",
    events: [] as string[], status: "upcoming", entries: 0,
    category: "meeting" as RaceCategory, level: "International", organizerId: "",
  });
  const { t } = useLane();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const update = (k: string, v: any) => setForm({ ...form, [k]: v });
  const organizer = organizers.find((o) => o.id === form.organizerId);

  const allEvents = ALL_DISCIPLINES;

  const toggleEvent = (ev: string) => {
    setForm({ ...form, events: form.events.includes(ev) ? form.events.filter((e: string) => e !== ev) : [...form.events, ev] });
  };

  const submit = () => {
    const e: Record<string, string> = {};
    if (!form.name) e.name = "Required";
    if (!form.date) e.date = "Required";
    if (!form.location) e.location = "Required";
    setErrors(e);
    if (Object.keys(e).length === 0) {
      const catLabel = RACE_CATEGORIES.find((c) => c.v === form.category)?.l || "Race";
      onSave({
        ...form,
        id: "c" + Math.random().toString(36).slice(2, 6),
        endDate: form.endDate || form.date,
        type: form.level || catLabel,   // display badge = level (fallback: category)
        tier: form.level === "DL" || form.level === "Gold" ? "tier-1" : "tier-2",
        results: 0,
      });
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
            <select className="input" style={{ flex: 1 }} value={form.organizerId} onChange={(e) => update("organizerId", e.target.value)}>
              <option value="">— {t("common.none")} —</option>
              {organizers.map((o) => <option key={o.id} value={o.id}>{o.name}{o.nation ? ` · ${o.nation}` : ""}</option>)}
            </select>
            <button className="btn btn-secondary" onClick={() => setShowOrgPicker(true)}><Icon name="users" size={13} /> {t("common.browse")}</button>
          </div>
          {organizer && <span className="text-xs muted">{[organizer.phone, organizer.email].filter(Boolean).join(" · ")}</span>}
        </div>

        <div className="field">
          <label className="field-label">{t("race.disciplines")}</label>
          <div className="card" style={{ padding: 10, display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 160, overflowY: "auto" }}>
            {allEvents.map((ev) => (
              <button
                key={ev}
                onClick={() => toggleEvent(ev)}
                className="tag"
                style={{
                  cursor: "pointer",
                  background: form.events.includes(ev) ? "var(--accent)" : "var(--bg-2)",
                  color: form.events.includes(ev) ? "white" : "var(--fg-2)",
                  borderColor: form.events.includes(ev) ? "var(--accent)" : "var(--border-1)",
                }}
              >
                {ev}
              </button>
            ))}
          </div>
          {form.events.length > 0 && <span className="text-xs muted">{form.events.length} discipline{form.events.length > 1 ? "s" : ""} selected</span>}
        </div>
      </div>

      {showOrgPicker && (
        <OrganizerPicker
          onClose={() => setShowOrgPicker(false)}
          onChoose={(id) => { update("organizerId", id); setShowOrgPicker(false); }}
        />
      )}
    </Modal>
  );
}
