"use client";

// Season entries matrix (photo_7 May / photo_5 June): athletes down the side,
// races across the top, and the discipline each athlete runs in each race in the
// cell. Lets you see a whole month of a track season on one screen and follow an
// athlete from race to race (e.g. someone running 10 May and again 14 May travels
// straight on). Built live from race entries, so it fills in as athletes are
// entered. Column headers are short — "10 May Doha" — not the full meeting name.

import React, { useMemo } from "react";
import { Icon } from "@/components/icon";
import { useLane } from "@/components/lane-provider";
import type { Competition } from "@/lib/types";

// "2024-05-10" + "Doha" → "10 May Doha" (falls back to the raw date if unparsable).
export function shortRaceLabel(c: Competition): string {
  const d = new Date((c.date || "") + "T00:00");
  const dm = isNaN(d.getTime()) ? c.date : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const place = c.location || c.short || c.name;
  return `${dm} ${place}`.trim();
}

export function EntriesMatrixView() {
  const { entries, competitions, athletes, navigate } = useLane();

  const { cols, rows, cell } = useMemo(() => {
    const compIds = new Set(entries.map((e) => e.competitionId));
    const athIds = new Set(entries.map((e) => e.athleteId));
    const cols = competitions
      .filter((c) => compIds.has(c.id))
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
    const rows = athletes
      .filter((a) => athIds.has(a.id))
      .sort((a, b) => `${a.last} ${a.first}`.localeCompare(`${b.last} ${b.first}`));
    // athleteId → competitionId → "disc1, disc2"
    const cell = new Map<string, Map<string, string>>();
    for (const e of entries) {
      if (!cell.has(e.athleteId)) cell.set(e.athleteId, new Map());
      const row = cell.get(e.athleteId)!;
      row.set(e.competitionId, [row.get(e.competitionId), e.discipline].filter(Boolean).join(", "));
    }
    return { cols, rows, cell };
  }, [entries, competitions, athletes]);

  if (rows.length === 0) {
    return (
      <div className="col" style={{ alignItems: "center", justifyContent: "center", gap: 10, padding: 48, textAlign: "center", minHeight: 240 }}>
        <Icon name="grid" size={30} style={{ color: "var(--fg-3)" }} />
        <div className="display fw-700" style={{ fontSize: 16 }}>No entries yet</div>
        <div className="text-sm muted" style={{ maxWidth: 380 }}>
          Enter athletes into races (Races page → pick a race → add participants) and they appear here as an athletes × races plan.
        </div>
      </div>
    );
  }

  const stickyHead: React.CSSProperties = { position: "sticky", top: 0, zIndex: 2, background: "var(--bg-2)" };
  const stickyCol: React.CSSProperties = { position: "sticky", left: 0, zIndex: 1, background: "var(--bg-1)", whiteSpace: "nowrap" };

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div className="display fw-700" style={{ fontSize: 16 }}>Season plan — athletes × races</div>
        <div className="text-xs muted">{rows.length} athletes · {cols.length} races</div>
      </div>
      <div style={{ overflow: "auto", maxHeight: "calc(100vh - 300px)" }}>
        <table className="table" style={{ fontSize: 12, minWidth: 640 }}>
          <thead>
            <tr>
              <th style={{ ...stickyHead, ...stickyCol, zIndex: 3, minWidth: 180 }}>Athlete</th>
              {cols.map((c) => (
                <th key={c.id} style={{ ...stickyHead, textAlign: "center", whiteSpace: "nowrap", cursor: "pointer" }} title={c.name} onClick={() => navigate("competition-detail", c.id)}>
                  {shortRaceLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const row = cell.get(a.id);
              return (
                <tr key={a.id}>
                  <td style={{ ...stickyCol }}>
                    <button className="fw-600" style={{ background: "transparent", color: "var(--fg-1)", textAlign: "left" }} onClick={() => navigate("athlete-detail", a.id)}>
                      {a.last}, {a.first}{a.contract ? ` (${a.contract})` : ""}
                    </button>
                  </td>
                  {cols.map((c) => {
                    const v = row?.get(c.id);
                    return (
                      <td key={c.id} style={{ textAlign: "center", color: v ? "var(--fg-1)" : "var(--border-2)" }}>
                        {v || "·"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
