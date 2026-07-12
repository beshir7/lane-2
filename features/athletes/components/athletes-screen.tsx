"use client";

// Athlete list screen.

import React, { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Drawer, EmptyState, Segmented } from "@/components/primitives";
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
  const [view, setView] = useState<"cards" | "list">("cards");
  const [peekId, setPeekId] = useState<string | null>(null);
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
            <Segmented options={[{ value: "cards", icon: "grid", label: "Grid" }, { value: "list", icon: "list", label: "List" }]} value={view} onChange={setView} />
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
      ) : view === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {filtered.map((a) => (
            <AthleteCard key={a.id} athlete={a} entries={entries} onPeek={() => setPeekId(a.id)} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 26 }}>
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                  </th>
                  <SortHeader label={t("athlete.firstName")} k="name" cur={sortBy} onClick={() => flipSort("name")} />
                  <SortHeader label={t("athlete.nationality")} k="nationality" cur={sortBy} onClick={() => flipSort("nationality")} />
                  <th>{t("filter.discipline")}</th>
                  <SortHeader label={t("athlete.dob")} k="dob" cur={sortBy} onClick={() => flipSort("dob")} />
                  <th style={{ width: 110 }}>{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className={selected.has(a.id) ? "is-selected" : ""} onClick={() => setPeekId(a.id)} onDoubleClick={() => navigate("athlete-detail", a.id)} style={{ cursor: "pointer", background: a.id === peekId ? "var(--accent-soft)" : undefined }}>
                    <td onClick={(e) => { e.stopPropagation(); toggleSel(a.id); }}>
                      <input type="checkbox" checked={selected.has(a.id)} onChange={() => {}} />
                    </td>
                    <td className="fw-600" style={{ color: nameColor(a.gender) }}>
                      <div className="row" style={{ gap: 8 }}>
                        <Avatar name={a.first + " " + a.last} color={a.color} size="xs" />
                        {a.first} {a.last}{contractSuffix(a.contract)}
                      </div>
                    </td>
                    <td className="text-sm">{a.nationality}</td>
                    <td className="text-sm muted">{a.specialty}</td>
                    <td className="text-sm mono" style={{ whiteSpace: "nowrap" }}>{fmtDob(a.dob)}</td>
                    <td onClick={(e) => e.stopPropagation()}><StatusBadge status={a.status} /></td>
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
      )}

      {/* Peek: quick-look of the athlete before opening the full profile. */}
      <AthletePeek
        athlete={athletes.find((a) => a.id === peekId) || null}
        entries={entries.filter((e) => e.athleteId === peekId)}
        competitions={competitions}
        onClose={() => setPeekId(null)}
        onOpen={() => { if (peekId) navigate("athlete-detail", peekId); }}
        t={t}
      />

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

function bestPb(a: Athlete): string | null {
  if (a.pb && a.pb[a.specialty]) return a.pb[a.specialty];
  const vals = a.pb ? Object.values(a.pb) : [];
  return vals.length ? vals[0] : null;
}

