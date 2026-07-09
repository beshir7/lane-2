"use client";

// Athlete list screen.

import React, { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, EmptyState, Segmented } from "@/components/primitives";
import { FilterDropdown, StatusBadge } from "@/components/shared";
import { AthleteFormModal } from "./athlete-form-modal";
import { useLane } from "@/components/lane-provider";
import { EVENT_CATEGORIES } from "@/lib/reference";
import { downloadJson, downloadCsv, pickFiles, placementColor } from "@/utils";
import { useToast } from "@/components/primitives";
import type { Athlete, RaceEntry, Competition } from "@/lib/types";

type SortState = { key: string; dir: "asc" | "desc" };

// Old-system convention: women pink, men blue; (E)/(M) = contract tag.
const GENDER_COLOR: Record<string, string> = { F: "#f55b6e", M: "#5b6ef5", X: "var(--fg-1)" };
const nameColor = (g: string) => GENDER_COLOR[g] || "var(--fg-1)";
const contractSuffix = (c?: "E" | "M" | null) => (c ? ` (${c})` : "");

// dd/mm/yyyy like the old Dema DB "Data di nascita" column.
const fmtDob = (iso?: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
};
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
// Posizione as shown in photo_28/36: "1st", "7th", or the note ("DNF"/"DQ").
const placeLabel = (pos?: number, note?: string) => (pos ? ordinal(pos) : note && /^(DNF|DNS|DQ)$/i.test(note) ? note.toUpperCase() : "—");

