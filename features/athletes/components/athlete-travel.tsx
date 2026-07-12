"use client";

// Passports & visas tab for the athlete card. Displays the lists read-only and
// defers all add/edit/delete to the shared "Manage passports / visas" dialogs
// (photos 31/30/29) so the experience matches the athlete form.

import React, { useState } from "react";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/primitives";
import { useLane } from "@/components/lane-provider";
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
  const { t } = useLane();
  const d = daysUntil(date);
  if (d == null) return <span className="text-sm muted">—</span>;
  if (d < 0) return <Badge variant="danger" dot>{t("trav.expired")}</Badge>;
  if (d < 60) return <Badge variant="warning" dot>{t("trav.daysLeft", { n: d })}</Badge>;
  return <Badge variant="success" dot>{t("trav.valid")}</Badge>;
}

export function TravelTab({ athleteId, passports, visas }: { athleteId: string; passports: Passport[]; visas: Visa[] }) {
  const { t } = useLane();
  const [managePassports, setManagePassports] = useState(false);
  const [manageVisas, setManageVisas] = useState(false);

  return (
    <div className="col" style={{ gap: 12 }}>
      {/* ---- Passports ---- */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">{t("trav.passports")}</div>
          <button className="btn btn-secondary btn-sm" onClick={() => setManagePassports(true)}>
            <Icon name="edit" size={13} /> {t("trav.managePassports")}
          </button>
        </div>
        {passports.length === 0 ? (
          <div style={{ padding: 18 }} className="text-sm muted">{t("trav.noPassport")}</div>
        ) : (
          <table className="table">
            <thead><tr><th>{t("trav.number")}</th><th>{t("trav.nation")}</th><th>{t("trav.issued")}</th><th>{t("trav.expiry")}</th><th>{t("trav.status")}</th></tr></thead>
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
          <div className="card-title">{t("trav.visas")}</div>
          <button className="btn btn-secondary btn-sm" onClick={() => setManageVisas(true)}>
            <Icon name="edit" size={13} /> {t("trav.manageVisas")}
          </button>
        </div>
        {visas.length === 0 ? (
          <div style={{ padding: 18 }} className="text-sm muted">{t("trav.noVisa")}</div>
        ) : (
          <table className="table">
            <thead><tr><th>{t("trav.type")}</th><th>{t("trav.validFrom")}</th><th>{t("trav.validTo")}</th><th>{t("trav.embassy")}</th><th>{t("trav.status")}</th></tr></thead>
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
