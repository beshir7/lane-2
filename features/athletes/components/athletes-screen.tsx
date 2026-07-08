"use client";

// Athlete list screen.

import React, { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Badge, EmptyState, Segmented } from "@/components/primitives";
import { FilterDropdown, StatusBadge } from "@/components/shared";
import { AthleteFormModal } from "./athlete-form-modal";
import { useLane } from "@/components/lane-provider";
import { EVENT_CATEGORIES } from "@/lib/reference";
import { downloadJson, downloadCsv, pickFiles } from "@/utils";
import { useToast } from "@/components/primitives";
import type { Athlete } from "@/lib/types";

type SortState = { key: string; dir: "asc" | "desc" };

// Old-system convention: women pink, men blue; (E)/(M) = contract tag.
const GENDER_COLOR: Record<string, string> = { F: "#f55b6e", M: "#5b6ef5", X: "var(--fg-1)" };
const nameColor = (g: string) => GENDER_COLOR[g] || "var(--fg-1)";
const contractSuffix = (c?: "E" | "M" | null) => (c ? ` (${c})` : "");

export function AthletesScreen() {
  const { athletes, navigate, createAthlete, deleteAthlete, t } = useLane();
  const push = useToast();
  const [view, setView] = useState<"table" | "cards">("table");
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
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                  </th>
                  <SortHeader label="Athlete" k="name" cur={sortBy} onClick={() => flipSort("name")} />
                  <SortHeader label="Discipline" k="specialty" cur={sortBy} onClick={() => flipSort("specialty")} />
                  <SortHeader label="Country" k="nationality" cur={sortBy} onClick={() => flipSort("nationality")} />
                  <SortHeader label="Age" k="age" cur={sortBy} onClick={() => flipSort("age")} />
                  <th>Squad</th>
                  <th>Status</th>
                  <SortHeader label="Form" k="form" cur={sortBy} onClick={() => flipSort("form")} />
                  <th>Medals</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className={selected.has(a.id) ? "is-selected" : ""} onClick={() => navigate("athlete-detail", a.id)}>
                    <td onClick={(e) => { e.stopPropagation(); toggleSel(a.id); }}>
                      <input type="checkbox" checked={selected.has(a.id)} onChange={() => {}} />
                    </td>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <Avatar name={a.first + " " + a.last} color={a.color} size="sm" />
                        <div>
                          <div className="fw-600" style={{ color: nameColor(a.gender) }}>
                            {a.first} {a.last}{contractSuffix(a.contract)}
                          </div>
                          <div className="text-xs muted">{a.sponsor || a.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{a.specialty}</td>
                    <td className="text-sm">{a.nationality}</td>
                    <td className="table-num">{a.age}</td>
                    <td><Badge>{a.squad}</Badge></td>
                    <td><StatusBadge status={a.status} /></td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 70 }} className="progress"><div style={{ width: a.progress + "%", background: a.color }} /></div>
                        <span className="table-num" style={{ color: "var(--fg-3)" }}>{a.progress}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6, fontFamily: "var(--font-mono)", fontSize: 12 }}>
                        <span style={{ color: "#f5b14c" }}>{a.medals.gold}</span>
                        <span style={{ color: "#c9d3df" }}>{a.medals.silver}</span>
                        <span style={{ color: "#c08c5e" }}>{a.medals.bronze}</span>
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn"><Icon name="moreV" size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-1)" }}>
            <div className="text-sm muted">Showing 1–{filtered.length} of {filtered.length}</div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn btn-secondary btn-sm" disabled><Icon name="chevronLeft" size={13} /> Previous</button>
              <button className="btn btn-secondary btn-sm" disabled>Next <Icon name="chevronRight" size={13} /></button>
            </div>
          </div>
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