function AthleteCard({ athlete, entries, onPeek }: { athlete: Athlete; entries: RaceEntry[]; onPeek: () => void }) {
  const races = entries.filter((e) => e.athleteId === athlete.id).length;
  const pb = bestPb(athlete);
  return (
    <button onClick={onPeek} className="card athlete-card" style={{ padding: 0, textAlign: "left", cursor: "pointer", overflow: "hidden" }}>
      <div style={{ height: 72, background: `linear-gradient(135deg, ${athlete.color}aa 0%, ${athlete.color}55 100%)`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(0deg, transparent 0 28px, rgba(255,255,255,0.08) 28px 29px)", backgroundSize: "100% 28px" }} />
        <span style={{ position: "absolute", top: 10, right: 10 }}><StatusBadge status={athlete.status} /></span>
      </div>
      <div style={{ padding: "0 16px 16px", marginTop: -26 }}>
        <Avatar name={athlete.first + " " + athlete.last} color={athlete.color} size="lg" style={{ border: "3px solid var(--bg-1)" }} />
        <div style={{ marginTop: 8 }}>
          <div className="display fw-700 text-lg" style={{ letterSpacing: "-0.02em", color: nameColor(athlete.gender) }}>{athlete.first} {athlete.last}{contractSuffix(athlete.contract)}</div>
          <div className="text-sm muted">{athlete.nationality} · {athlete.specialty}</div>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-1)" }}>
          <MiniStat label="PB" value={pb || "—"} mono />
          <MiniStat label="Races" value={String(races)} />
          <MiniStat label="Medals" value={`${athlete.medals.gold + athlete.medals.silver + athlete.medals.bronze}`} />
        </div>
      </div>
    </button>
  );
}

function MiniStat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className={`fw-700${mono ? " mono" : ""}`} style={{ fontSize: 14, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      <div className="text-xs muted" style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}

// Quick-look peek (slide-over): the athlete's headline stats + full competition
// history — Data · Competizione · Naz · Distanza · Posizione · Tempo, coloured by
// placement — with a clear CTA to open the full profile.
function AthletePeek({
  athlete,
  entries,
  competitions,
  onClose,
  onOpen,
  t,
}: {
  athlete: Athlete | null;
  entries: RaceEntry[];
  competitions: Competition[];
  onClose: () => void;
  onOpen: () => void;
  t: (k: string) => string;
}) {
  const comp = (id: string) => competitions.find((c) => c.id === id);
  // Most recent competition first, like the old DB.
  const ordered = [...entries].sort((a, b) => (comp(b.competitionId)?.date || "").localeCompare(comp(a.competitionId)?.date || ""));
  const pb = athlete ? bestPb(athlete) : null;
  const podium = athlete ? ordered.filter((e) => (e.position ?? 99) <= 3).length : 0;

  return (
    <Drawer
      open={!!athlete}
      onClose={onClose}
      size="xl"
      title={athlete ? <span style={{ color: nameColor(athlete.gender) }}>{athlete.first} {athlete.last}{contractSuffix(athlete.contract)}</span> : ""}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t("common.close")}</button>
          <button className="btn btn-primary" onClick={() => { onOpen(); onClose(); }}><Icon name="external" size={13} /> {t("athlete.openProfile")}</button>
        </>
      }
    >
      {athlete && (
        <div className="col" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 14, alignItems: "center" }}>
            <Avatar name={athlete.first + " " + athlete.last} color={athlete.color} size="lg" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="text-sm muted">{athlete.nationality} · {athlete.specialty}</div>
              <div style={{ marginTop: 4 }}><StatusBadge status={athlete.status} /></div>
            </div>
          </div>

          <div className="row" style={{ gap: 8 }}>
            <PeekStat label="PB" value={pb || "—"} mono />
            <PeekStat label="Races" value={String(ordered.length)} />
            <PeekStat label="Podiums" value={String(podium)} />
            <PeekStat label="Medals" value={`${athlete.medals.gold + athlete.medals.silver + athlete.medals.bronze}`} />
          </div>

          <div>
            <div className="text-xs muted mono fw-700" style={{ textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{t("athlete.competition")}</div>
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="table-wrap" style={{ maxHeight: "calc(100vh - 360px)", overflowY: "auto" }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 90 }}>{t("athlete.date")}</th>
                      <th>{t("athlete.competition")}</th>
                      <th style={{ width: 100 }}>{t("athlete.distance")}</th>
                      <th style={{ width: 56 }}>{t("athlete.place")}</th>
                      <th style={{ width: 84 }}>{t("athlete.time")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordered.length === 0 ? (
                      <tr><td colSpan={5} className="text-sm muted" style={{ padding: 16 }}>{t("athlete.noRaces")}</td></tr>
                    ) : (
                      ordered.map((e) => {
                        const c = comp(e.competitionId);
                        const color = e.position != null ? placementColor(e.position) : undefined;
                        return (
                          <tr key={e.id} style={{ color }}>
                            <td className="mono text-sm" style={{ whiteSpace: "nowrap", color }}>{fmtDob(c?.date)}</td>
                            <td className="fw-600" style={{ color }}>{c?.name || e.competitionId}</td>
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
          </div>
        </div>
      )}
    </Drawer>
  );
}

function PeekStat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="card card-pad" style={{ flex: 1, minWidth: 0, padding: "10px 12px", textAlign: "center" }}>
      <div className={`display fw-700${mono ? " mono" : ""}`} style={{ fontSize: 16, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      <div className="text-xs muted" style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}
