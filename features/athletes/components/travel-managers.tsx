"use client";

// Manage passports / Manage visas — the passport & visa management dialogs from
// the old Dema DB (photos 31/30 for passports, 29 for visas). Each shows the
// athlete's list on top, an editable field area below, and the four keys:
// New / Delete / Save / Close (visas add Archive).

import React, { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Badge, Modal } from "@/components/primitives";
import { useLane } from "@/components/lane-provider";
import type { Passport, Visa, VisaKind } from "@/lib/types";

function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00");
  return isNaN(d.getTime()) ? null : Math.round((d.getTime() - Date.now()) / 86400000);
}

function ExpiryBadge({ date }: { date: string }) {
  const d = daysUntil(date);
  if (d == null) return <span className="text-sm muted">—</span>;
  if (d < 0) return <Badge variant="danger" dot>Expired</Badge>;
  if (d < 60) return <Badge variant="warning" dot>{d}d</Badge>;
  return <Badge variant="success" dot>Valid</Badge>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

/** Scan / photo picker — stores the chosen image as a data: URL on the record. */
function PhotoField({ photo, onChange }: { photo?: string; onChange: (dataUrl: string | undefined) => void }) {
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
      <label className="field-label">{t("doc.scan")}</label>
      <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
        <div
          onClick={() => inputRef.current?.click()}
          style={{ width: 108, height: 76, borderRadius: 8, border: "1px dashed var(--border-1)", background: "var(--bg-2)", overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="document scan" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Icon name="image" size={20} style={{ color: "var(--fg-3)" }} />
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

// A scrollable record list styled like the old "Lista … per l'atleta" grid.
function RecordList({
  head,
  rows,
  selectedId,
  onSelect,
  render,
}: {
  head: React.ReactNode;
  rows: { id: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  render: (r: any) => React.ReactNode;
}) {
  const { t } = useLane();
  return (
    <div style={{ border: "1px solid var(--border-1)", borderRadius: 8, overflow: "hidden" }}>
      <table className="table" style={{ margin: 0 }}>
        <thead>{head}</thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={6} className="text-sm muted" style={{ padding: 14 }}>{t("travel.noRecords")}</td></tr>
          ) : (
            rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => onSelect(r.id)}
                style={{ cursor: "pointer", background: r.id === selectedId ? "var(--accent-soft)" : "transparent" }}
              >
                {render(r)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// =========================================================================
// Manage passports
// =========================================================================

const BLANK_PASSPORT: Partial<Passport> = { number: "", nation: "", issued: "", expiry: "", note: "" };

export function PassportManager({ athleteId, onClose }: { athleteId: string; onClose: () => void }) {
  const { passports, createPassport, updatePassport, deletePassport, t } = useLane();
  const rows = useMemo(() => passports.filter((p) => p.athleteId === athleteId), [passports, athleteId]);

  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.id ?? null);
  const [form, setForm] = useState<Partial<Passport>>(rows[0] ?? { ...BLANK_PASSPORT });
  const isNew = selectedId === null;
  const set = (k: keyof Passport, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const select = (id: string) => {
    const p = rows.find((r) => r.id === id);
    if (p) { setSelectedId(id); setForm(p); }
  };
  const creaNuovo = () => { setSelectedId(null); setForm({ ...BLANK_PASSPORT }); };
  const cancella = () => {
    if (isNew) { creaNuovo(); return; }
    deletePassport(selectedId!);
    const rest = rows.filter((r) => r.id !== selectedId);
    if (rest[0]) select(rest[0].id); else creaNuovo();
  };
  const modifica = () => {
    if (isNew) createPassport({ ...form, athleteId });
    else updatePassport(selectedId!, form);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t("travel.managePassports")}
      footer={
        <>
          <button className="btn btn-secondary" onClick={creaNuovo} style={{ marginRight: "auto" }}><Icon name="plus" size={13} /> {t("common.new")}</button>
          <button className="btn btn-ghost" onClick={cancella} style={{ color: "var(--danger)" }} disabled={isNew}><Icon name="trash" size={13} /> {t("common.delete")}</button>
          <button className="btn btn-primary" onClick={modifica}>{t("common.save")}</button>
          <button className="btn btn-secondary" onClick={onClose}>{t("common.close")}</button>
        </>
      }
    >
      <div className="col" style={{ gap: 14 }}>
        <div className="field-label">{t("travel.passportsOnFile")}</div>
        <RecordList
          head={<tr><th>{t("doc.number")}</th><th>{t("doc.nation")}</th><th>{t("doc.expiry")}</th><th>{t("common.status")}</th></tr>}
          rows={rows}
          selectedId={selectedId}
          onSelect={select}
          render={(p: Passport) => (
            <>
              <td className="fw-600 mono">{p.number || "—"}</td>
              <td>{p.nation || "—"}</td>
              <td className="text-sm mono">{p.expiry || "—"}</td>
              <td><ExpiryBadge date={p.expiry} /></td>
            </>
          )}
        />
        <div className="divider" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
          <Field label={t("doc.number")}><input className="input" value={form.number || ""} onChange={(e) => set("number", e.target.value)} /></Field>
          <Field label={t("doc.nation")}><input className="input" value={form.nation || ""} onChange={(e) => set("nation", e.target.value)} /></Field>
          <Field label={t("doc.issued")}><input type="date" className="input" value={form.issued || ""} onChange={(e) => set("issued", e.target.value)} /></Field>
          <Field label={t("doc.expiry")}><input type="date" className="input" value={form.expiry || ""} onChange={(e) => set("expiry", e.target.value)} /></Field>
        </div>
        <PhotoField photo={form.photo} onChange={(v) => setForm((f) => ({ ...f, photo: v }))} />
        <Field label={t("common.note")}><input className="input" value={form.note || ""} onChange={(e) => set("note", e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// =========================================================================
// Manage visas
// =========================================================================

const VISA_KINDS: VisaKind[] = ["Schengen", "UK", "US", "Other"];
const BLANK_VISA: Partial<Visa> = { kind: "Schengen", number: "", type: "", validFrom: "", validTo: "", notKnown: false, embassy: "", sentToFederation: false, sentToAgent: false, appointment: "", note: "" };

export function VisaManager({ athleteId, onClose }: { athleteId: string; onClose: () => void }) {
  const { visas, createVisa, updateVisa, deleteVisa, t } = useLane();
  const rows = useMemo(() => visas.filter((v) => v.athleteId === athleteId && !v.archived), [visas, athleteId]);

  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.id ?? null);
  const [form, setForm] = useState<Partial<Visa>>(rows[0] ?? { ...BLANK_VISA });
  const isNew = selectedId === null;
  const set = (k: keyof Visa, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const select = (id: string) => {
    const v = rows.find((r) => r.id === id);
    if (v) { setSelectedId(id); setForm(v); }
  };
  const creaNuovo = () => { setSelectedId(null); setForm({ ...BLANK_VISA }); };
  const cancella = () => {
    if (isNew) { creaNuovo(); return; }
    deleteVisa(selectedId!);
    const rest = rows.filter((r) => r.id !== selectedId);
    if (rest[0]) select(rest[0].id); else creaNuovo();
  };
  const modifica = () => {
    if (isNew) createVisa({ ...form, athleteId });
    else updateVisa(selectedId!, form);
    onClose();
  };
  const archivia = () => {
    if (isNew) return;
    updateVisa(selectedId!, { archived: true });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t("travel.manageVisas")}
      footer={
        <>
          <button className="btn btn-secondary" onClick={creaNuovo} style={{ marginRight: "auto" }}><Icon name="plus" size={13} /> {t("common.new")}</button>
          <button className="btn btn-ghost" onClick={cancella} style={{ color: "var(--danger)" }} disabled={isNew}><Icon name="trash" size={13} /> {t("common.delete")}</button>
          <button className="btn btn-ghost" onClick={archivia} disabled={isNew}><Icon name="folder" size={13} /> {t("common.archive")}</button>
          <button className="btn btn-primary" onClick={modifica}>{t("common.save")}</button>
          <button className="btn btn-secondary" onClick={onClose}>{t("common.close")}</button>
        </>
      }
    >
      <div className="col" style={{ gap: 14 }}>
        <div className="field-label">{t("travel.visasOnFile")}</div>
        <RecordList
          head={<tr><th>{t("doc.type")}</th><th>{t("doc.validFrom")}</th><th>{t("doc.validTo")}</th><th>{t("doc.embassy")}</th><th>{t("common.status")}</th></tr>}
          rows={rows}
          selectedId={selectedId}
          onSelect={select}
          render={(v: Visa) => (
            <>
              <td className="fw-600">{v.type || v.kind} <Badge>{v.kind}</Badge></td>
              <td className="text-sm mono muted">{v.validFrom || "—"}</td>
              <td className="text-sm mono">{v.validTo || "—"}</td>
              <td className="text-sm">{v.embassy || "—"}</td>
              <td><ExpiryBadge date={v.validTo} /></td>
            </>
          )}
        />
        <div className="divider" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label={t("doc.kind")}>
            <select className="input" value={form.kind || "Schengen"} onChange={(e) => set("kind", e.target.value as VisaKind)}>
              {VISA_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
          <Field label={t("doc.type")}><input className="input" placeholder="Schengen M90 / US B1/B2…" value={form.type || ""} onChange={(e) => set("type", e.target.value)} /></Field>
          <Field label={t("doc.number")}><input className="input" value={form.number || ""} onChange={(e) => set("number", e.target.value)} /></Field>
          <Field label={t("doc.validFrom")}><input type="date" className="input" value={form.validFrom || ""} onChange={(e) => set("validFrom", e.target.value)} disabled={!!form.notKnown} /></Field>
          <Field label={t("doc.validTo")}><input type="date" className="input" value={form.validTo || ""} onChange={(e) => set("validTo", e.target.value)} disabled={!!form.notKnown} /></Field>
          <Field label={t("doc.embassy")}><input className="input" placeholder="Italian…" value={form.embassy || ""} onChange={(e) => set("embassy", e.target.value)} /></Field>
          <Field label={t("doc.appointment")}><input type="date" className="input" value={form.appointment || ""} onChange={(e) => set("appointment", e.target.value)} /></Field>
        </div>
        <div className="row" style={{ gap: 18, flexWrap: "wrap" }}>
          <label className="row" style={{ gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={!!form.notKnown} onChange={(e) => set("notKnown", e.target.checked)} /> {t("doc.datesUnknown")}
          </label>
          <label className="row" style={{ gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={!!form.sentToFederation} onChange={(e) => set("sentToFederation", e.target.checked)} /> {t("doc.sentToFederation")}
          </label>
          <label className="row" style={{ gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={!!form.sentToAgent} onChange={(e) => set("sentToAgent", e.target.checked)} /> {t("doc.sentToAgent")}
          </label>
        </div>
        <PhotoField photo={form.photo} onChange={(v) => setForm((f) => ({ ...f, photo: v }))} />
        <Field label={t("common.note")}><input className="input" value={form.note || ""} onChange={(e) => set("note", e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
