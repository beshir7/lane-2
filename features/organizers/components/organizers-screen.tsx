"use client";

// Race organizers — the organizers list (caption 23). Manage the directory of
// organizers you can attach to races.

import React, { useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, EmptyState, Modal } from "@/components/primitives";
import { useLane } from "@/components/lane-provider";
import { downloadCsv } from "@/utils";
import type { Organizer } from "@/lib/types";

export function OrganizersScreen() {
  const { organizers, createOrganizer, updateOrganizer, deleteOrganizer, t } = useLane();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Organizer | "new" | null>(null);

  const filtered = organizers.filter((o) => !search || `${o.name} ${o.nation} ${o.email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("org.title")}</h1>
          <p className="page-subtitle">{organizers.length}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => downloadCsv("organizers", filtered.map((o) => ({ name: o.name, nation: o.nation, email: o.email, phone: o.phone })))}><Icon name="download" size={14} /> {t("common.export")}</button>
          <button className="btn btn-primary" onClick={() => setModal("new")}><Icon name="plus" size={14} /> {t("org.new")}</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ padding: 12 }}>
          <div className="input-group" style={{ maxWidth: 320 }}>
            <Icon name="search" size={14} />
            <input className="input" placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="users" title={t("org.title")} description="—" />
        ) : (
          <table className="table">
            <thead><tr><th>{t("org.name")}</th><th>{t("org.nation")}</th><th>{t("org.phone")}</th><th>{t("org.email")}</th><th style={{ width: 90 }}></th></tr></thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <Avatar name={o.name} color="#5b6ef5" size="sm" />
                      <div className="fw-600">{o.name}</div>
                    </div>
                  </td>
                  <td className="text-sm">{o.nation}</td>
                  <td className="text-sm mono">{o.phone}</td>
                  <td className="text-sm">{o.email}</td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      <button className="icon-btn" onClick={() => setModal(o)}><Icon name="edit" size={13} /></button>
                      <button className="icon-btn" style={{ color: "var(--danger)" }} onClick={() => deleteOrganizer(o.id)}><Icon name="trash" size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <OrganizerModal
          organizer={modal === "new" ? undefined : modal}
          onClose={() => setModal(null)}
          onSave={(data) => {
            const id = modal === "new" ? "o" + Math.random().toString(36).slice(2, 8) : modal.id;
            if (modal === "new") createOrganizer({ ...data, id });
            else updateOrganizer(id, data);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function OrganizerModal({ organizer, onClose, onSave }: { organizer?: Organizer; onClose: () => void; onSave: (d: Partial<Organizer>) => void }) {
  const { t } = useLane();
  // Seeded organizers only carry a display `name` (no first/last parts), so
  // derive the fields from it — first token = surname — so the form is filled
  // and re-saving reproduces the same name.
  const [form, setForm] = useState<Partial<Organizer>>(() => {
    if (!organizer) return { firstName: "", lastName: "", name: "", nation: "", phone: "", email: "" };
    const parts = (organizer.name || "").trim().split(/\s+/);
    return {
      ...organizer,
      lastName: organizer.lastName || parts[0] || "",
      firstName: organizer.firstName || parts.slice(1).join(" ") || "",
    };
  });
  const set = (k: keyof Organizer, v: string) => setForm({ ...form, [k]: v });
  const save = () => {
    // Keep the display name as "Lastname Firstname" when the parts are given.
    const name = [form.lastName, form.firstName].filter(Boolean).join(" ").trim() || form.name || "";
    onSave({ ...form, name });
  };

  return (
    <Modal open onClose={onClose} title={organizer ? t("common.edit") : t("org.new")} footer={<><button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button><button className="btn btn-primary" onClick={save}>{t("common.save")}</button></>}>
      <div className="col" style={{ gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field"><label className="field-label">{t("org.surname")}</label><input className="input" value={form.lastName || ""} onChange={(e) => set("lastName", e.target.value)} /></div>
          <div className="field"><label className="field-label">{t("org.name")}</label><input className="input" value={form.firstName || ""} onChange={(e) => set("firstName", e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field"><label className="field-label">{t("org.phone")}</label><input className="input" value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
          <div className="field"><label className="field-label">{t("org.nation")}</label><input className="input" value={form.nation || ""} onChange={(e) => set("nation", e.target.value)} /></div>
        </div>
        <div className="field"><label className="field-label">{t("org.email")}</label><input className="input" type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} /></div>
      </div>
    </Modal>
  );
}
