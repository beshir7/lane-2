"use client";

// Manage passport / Manage visa — simplified single-document editors.
// Per the latest brief: the scanned picture goes UP TOP, the record list is
// dropped (the full history lives on the Documents page), and only the essential
// fields remain. Buttons follow the old-DB convention: Create new (or Modify when
// editing an existing document) · Cancel (revert edits) · Exit (close).

import React, { useState } from "react";
import { Icon } from "@/components/icon";
import { Modal } from "@/components/primitives";
import { useLane } from "@/components/lane-provider";
import type { Passport, Visa } from "@/lib/types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

/** Scan / photo picker — stores the chosen image as a data: URL on the record. */
function PhotoField({ label, photo, onChange }: { label: string; photo?: string; onChange: (dataUrl: string | undefined) => void }) {
  const { t } = useLane();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const pick = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : undefined);
    reader.readAsDataURL(file);
  };
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
        <div
          onClick={() => inputRef.current?.click()}
          style={{ width: 160, height: 108, borderRadius: 8, border: "1px dashed var(--border-1)", background: "var(--bg-2)", overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="document scan" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span className="col" style={{ alignItems: "center", gap: 6, color: "var(--fg-3)" }}>
              <Icon name="image" size={22} />
              <span className="text-xs">{t("common.upload")}</span>
            </span>
          )}
        </div>
        <div className="col" style={{ gap: 6 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()}>
            <Icon name="upload" size={13} /> {photo ? t("common.replace") : t("common.upload")}
          </button>
          {photo && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => onChange(undefined)}>
              <Icon name="trash" size={13} /> {t("common.remove")}
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => pick(e.target.files?.[0])} />
      </div>
    </div>
  );
}

/** Footer keys shared by both managers: Create new / Modify · Cancel · Exit. */
function ManagerFooter({ isNew, onSubmit, onCancel, onExit }: { isNew: boolean; onSubmit: () => void; onCancel: () => void; onExit: () => void }) {
  const { t } = useLane();
  return (
    <>
      <button className="btn btn-secondary" onClick={onCancel} style={{ marginRight: "auto" }}>{t("common.cancel")}</button>
      <button className="btn btn-secondary" onClick={onExit}>{t("common.exit")}</button>
      <button className="btn btn-primary" onClick={onSubmit}>{isNew ? t("common.createNew") : t("common.modify")}</button>
    </>
  );
}

// =========================================================================
// Manage passport
// =========================================================================

const BLANK_PASSPORT: Partial<Passport> = { number: "", nation: "", issued: "", expiry: "" };

export function PassportManager({ athleteId, onClose }: { athleteId: string; onClose: () => void }) {
  const { passports, createPassport, updatePassport, t } = useLane();
  // Single-document model: edit the athlete's primary passport (or create one).
  const existing = passports.find((p) => p.athleteId === athleteId);
  const [form, setForm] = useState<Partial<Passport>>(existing ?? { ...BLANK_PASSPORT });
  const isNew = !existing;
  const set = (k: keyof Passport, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (isNew) createPassport({ ...form, athleteId });
    else updatePassport(existing!.id, form);
    onClose();
  };
  const cancel = () => setForm(existing ?? { ...BLANK_PASSPORT });

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t("travel.managePassports")}
      footer={<ManagerFooter isNew={isNew} onSubmit={submit} onCancel={cancel} onExit={onClose} />}
    >
      <div className="col" style={{ gap: 14 }}>
        <PhotoField label={t("doc.passportPhoto")} photo={form.photo} onChange={(v) => setForm((f) => ({ ...f, photo: v }))} />
        <div className="divider" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label={t("doc.number")}><input className="input" value={form.number || ""} onChange={(e) => set("number", e.target.value)} /></Field>
          <Field label={t("doc.nation")}><input className="input" value={form.nation || ""} onChange={(e) => set("nation", e.target.value)} /></Field>
          <Field label={t("doc.issued")}><input type="date" className="input" value={form.issued || ""} onChange={(e) => set("issued", e.target.value)} /></Field>
          <Field label={t("doc.expiry")}><input type="date" className="input" value={form.expiry || ""} onChange={(e) => set("expiry", e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

// =========================================================================
// Manage visa
// =========================================================================

const BLANK_VISA: Partial<Visa> = { kind: "Other", type: "", validFrom: "", validTo: "", embassy: "" };

export function VisaManager({ athleteId, onClose }: { athleteId: string; onClose: () => void }) {
  const { visas, createVisa, updateVisa, t } = useLane();
  const existing = visas.find((v) => v.athleteId === athleteId && !v.archived);
  const [form, setForm] = useState<Partial<Visa>>(existing ?? { ...BLANK_VISA });
  const isNew = !existing;
  const set = (k: keyof Visa, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (isNew) createVisa({ ...form, athleteId });
    else updateVisa(existing!.id, form);
    onClose();
  };
  const cancel = () => setForm(existing ?? { ...BLANK_VISA });

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t("travel.manageVisas")}
      footer={<ManagerFooter isNew={isNew} onSubmit={submit} onCancel={cancel} onExit={onClose} />}
    >
      <div className="col" style={{ gap: 14 }}>
        <PhotoField label={t("doc.visaPhoto")} photo={form.photo} onChange={(v) => setForm((f) => ({ ...f, photo: v }))} />
        <div className="divider" />
        {/* Optional details — kept only in case a copy of the visa can't live in the program. */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label={t("doc.type")}><input className="input" placeholder="Schengen M90 / US B1/B2…" value={form.type || ""} onChange={(e) => set("type", e.target.value)} /></Field>
          <Field label={t("doc.embassy")}><input className="input" placeholder="Italian…" value={form.embassy || ""} onChange={(e) => set("embassy", e.target.value)} /></Field>
          <Field label={t("doc.validFrom")}><input type="date" className="input" value={form.validFrom || ""} onChange={(e) => set("validFrom", e.target.value)} /></Field>
          <Field label={t("doc.validTo")}><input type="date" className="input" value={form.validTo || ""} onChange={(e) => set("validTo", e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}
