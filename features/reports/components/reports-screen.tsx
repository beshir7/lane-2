"use client";

// Reports & exports — the old system's "Stampa" menu: the visa list (Schengen /
// UK / US with expiry) plus printable/exportable athlete & season lists.

import React, { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Badge, EmptyState } from "@/components/primitives";
import { FilterDropdown } from "@/components/shared";
import { useLane } from "@/components/lane-provider";
import { downloadCsv } from "@/utils";
import type { VisaKind } from "@/lib/types";

function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00");
  return isNaN(d.getTime()) ? null : Math.round((d.getTime() - Date.now()) / 86400000);
}

export function ReportsScreen() {
  const { athletes, visas, competitions, entries, resetAll } = useLane();
  const [kind, setKind] = useState<"all" | VisaKind>("all");

  const name = (id: string) => { const a = athletes.find((x) => x.id === id); return a ? `${a.last} ${a.first}` : id; };

  // ---- Visa list (captions 12/13) ----
  const visaRows = useMemo(() => {
    return visas
      .filter((v) => kind === "all" || v.kind === kind)
      .map((v) => {
        const a = athletes.find((x) => x.id === v.athleteId);
        return { ...v, athleteName: a ? `${a.last} ${a.first}` : "—", nationality: a?.nationality || "" };
      })
      .sort((a, b) => (a.validTo || "").localeCompare(b.validTo || ""));
  }, [visas, athletes, kind]);

  const exportVisas = () => downloadCsv("visa-list", visaRows.map((v) => ({
    athlete: v.athleteName, nationality: v.nationality, kind: v.kind, type: v.type, validFrom: v.validFrom, validTo: v.validTo, embassy: v.embassy,
  })));

  // ---- Athlete list exports (captions 36/37/38) ----
  const exportByNation = () => downloadCsv("athletes-by-nation", [...athletes].sort((a, b) => a.nationality.localeCompare(b.nationality)).map((a) => ({ nation: a.nationality, name: `${a.last} ${a.first}`, discipline: a.specialty, gender: a.gender })));
  const exportByDiscipline = () => downloadCsv("athletes-by-discipline", [...athletes].sort((a, b) => a.specialty.localeCompare(b.specialty)).map((a) => ({ discipline: a.specialty, name: `${a.last} ${a.first}`, nation: a.nationality })));
  const exportBySponsor = () => downloadCsv("athletes-by-sponsor", [...athletes].sort((a, b) => (a.sponsor || "").localeCompare(b.sponsor || "")).map((a) => ({ sponsor: a.sponsor || "—", name: `${a.last} ${a.first}`, nation: a.nationality })));
  const exportPBs = () => downloadCsv("athlete-personal-bests", athletes.map((a) => ({ name: `${a.last} ${a.first}`, nation: a.nationality, bests: Object.entries(a.pb).map(([k, v]) => `${k} ${v}`).join("; ") })));
  const exportMarathoners = () => downloadCsv("marathon-runners", athletes
    .filter((a) => /marathon/i.test(a.specialty) || a.category === "long" || "Marathon" in a.pb)
    .map((a) => ({ name: `${a.last} ${a.first}`, nation: a.nationality, gender: a.gender, best: a.pb["Marathon"] || Object.values(a.pb)[0] || "" })));

  // ---- Season grid: athlete × meeting (caption 34) ----
  const exportSeasonGrid = () => downloadCsv("season-grid", entries.map((e) => {
    const c = competitions.find((x) => x.id === e.competitionId);
    return { athlete: name(e.athleteId), meeting: c ? `${c.date} ${c.short || c.name}` : e.competitionId, discipline: e.discipline, status: e.status, place: e.position ?? "", time: e.time };
  }));

  const EXPORTS = [
    { label: "Athletes by nation", desc: "By nation", icon: "globe", fn: exportByNation },
    { label: "Athletes by discipline", desc: "By discipline", icon: "trophy", fn: exportByDiscipline },
    { label: "Athletes by sponsor", desc: "By sponsor", icon: "star", fn: exportBySponsor },
    { label: "Personal bests", desc: "All athletes · best PB", icon: "medal", fn: exportPBs },
    { label: "Marathon runners", desc: "Men marathon runners", icon: "trophy", fn: exportMarathoners },
    { label: "Season grid", desc: "Athlete × meeting", icon: "calendar", fn: exportSeasonGrid },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & exports</h1>
          <p className="page-subtitle">Visa lists and printable athlete & season reports</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" style={{ color: "var(--danger)" }} onClick={() => { if (window.confirm("Clear ALL locally stored data? This cannot be undone.")) resetAll(); }}>
            <Icon name="trash" size={14} /> Clear all data
          </button>
        </div>
      </div>

      {/* ---- Print / export menu ---- */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><div className="card-title">Print · generate a list</div></div>
        <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {EXPORTS.map((x) => (
            <button key={x.label} className="card card-pad" style={{ textAlign: "left", cursor: "pointer" }} onClick={x.fn}>
              <div className="row" style={{ gap: 10 }}>
                <Icon name={x.icon} size={18} style={{ color: "var(--accent)" }} />
                <div style={{ flex: 1 }}>
                  <div className="fw-600">{x.label}</div>
                  <div className="text-xs muted">{x.desc}</div>
                </div>
                <Icon name="download" size={14} style={{ color: "var(--fg-3)" }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ---- Visa list ---- */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Visa list</div>
          <div className="row" style={{ gap: 8 }}>
            <FilterDropdown label="Kind" value={kind} options={[{ v: "all", l: "All" }, { v: "Schengen", l: "Schengen" }, { v: "UK", l: "UK" }, { v: "US", l: "US" }]} onChange={(v) => setKind(v as "all" | VisaKind)} />
            <button className="btn btn-secondary btn-sm" onClick={exportVisas}><Icon name="download" size={13} /> Export</button>
            <button className="btn btn-secondary btn-sm" onClick={() => window.print()}><Icon name="fileText" size={13} /> Print</button>
          </div>
        </div>
        {visaRows.length === 0 ? (
          <EmptyState icon="fileText" title="No visas" description="No visas match this filter." />
        ) : (
          <table className="table">
            <thead><tr><th>Athlete</th><th>Nationality</th><th>Type</th><th>Valid from</th><th>Valid to</th><th>Embassy</th><th>Status</th></tr></thead>
            <tbody>
              {visaRows.map((v) => {
                const d = daysUntil(v.validTo);
                return (
                  <tr key={v.id}>
                    <td className="fw-600">{v.athleteName}</td>
                    <td className="text-sm">{v.nationality}</td>
                    <td>{v.type} <Badge>{v.kind}</Badge></td>
                    <td className="text-sm mono muted">{v.validFrom || "—"}</td>
                    <td className="text-sm mono">{v.validTo || "—"}</td>
                    <td className="text-sm">{v.embassy || "—"}</td>
                    <td>{d == null ? "—" : d < 0 ? <Badge variant="danger" dot>Expired</Badge> : d < 60 ? <Badge variant="warning" dot>{d}d</Badge> : <Badge variant="success" dot>Valid</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
