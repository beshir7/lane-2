"use client";

// Athlete card — the "edit athlete" card (photo_35). Laid out to mirror the old
// Dema DB card: identity row, personal data, agency data, a personal-best TABLE
// (disciplines are picked via "Select disciplines", not toggled inline), plus
// passport & visa management — available even while creating a new athlete.

import { Icon } from "@/components/icon";
import { useLane } from "@/components/lane-provider";
import { Avatar, Modal } from "@/components/primitives";
import { EVENT_CATEGORIES } from "@/lib/reference";
import type { Athlete } from "@/lib/types";
import { downloadWordDoc } from "@/utils";
import { useState } from "react";
import { DisciplinePicker } from "./discipline-picker";
import { PassportManager, VisaManager } from "./travel-managers";

const SECTION = { textTransform: "uppercase", letterSpacing: "0.06em" } as const;

export function AthleteFormModal({
  athlete,
  onClose,
  onSave,
  onDelete,
}: {
  athlete?: Athlete;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: () => void;
}) {
  const isNew = !athlete;
  const { passports, visas, deletePassport, deleteVisa, t } = useLane();
  // A stable id so passports/visas can be attached WHILE creating a new athlete
  // (the managers write to the provider against this id immediately).
  const [newId] = useState(() => "a" + Math.random().toString(36).slice(2, 6));
  const [saved, setSaved] = useState(false);
  const docId = athlete?.id || newId;
  const [form, setForm] = useState<any>(
    athlete || {
      first: "", last: "", nationality: "", gender: "", dob: "",
      specialty: "", category: "long", squad: "Senior B",
      status: "active", coach: "",
      heightUnit: "cm", weightUnit: "kg",
      bio: "",
      color: "#f55b6e",
      contact: { email: "", phone: "" },
      medals: { gold: 0, silver: 0, bronze: 0 },
      disciplines: [],
      pb: {},
      progress: 50,
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDisciplines, setShowDisciplines] = useState(false);
  const [showPassports, setShowPassports] = useState(false);
  const [showVisas, setShowVisas] = useState(false);

  const update = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const disciplines: string[] = form.disciplines || [];

  // The picker returns the selected disciplines; keep pb in sync — one row per
  // selected discipline, preserving any time already entered.
  const applyDisciplines = (next: string[]) => {
    const pb: Record<string, string> = {};
    next.forEach((d) => (pb[d] = form.pb?.[d] || ""));
    setForm((f: any) => ({ ...f, disciplines: next, pb }));
    setShowDisciplines(false);
  };
  const setPb = (d: string, v: string) => update("pb", { ...(form.pb || {}), [d]: v });

  const athletePassports = passports.filter((p) => p.athleteId === docId);
  const athleteVisas = visas.filter((v) => v.athleteId === docId && !v.archived);

  const submit = () => {
    const e: Record<string, string> = {};
    if (!form.first) e.first = "Required";
    if (!form.last) e.last = "Required";
    if (form.contact?.email && !form.contact.email.includes("@")) e.email = "Invalid email";
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setSaved(true);
      onSave({
        ...form,
        specialty: form.specialty || disciplines[0] || "",
        id: form.id || newId,
        initials: (form.first[0] + form.last[0]).toUpperCase(),
        age: form.dob ? new Date().getFullYear() - parseInt(form.dob.slice(0, 4)) : 22,
      });
    }
  };

  // Stampa — generate a Word biography document (photo_34) and download it.
  const printBio = () => {
    const esc = (s: any) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    const fullName = `${form.first} ${form.last}`.trim();
    const age = form.dob ? new Date().getFullYear() - parseInt(form.dob.slice(0, 4)) : form.age;
    const rows = ([
      [t("athlete.dob"), [form.dob, form.placeOfBirth].filter(Boolean).join(" · ")],
      [t("athlete.nationality"), form.nationality],
      [t("athlete.height"), form.height ? `${form.height} cm` : ""],
      [t("athlete.weight"), form.weight ? `${form.weight} kg` : ""],
      [t("athlete.residence"), form.residence],
      [t("athlete.club"), form.club],
      [t("athlete.coach"), form.coach],
      [t("athlete.sponsor"), form.sponsor],
      [t("athlete.email"), form.contact?.email],
      [t("athlete.phone"), form.contact?.phone],
    ] as [string, any][]).filter(([, v]) => v);
    const dataTable = `<table class="dl">${rows.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>`;
    const pbRows = Object.entries(form.pb || {}).filter(([, m]) => m);
    const pbTable = pbRows.length
      ? `<h2>${esc(t("athlete.personalBest"))}</h2><table><tr><th>${esc(t("athlete.discipline"))}</th><th>${esc(t("athlete.time"))}</th></tr>${pbRows.map(([d, m]) => `<tr><td>${esc(d)}</td><td>${esc(m)}</td></tr>`).join("")}</table>`
      : "";
    const bio = form.bio ? `<h2>${esc(t("athlete.biography"))}</h2><p class="bio">${esc(form.bio)}</p>` : "";
    const body = `<h1>${esc(fullName)}</h1><p class="sub">${esc([form.nationality, form.specialty, age ? `${age}` : ""].filter(Boolean).join(" · "))}</p><h2>${esc(t("athlete.personalData"))}</h2>${dataTable}${pbTable}${bio}`;
    downloadWordDoc(`biografia-${fullName.replace(/\s+/g, "-").toLowerCase() || "atleta"}`, body, fullName);
  };

  // If a NEW athlete is abandoned, remove any passports/visas that were attached
  // to the not-yet-created athlete so they don't linger as orphans.
  const handleClose = () => {
    if (isNew && !saved) {
      passports.filter((p) => p.athleteId === newId).forEach((p) => deletePassport(p.id));
      visas.filter((v) => v.athleteId === newId).forEach((v) => deleteVisa(v.id));
    }
    onClose();
  };

  return (
    <Modal
      open={true}
      onClose={handleClose}
      size="xl"
      title={isNew ? t("athlete.addNew") : `${t("athlete.edit")} — ${form.first} ${form.last}`}
      footer={
        <>
          {!isNew && (
            <button className="btn btn-ghost" onClick={() => { onDelete && onDelete(); onClose(); }} style={{ color: "var(--danger)", marginRight: "auto" }}>
              <Icon name="trash" size={13} /> {t("athlete.delete")}
            </button>
          )}
          <button className="btn btn-secondary" onClick={printBio}><Icon name="fileText" size={13} /> {t("athlete.printBio")}</button>
          <button className="btn btn-secondary" onClick={handleClose}>{t("common.cancel")}</button>
          <button className="btn btn-primary" onClick={submit}>{isNew ? t("athlete.create") : t("common.save")}</button>
        </>
      }
    >
      <div className="col" style={{ gap: 16 }}>
        {/* ---- Identity ---- */}
        <div className="row" style={{ gap: 14, alignItems: "center" }}>
          <Avatar name={form.first + " " + form.last} color={form.color} size="xl" />
          <div className="col" style={{ gap: 6 }}>
            <button className="btn btn-secondary btn-sm"><Icon name="upload" size={13} /> {t("athlete.uploadPhoto")}</button>
            <div style={{ display: "flex", gap: 4 }}>
              {["#f55b6e", "#f5b14c", "#22d3a0", "#5b6ef5", "#b96eff", "#4cc9f5"].map((c) => (
                <button
                  key={c}
                  onClick={() => update("color", c)}
                  style={{ width: 22, height: 22, borderRadius: 999, background: c, border: form.color === c ? "2px solid var(--fg-1)" : "2px solid transparent", outline: form.color === c ? "1px solid var(--bg-1)" : "none" }}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field">
            <label className="field-label">{t("athlete.firstName")}</label>
            <input className="input" value={form.first} onChange={(e) => update("first", e.target.value)} aria-invalid={!!errors.first} />
            {errors.first && <span className="field-error"><Icon name="alert" size={11} /> {errors.first}</span>}
          </div>
          <div className="field">
            <label className="field-label">{t("athlete.lastName")}</label>
            <input className="input" value={form.last} onChange={(e) => update("last", e.target.value)} aria-invalid={!!errors.last} />
            {errors.last && <span className="field-error"><Icon name="alert" size={11} /> {errors.last}</span>}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div className="field">
            <label className="field-label">{t("athlete.height")}</label>
            <div className="row" style={{ gap: 6 }}>
              <input type="number" className="input" style={{ flex: 1, minWidth: 0 }} placeholder="0" value={form.height || ""} onChange={(e) => update("height", e.target.value ? Number(e.target.value) : undefined)} />
              <select className="input" style={{ width: 72, flex: "none" }} value={form.heightUnit || "cm"} onChange={(e) => update("heightUnit", e.target.value)}>
                <option value="cm">cm</option>
                <option value="ft">ft</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label className="field-label">{t("athlete.weight")}</label>
            <div className="row" style={{ gap: 6 }}>
              <input type="number" className="input" style={{ flex: 1, minWidth: 0 }} placeholder="0" value={form.weight || ""} onChange={(e) => update("weight", e.target.value ? Number(e.target.value) : undefined)} />
              <select className="input" style={{ width: 72, flex: "none" }} value={form.weightUnit || "kg"} onChange={(e) => update("weightUnit", e.target.value)}>
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label className="field-label">{t("athlete.gender")}</label>
            <select className="input" value={form.gender} onChange={(e) => update("gender", e.target.value)}>
              <option value="" disabled>—</option>
              <option value="F">F</option>
              <option value="M">M</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div className="field"><label className="field-label">{t("athlete.dob")}</label><input type="date" className="input" value={form.dob} onChange={(e) => update("dob", e.target.value)} /></div>
          <div className="field"><label className="field-label">{t("athlete.placeOfBirth")}</label><input className="input" value={form.placeOfBirth || ""} onChange={(e) => update("placeOfBirth", e.target.value)} /></div>
          <div className="field"><label className="field-label">{t("athlete.nationality")}</label><input className="input" value={form.nationality} onChange={(e) => update("nationality", e.target.value)} /></div>
        </div>

        <div className="field"><label className="field-label">{t("athlete.residence")}</label><input className="input" value={form.residence || ""} onChange={(e) => update("residence", e.target.value)} /></div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field">
            <label className="field-label">{t("athlete.email")}</label>
            <div className="input-group">
              <Icon name="mail" size={14} />
              <input className="input" type="email" value={form.contact?.email || ""} onChange={(e) => update("contact", { ...form.contact, email: e.target.value })} aria-invalid={!!errors.email} />
            </div>
            {errors.email && <span className="field-error"><Icon name="alert" size={11} /> {errors.email}</span>}
          </div>
          <div className="field">
            <label className="field-label">{t("athlete.phone")}</label>
            <div className="input-group">
              <Icon name="phone" size={14} />
              <input className="input" value={form.contact?.phone || ""} onChange={(e) => update("contact", { ...form.contact, phone: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="divider" />
        <div className="text-xs mono fw-700 muted" style={SECTION}>Agency</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
          <div className="field">
            <label className="field-label">{t("athlete.contract")}</label>
            <select className="input" value={form.contract ?? ""} onChange={(e) => update("contract", e.target.value || null)}>
              <option value="">None (IT)</option>
              <option value="E">(E) Eric</option>
              <option value="M">(M) Monica</option>
            </select>
          </div>
          <div className="field"><label className="field-label">{t("athlete.sponsor")}</label><input className="input" value={form.sponsor || ""} onChange={(e) => update("sponsor", e.target.value)} /></div>
          <div className="field"><label className="field-label">{t("athlete.shoeSize")}</label><input className="input" placeholder="9 uk…" value={form.shoeSize || ""} onChange={(e) => update("shoeSize", e.target.value)} /></div>
          <div className="field"><label className="field-label">{t("athlete.clothingSize")}</label><input className="input" placeholder="Medium…" value={form.clothingSize || ""} onChange={(e) => update("clothingSize", e.target.value)} /></div>
          <div className="field"><label className="field-label">{t("athlete.coach")}</label><input className="input" value={form.coach || ""} onChange={(e) => update("coach", e.target.value)} /></div>
          <div className="field">
            <label className="field-label">{t("athlete.category")}</label>
            <select className="input" value={form.category} onChange={(e) => update("category", e.target.value)}>
              {Object.entries(EVENT_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">{t("common.status")}</label>
            <select className="input" value={form.status} onChange={(e) => update("status", e.target.value)}>
              <option value="active">{t("status.active")}</option>
              <option value="injury">{t("status.injury")}</option>
              <option value="pregnant">{t("status.pregnant")}</option>
              <option value="inactive">{t("status.inactive")}</option>
            </select>
          </div>
        </div>

        {/* ---- Personal best (table, not a picker) ---- */}
        <div className="divider" />
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="text-xs mono fw-700 muted" style={SECTION}>{t("athlete.personalBest")}</div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowDisciplines(true)}>
            <Icon name="layers" size={13} /> {t("athlete.selectDisciplines")}
          </button>
        </div>
        {disciplines.length === 0 ? (
          <div className="text-sm muted" style={{ padding: "6px 2px" }}>
            {t("athlete.noDisciplines")}
          </div>
        ) : (
          <table className="table">
            <thead><tr><th>{t("athlete.discipline")}</th><th style={{ width: 220 }}>{t("athlete.time")}</th></tr></thead>
            <tbody>
              {disciplines.map((d) => (
                <tr key={d}>
                  <td className="fw-600">{d}</td>
                  <td><input className="input" placeholder={"e.g. 2h03'37\""} value={form.pb?.[d] || ""} onChange={(e) => setPb(d, e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ---- Passport & visa ---- */}
        <div className="divider" />
        <div className="text-xs mono fw-700 muted" style={SECTION}>{t("athlete.passportVisa")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field">
            <label className="field-label">{t("athlete.passport")}{athletePassports.length > 1 ? ` (${athletePassports.length})` : ""}</label>
            <div className="row" style={{ gap: 8 }}>
              <div className="input" style={{ flex: 1, display: "flex", alignItems: "center" }}>
                {athletePassports[0] ? `(${athletePassports[0].expiry}) ${athletePassports[0].number}` : <span className="muted">—</span>}
              </div>
              <button className="btn btn-secondary" onClick={() => setShowPassports(true)}><Icon name="edit" size={13} /> {t("common.manage")}</button>
            </div>
          </div>
          <div className="field">
            <label className="field-label">{t("athlete.visa")}{athleteVisas.length > 1 ? ` (${athleteVisas.length})` : ""}</label>
            <div className="row" style={{ gap: 8 }}>
              <div className="input" style={{ flex: 1, display: "flex", alignItems: "center" }}>
                {athleteVisas[0] ? `(${athleteVisas[0].validTo}) ${athleteVisas[0].type}` : <span className="muted">—</span>}
              </div>
              <button className="btn btn-secondary" onClick={() => setShowVisas(true)}><Icon name="edit" size={13} /> {t("common.manage")}</button>
            </div>
          </div>
        </div>

        {/* ---- Biography ---- */}
        <div className="field">
          <label className="field-label">{t("athlete.biography")}</label>
          <textarea className="input" value={form.bio} onChange={(e) => update("bio", e.target.value)} placeholder="…" />
        </div>
      </div>

      {showDisciplines && (
        <DisciplinePicker selected={disciplines} onClose={() => setShowDisciplines(false)} onSave={applyDisciplines} />
      )}
      {showPassports && (
        <PassportManager athleteId={docId} onClose={() => setShowPassports(false)} />
      )}
      {showVisas && (
        <VisaManager athleteId={docId} onClose={() => setShowVisas(false)} />
      )}
    </Modal>
  );
}
