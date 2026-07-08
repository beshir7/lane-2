"use client";

// "Lista organizzatori" picker (photo_18) — browse the organizer directory and
// choose the one running a race. Opened from the race form.

import React, { useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, EmptyState, Modal } from "@/components/primitives";
import { useLane } from "@/components/lane-provider";

export function OrganizerPicker({ onClose, onChoose }: { onClose: () => void; onChoose: (id: string) => void }) {
  const { organizers, t } = useLane();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = organizers.filter((o) => !search || `${o.name} ${o.nation} ${o.email} ${o.phone}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t("org.list")}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t("common.close")}</button>
          <button className="btn btn-primary" disabled={!selected} onClick={() => selected && onChoose(selected)}>{t("common.choose")}</button>
        </>
      }
    >
      <div className="col" style={{ gap: 12 }}>
        <div className="input-group">
          <Icon name="search" size={14} />
          <input className="input" placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="users" title="—" description="—" />
        ) : (
          <div style={{ border: "1px solid var(--border-1)", borderRadius: 8, overflow: "hidden", maxHeight: 380, overflowY: "auto" }}>
            <table className="table" style={{ margin: 0 }}>
              <thead><tr><th>{t("org.name")}</th><th>{t("org.email")}</th><th>{t("org.phone")}</th><th>{t("org.nation")}</th></tr></thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelected(o.id)}
                    onDoubleClick={() => onChoose(o.id)}
                    style={{ cursor: "pointer", background: o.id === selected ? "var(--accent-soft)" : "transparent" }}
                  >
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <Avatar name={o.name} color="#5b6ef5" size="xs" />
                        <span className="fw-600">{o.name}</span>
                      </div>
                    </td>
                    <td className="text-sm">{o.email || "—"}</td>
                    <td className="text-sm mono">{o.phone || "—"}</td>
                    <td className="text-sm">{o.nation || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
