"use client";

// Passports & visas tab for the athlete card. Displays the lists read-only and
// defers all add/edit/delete to the shared "Manage passports / visas" dialogs
// (photos 31/30/29) so the experience matches the athlete form.

import React, { useState } from "react";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/primitives";
import type { Passport, Visa } from "@/lib/types";
import { PassportManager, VisaManager } from "./travel-managers";

/** Days until a date; negative = past. */
function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00");
  if (isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - Date.now()) / 86400000);
}

function ExpiryBadge({ date }: { date: string }) {
  const d = daysUntil(date);
  if (d == null) return <span className="text-sm muted">—</span>;
  if (d < 0) return <Badge variant="danger" dot>Expired</Badge>;
  if (d < 60) return <Badge variant="warning" dot>{d}d left</Badge>;
  return <Badge variant="success" dot>Valid</Badge>;
}

export function TravelTab({ athleteId, passports, visas }: { athleteId: string; passports: Passport[]; visas: Visa[] }) {
  const [managePassports, setManagePassports] = useState(false);
  const [manageVisas, setManageVisas] = useState(false);

  return (
    <div className="col" style={{ gap: 12 }}>
      {/* ---- Passports ---- */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Passports</div>
          <button className="btn btn-secondary btn-sm" onClick={() => setManagePassports(true)}>
            <Icon name="edit" size={13} /> Manage passports
          </button>
        </div>
        {passports.length === 0 ? (
          <div style={{ padding: 18 }} className="text-sm muted">No passport on file.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Number</th><th>Nation</th><th>Issued</th><th>Expiry</th><th>Status</th></tr></thead>
            <tbody>
              {passports.map((p) => (
                <tr key={p.id} onClick={() => setManagePassports(true)} style={{ cursor: "pointer" }}>
                  <td className="fw-600 mono">{p.number}</td>
                  <td>{p.nation}</td>
                  <td className="text-sm mono muted">{p.issued || "—"}</td>
                  <td className="text-sm mono">{p.expiry || "—"}</td>
                  <td><ExpiryBadge date={p.expiry} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ---- Visas ---- */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Visas</div>
          <button className="btn btn-secondary btn-sm" onClick={() => setManageVisas(true)}>
            <Icon name="edit" size={13} /> Manage visas
          </button>
        </div>
        {visas.length === 0 ? (
          <div style={{ padding: 18 }} className="text-sm muted">No visa on file.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Type</th><th>Valid from</th><th>Valid to</th><th>Embassy</th><th>Status</th></tr></thead>
            <tbody>
              {visas.map((v) => (
                <tr key={v.id} onClick={() => setManageVisas(true)} style={{ cursor: "pointer" }}>
                  <td className="fw-600">{v.type} <Badge>{v.kind}</Badge></td>
                  <td className="text-sm mono muted">{v.validFrom || "—"}</td>
                  <td className="text-sm mono">{v.validTo || "—"}</td>
                  <td className="text-sm">{v.embassy || "—"}</td>
                  <td><ExpiryBadge date={v.validTo} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {managePassports && <PassportManager athleteId={athleteId} onClose={() => setManagePassports(false)} />}
      {manageVisas && <VisaManager athleteId={athleteId} onClose={() => setManageVisas(false)} />}
    </div>
  );
}