export function AthletesScreen() {
  const { athletes, entries, competitions, navigate, createAthlete, deleteAthlete, t } = useLane();
  const push = useToast();
  const [view, setView] = useState<"table" | "cards">("table");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSquad, setFilterSquad] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [sortBy, setSortBy] = useState<SortState>({ key: "name", dir: "asc" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    const r = athletes.filter((a) => {
      if (search) {
        const q = search.toLowerCase();
        if (!`${a.first} ${a.last} ${a.specialty} ${a.nationality}`.toLowerCase().includes(q)) return false;
      }
      if (filterCat !== "all" && a.category !== filterCat) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterSquad !== "all" && a.squad !== filterSquad) return false;
      if (filterGender !== "all" && a.gender !== filterGender) return false;
      return true;
    });
    r.sort((a, b) => {
      let av: any, bv: any;
      if (sortBy.key === "name") { av = a.first + a.last; bv = b.first + b.last; }
      else if (sortBy.key === "form") { av = a.progress; bv = b.progress; }
      else if (sortBy.key === "age") { av = a.age; bv = b.age; }
      else { av = (a as any)[sortBy.key]; bv = (b as any)[sortBy.key]; }
      if (av < bv) return sortBy.dir === "asc" ? -1 : 1;
      if (av > bv) return sortBy.dir === "asc" ? 1 : -1;
      return 0;
    });
    return r;
  }, [athletes, search, filterCat, filterStatus, filterSquad, filterGender, sortBy]);

  const toggleSel = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.id)));
  };
  const flipSort = (key: string) => {
    if (sortBy.key === key) setSortBy({ key, dir: sortBy.dir === "asc" ? "desc" : "asc" });
    else setSortBy({ key, dir: "asc" });
  };

  const squads = Array.from(new Set(athletes.map((a) => a.squad)));

  const exportAthletes = () => {
    downloadCsv(
      "athletes",
      filtered.map((a) => ({
        name: `${a.first} ${a.last}`, discipline: a.specialty, country: a.nationality,
        age: a.age, squad: a.squad, status: a.status, form: a.progress,
        gold: a.medals.gold, silver: a.medals.silver, bronze: a.medals.bronze,
      }))
    );
    push({ title: "Export ready", body: `${filtered.length} athletes → CSV`, variant: "success" });
  };

  const importAthletes = async () => {
    const files = await pickFiles("application/json", false);
    if (!files.length) return;
    try {
      const parsed = JSON.parse(await files[0].text());
      const list: Partial<Athlete>[] = Array.isArray(parsed) ? parsed : [parsed];
      list.forEach((a) => createAthlete(a));
    } catch {
      push({ title: "Import failed", body: "Expected a JSON array of athletes", variant: "danger" });
    }
  };

  const bulkDelete = () => {
    selected.forEach((id) => deleteAthlete(id));
    setSelected(new Set());
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("athletes.title")}</h1>
          <p className="page-subtitle">{filtered.length} / {athletes.length} · {t("athletes.subtitle")}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={exportAthletes}><Icon name="download" size={14} /> {t("common.export")}</button>
          <button className="btn btn-secondary" onClick={importAthletes}><Icon name="upload" size={14} /> {t("common.upload")}</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Icon name="plus" size={14} /> {t("athletes.new")}</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ padding: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div className="input-group" style={{ flex: 1, minWidth: 220 }}>
            <Icon name="search" size={14} />
            <input className="input" placeholder="Search by name, event, country…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <FilterDropdown label={t("filter.gender")} value={filterGender} options={[{ v: "all", l: t("gender.mf") }, { v: "F", l: t("gender.women") }, { v: "M", l: t("gender.men") }]} onChange={setFilterGender} />
          <FilterDropdown label={t("filter.discipline")} value={filterCat} options={[{ v: "all", l: t("common.all") }, ...Object.entries(EVENT_CATEGORIES).map(([k, v]) => ({ v: k, l: v.label }))]} onChange={setFilterCat} />
          <FilterDropdown label={t("common.status")} value={filterStatus} options={[{ v: "all", l: t("common.all") }, { v: "active", l: t("status.active") }, { v: "injury", l: t("status.injury") }, { v: "pregnant", l: t("status.pregnant") }, { v: "inactive", l: t("status.inactive") }]} onChange={setFilterStatus} />
          <FilterDropdown label={t("filter.squad")} value={filterSquad} options={[{ v: "all", l: t("common.all") }, ...squads.map((s) => ({ v: s, l: s }))]} onChange={setFilterSquad} />

          <div className="row" style={{ gap: 6, marginLeft: "auto" }}>
            {selected.size > 0 && (
              <div className="row" style={{ gap: 6, marginRight: 8 }}>
                <span className="text-sm muted">{selected.size} selected</span>
                <button className="btn btn-secondary btn-sm"><Icon name="mail" size={13} /> Message</button>
                <button className="btn btn-secondary btn-sm"><Icon name="folder" size={13} /> Move squad</button>
                <button className="btn btn-secondary btn-sm"><Icon name="trash" size={13} /> Delete</button>
              </div>
            )}
            <Segmented options={[{ value: "table", icon: "list", label: "Table" }, { value: "cards", icon: "grid", label: "Cards" }]} value={view} onChange={setView} />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="athletes"
            title="No athletes match your filters"
            description="Try clearing search or filter selections to see more athletes."
            action={<button className="btn btn-secondary" onClick={() => { setSearch(""); setFilterCat("all"); setFilterStatus("all"); setFilterSquad("all"); setFilterGender("all"); }}>Clear filters</button>}
          />
        </div>
      ) : view === "table" ? (
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* LEFT — Lista atleti: name (gender colour + contract), nationality, DOB */}
          <div className="card" style={{ width: 400, flex: "none", overflow: "hidden" }}>
            <div className="card-header">
              <div className="card-title">{t("athletes.list")}</div>
              <span className="text-sm muted">{filtered.length}</span>
            </div>
            <div className="table-wrap" style={{ maxHeight: "calc(100vh - 340px)", overflowY: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 26 }}>
                      <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                    </th>
                    <SortHeader label={t("athlete.firstName")} k="name" cur={sortBy} onClick={() => flipSort("name")} />
                    <SortHeader label={t("athlete.nationality")} k="nationality" cur={sortBy} onClick={() => flipSort("nationality")} />
                    <SortHeader label={t("athlete.dob")} k="dob" cur={sortBy} onClick={() => flipSort("dob")} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className={selected.has(a.id) ? "is-selected" : ""} onClick={() => setPreviewId(a.id)} onDoubleClick={() => navigate("athlete-detail", a.id)} style={{ cursor: "pointer", background: a.id === previewId ? "var(--accent-soft)" : undefined }}>
                      <td onClick={(e) => { e.stopPropagation(); toggleSel(a.id); }}>
                        <input type="checkbox" checked={selected.has(a.id)} onChange={() => {}} />
                      </td>
                      <td className="fw-600" style={{ color: nameColor(a.gender) }}>{a.last}, {a.first}{contractSuffix(a.contract)}</td>
                      <td className="text-sm">{a.nationality}</td>
                      <td className="text-sm mono" style={{ whiteSpace: "nowrap" }}>{fmtDob(a.dob)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-1)" }}>
              <div className="row" style={{ gap: 14 }}>
                <span className="row text-xs muted" style={{ gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: GENDER_COLOR.M, display: "inline-block" }} /> {t("gender.men")}</span>
                <span className="row text-xs muted" style={{ gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: GENDER_COLOR.F, display: "inline-block" }} /> {t("gender.women")}</span>
              </div>
              <span className="text-xs muted">{filtered.length} / {athletes.length}</span>
            </div>
          </div>

          {/* RIGHT — the selected athlete's competitions + statistics (photo_28/36) */}
          <AthletePreview
            athlete={filtered.find((a) => a.id === previewId) || null}
            entries={entries.filter((e) => e.athleteId === previewId)}
            competitions={competitions}
            onOpen={() => previewId && navigate("athlete-detail", previewId)}
            t={t}
          />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {filtered.map((a) => (
            <AthleteCard key={a.id} athlete={a} onOpen={() => navigate("athlete-detail", a.id)} />
          ))}
        </div>
      )}

      {showCreate && <AthleteFormModal onClose={() => setShowCreate(false)} onSave={(data) => { createAthlete(data); setShowCreate(false); }} />}
    </div>
  );
}

function SortHeader({ label, k, cur, onClick }: { label: string; k: string; cur: SortState; onClick: () => void }) {
  return (
    <th onClick={onClick} style={{ cursor: "pointer", userSelect: "none" }}>
      <span className="row" style={{ gap: 4 }}>
        {label}
        {cur.key === k && <Icon name={cur.dir === "asc" ? "chevronUp" : "chevronDown"} size={11} />}
      </span>
    </th>
  );
}

function AthleteCard({ athlete, onOpen }: { athlete: Athlete; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="card" style={{ padding: 0, textAlign: "left", cursor: "pointer", overflow: "hidden" }}>
      <div style={{ height: 80, background: `linear-gradient(135deg, ${athlete.color}aa 0%, ${athlete.color}55 100%)`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(0deg, transparent 0 28px, rgba(255,255,255,0.08) 28px 29px)", backgroundSize: "100% 28px" }} />
        <span style={{ position: "absolute", top: 10, right: 10 }}><StatusBadge status={athlete.status} /></span>
      </div>
      <div style={{ padding: "0 16px 16px", marginTop: -28 }}>
        <Avatar name={athlete.first + " " + athlete.last} color={athlete.color} size="lg" style={{ border: "3px solid var(--bg-1)" }} />
        <div style={{ marginTop: 8 }}>
          <div className="display fw-700 text-lg" style={{ letterSpacing: "-0.02em", color: nameColor(athlete.gender) }}>{athlete.first} {athlete.last}{contractSuffix(athlete.contract)}</div>
          <div className="text-sm muted">{athlete.nationality} · {athlete.specialty}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-1)" }}>
          <Stat3 v={athlete.medals.gold} l="Gold" c="#f5b14c" />
          <Stat3 v={athlete.medals.silver} l="Silver" c="#c9d3df" />
          <Stat3 v={athlete.medals.bronze} l="Bronze" c="#c08c5e" />
        </div>
      </div>
    </button>
  );
}

function Stat3({ v, l, c }: { v: number; l: string; c: string }) {
  return (
    <div>
      <div className="display fw-700" style={{ fontSize: 16, color: c, letterSpacing: "-0.02em" }}>{v}</div>
      <div className="text-xs muted" style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>{l}</div>
    </div>
  );
}

// The list detail panel (photo_28 / photo_36): the selected athlete's whole
// competition history — Data · Competizione · Naz · Distanza · Posizione · Tempo,
// each line coloured by placement — followed by the statistics + placement pie.
function AthletePreview({
  athlete,
  entries,
  competitions,
  onOpen,
  t,
}: {
  athlete: Athlete | null;
  entries: RaceEntry[];
  competitions: Competition[];
  onOpen: () => void;
  t: (k: string) => string;
}) {
  const comp = (id: string) => competitions.find((c) => c.id === id);
  // Most recent competition first, like the old DB.
  const ordered = [...entries].sort((a, b) => (comp(b.competitionId)?.date || "").localeCompare(comp(a.competitionId)?.date || ""));

  if (!athlete) {
    return (
      <div className="card" style={{ flex: 1, minWidth: 0 }}>
        <div className="col" style={{ alignItems: "center", justifyContent: "center", gap: 10, padding: 48, textAlign: "center", minHeight: 320 }}>
          <Icon name="trophy" size={30} style={{ color: "var(--fg-3)" }} />
          <div className="text-sm muted" style={{ maxWidth: 280 }}>{t("athletes.selectHint")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
      <div className="card-header">
        <div className="row" style={{ gap: 10, alignItems: "baseline" }}>
          <div className="card-title" style={{ color: nameColor(athlete.gender) }}>{athlete.last}, {athlete.first}{contractSuffix(athlete.contract)}</div>
          <span className="text-sm muted">{athlete.nationality} · {athlete.specialty}</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onOpen}><Icon name="edit" size={13} /> {t("athlete.openProfile")}</button>
      </div>

      <div className="table-wrap" style={{ maxHeight: "calc(100vh - 470px)", minHeight: 200, overflowY: "auto" }}>
        <table className="table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th style={{ width: 90 }}>{t("athlete.date")}</th>
              <th>{t("athlete.competition")}</th>
              <th style={{ width: 52 }}>{t("athlete.nation")}</th>
              <th style={{ width: 110 }}>{t("athlete.distance")}</th>
              <th style={{ width: 64 }}>{t("athlete.place")}</th>
              <th style={{ width: 88 }}>{t("athlete.time")}</th>
            </tr>
          </thead>
          <tbody>
            {ordered.length === 0 ? (
              <tr><td colSpan={6} className="text-sm muted" style={{ padding: 16 }}>{t("athlete.noRaces")}</td></tr>
            ) : (
              ordered.map((e) => {
                const c = comp(e.competitionId);
                const color = e.position != null ? placementColor(e.position) : undefined;
                return (
                  <tr key={e.id} style={{ color }}>
                    <td className="mono text-sm" style={{ whiteSpace: "nowrap", color }}>{fmtDob(c?.date)}</td>
                    <td className="fw-600" style={{ color }}>{c?.name || e.competitionId}</td>
                    <td className="mono text-sm" style={{ color }}>{c?.country || "—"}</td>
                    <td style={{ color }}>{e.discipline}</td>
                    <td className="fw-700 mono" style={{ color }}>{placeLabel(e.position, e.note)}</td>
                    <td className="mono" style={{ color }}>{e.time || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
