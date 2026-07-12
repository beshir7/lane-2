"use client";

// Documents — Library with categories, upload (drag-drop), preview modal, search.

import { Icon } from "@/components/icon";
import { useLane } from "@/components/lane-provider";
import { Avatar, Badge, Modal } from "@/components/primitives";
import { FilterDropdown, InfoRow } from "@/components/shared";
import { DOC_CATEGORIES } from "@/lib/reference";
import type { Athlete, LaneDocument, Visa } from "@/lib/types";
import { downloadCsv, downloadWordDoc, pickFiles } from "@/utils";
import { useState } from "react";

// Days until an ISO date, measured from local midnight; negative = past.
function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00");
  if (isNaN(d.getTime())) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - start.getTime()) / 86400000);
}

// Which categories carry a meaningful date to filter on: passports & visas by
// expiry, contracts by deadline. Medical records and media have none.
const DATE_FILTER_CATEGORIES = ["passport", "visa", "contract"];

export function DocumentsScreen() {
  const { documents: docs, athletes, visas, addDocuments, t } = useLane();
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [preview, setPreview] = useState<LaneDocument | null>(null);

  const showDateFilter = DATE_FILTER_CATEGORIES.includes(category);
  const isContract = category === "contract";

  const filtered = docs
    .filter((d) => {
      if (category !== "all" && d.category !== category) return false;
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (showDateFilter && dateFilter !== "all") {
        const days = daysUntil(d.expires);
        if (days == null) return false; // no date on file → excluded while filtering by date
        if (dateFilter === "expired" && !(days < 0)) return false;
        if (dateFilter === "soon" && !(days >= 0 && days < 60)) return false;
        if (dateFilter === "valid" && !(days >= 60)) return false;
      }
      return true;
    })
    .sort((a, b) => (b.uploaded || "").localeCompare(a.uploaded || "")); // newest first

  const handleUpload = (files: { name: string; size?: string }[]) => addDocuments(files);

  // Upload button: open the OS file picker and add the chosen files.
  const pickAndUpload = async () => {
    const files = await pickFiles("image/*,application/pdf,.doc,.docx", true);
    if (files.length) handleUpload(files.map((f) => ({ name: f.name, size: (f.size / 1048576).toFixed(1) + " MB" })));
  };

  // Date-filter options adapt to the category: expiry wording for passport/visa,
  // deadline wording for contracts.
  const dateOptions = isContract
    ? [{ v: "all", l: t("docfilter.all") }, { v: "soon", l: t("docfilter.dueSoon") }, { v: "expired", l: t("docfilter.overdue") }, { v: "valid", l: t("docfilter.upcoming") }]
    : [{ v: "all", l: t("docfilter.all") }, { v: "valid", l: t("docfilter.valid") }, { v: "soon", l: t("docfilter.soon") }, { v: "expired", l: t("docfilter.expired") }];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("docs.title")}</h1>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={pickAndUpload}><Icon name="upload" size={14} /> {t("docs.upload")}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12 }}>
        <div className="card" style={{ padding: 8, height: "fit-content", display: "flex", flexDirection: "column", gap: 1 }}>
          {DOC_CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => { setCategory(c.id); setDateFilter("all"); }} className="nav-item" aria-current={category === c.id ? "page" : undefined}>
              <span className="nav-item-icon"><Icon name={c.icon} size={15} /></span>
              <span className="nav-item-label">{t("doccat." + c.id)}</span>
            </button>
          ))}
        </div>

        <div className="col" style={{ gap: 12 }}>
          <div className="card" style={{ padding: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <div className="input-group" style={{ flex: 1 }}>
              <Icon name="search" size={14} />
              <input className="input" placeholder={category === "visa" ? t("docs.searchVisa") : t("docs.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {showDateFilter && (
              <div style={{ flex: "0 0 auto" }}>
                <FilterDropdown label={isContract ? t("docfilter.deadline") : t("docfilter.expiry")} value={dateFilter} options={dateOptions} onChange={setDateFilter} align="right" />
              </div>
            )}
          </div>

          {category === "visa" && <VisaListPanel visas={visas} athletes={athletes} search={search} />}
          {category === "visa" && <RaceVisaPanel search={search} />}

          {filtered.length === 0 ? (
            category === "visa" ? null : <UploadDropzone onUpload={handleUpload} empty />
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {filtered.map((d) => <DocGridCard key={d.id} doc={d} athletes={athletes} onOpen={() => setPreview(d)} />)}
              </div>
              <UploadDropzone onUpload={handleUpload} />
            </>
          )}
        </div>
      </div>

      {preview && <DocumentPreviewModal doc={preview} athletes={athletes} onClose={() => setPreview(null)} />}
    </div>
  );
}

function DocIcon({ doc, small }: { doc: LaneDocument; small?: boolean }) {
  const size = small ? 36 : 64;
  const colors: Record<string, { bg: string; fg: string }> = {
    pdf: { bg: "rgba(245, 91, 110, 0.12)", fg: "#f55b6e" },
    image: { bg: "rgba(34, 211, 160, 0.12)", fg: "#22d3a0" },
    doc: { bg: "rgba(107, 125, 255, 0.12)", fg: "#6b7dff" },
  };
  const c = colors[doc.type] || colors.doc;
  return (
    <div style={{ width: size, height: small ? 44 : 80, borderRadius: small ? 5 : 8, background: c.bg, color: c.fg, display: "grid", placeItems: "center", border: "1px solid " + c.fg + "33", position: "relative" }}>
      <Icon name={doc.icon} size={small ? 18 : 28} />
      {!small && <span className="mono text-xs fw-700" style={{ position: "absolute", bottom: 6, color: c.fg, textTransform: "uppercase", letterSpacing: "0.04em" }}>{doc.type}</span>}
    </div>
  );
}

function DocGridCard({ doc, athletes, onOpen }: { doc: LaneDocument; athletes: Athlete[]; onOpen: () => void }) {
  const { t } = useLane();
  const athlete = athletes.find((a) => a.id === doc.athleteId);
  return (
    <button className="card" onClick={onOpen} style={{ padding: 14, textAlign: "left", display: "flex", flexDirection: "column", gap: 10, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
        <DocIcon doc={doc} />
      </div>
      <div>
        <div className="fw-600 text-sm" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={doc.name}>{doc.name}</div>
        <div className="text-xs muted">{doc.size} · {doc.uploaded}</div>
      </div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        {athlete ? <Avatar name={athlete.first + " " + athlete.last} color={athlete.color} size="xs" /> : <span className="text-xs muted">{t("docs.teamWide")}</span>}
        {doc.expires && <ExpiryBadge expires={doc.expires} />}
      </div>
    </button>
  );
}

function ExpiryBadge({ expires }: { expires: string }) {
  const { t } = useLane();
  const days = daysUntil(expires);
  if (days == null) return null;
  if (days < 0) return <Badge variant="danger">{t("docs.expired")}</Badge>;
  if (days < 60) return <Badge variant="warning">{t("docs.daysLeft", { n: days })}</Badge>;
  return <Badge variant="success" dot>{t("docs.valid")}</Badge>;
}

// The visa list generated by the software (photo_26). Only the fields the user
// needs: athlete surname/name, validity (from → to), and visa type. Printable
// (Word) or savable (CSV) for when a paper/offline copy is needed.
function VisaListPanel({ visas, athletes, search }: { visas: Visa[]; athletes: Athlete[]; search: string }) {
  const { t } = useLane();
  const nameOf = (id: string) => { const a = athletes.find((x) => x.id === id); return a ? `${a.last}, ${a.first}` : id; };
  const rows = visas
    .filter((v) => !v.archived)
    .map((v) => ({ name: nameOf(v.athleteId), type: v.type || v.kind, from: v.validFrom || "—", to: v.validTo || "—" }))
    .filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.type.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  const printList = () => {
    const body = `<h1>${t("docs.visaList")}</h1><p class="sub">${rows.length} ${t("doccat.visa").toLowerCase()}</p><table><tr><th>${t("docs.athlete")}</th><th>${t("docs.type")}</th><th>${t("docs.validFrom")}</th><th>${t("docs.validTo")}</th></tr>${rows
      .map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.type)}</td><td>${esc(r.from)}</td><td>${esc(r.to)}</td></tr>`)
      .join("")}</table>`;
    downloadWordDoc("visa-list", body, t("docs.visaList"));
  };
  const exportCsv = () => downloadCsv("visa-list", rows.map((r) => ({ athlete: r.name, type: r.type, valid_from: r.from, valid_to: r.to })));

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{t("docs.visaList")} · {rows.length}</div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn btn-secondary btn-sm" onClick={exportCsv}><Icon name="download" size={13} /> {t("docs.saveCsv")}</button>
          <button className="btn btn-secondary btn-sm" onClick={printList}><Icon name="fileText" size={13} /> {t("docs.print")}</button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="text-sm muted" style={{ padding: 18 }}>{t("docs.noVisas")}</div>
      ) : (
        <table className="table">
          <thead><tr><th>{t("docs.athlete")}</th><th>{t("docs.type")}</th><th>{t("docs.validFrom")}</th><th>{t("docs.validTo")}</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="fw-600">{r.name}</td>
                <td>{r.type}</td>
                <td className="text-sm mono muted">{r.from}</td>
                <td className="text-sm mono">{r.to}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Race visa check (photo_3): one page showing, per race, the athletes competing
// and whether each one's visa is valid for that race's date. Built live from race
// entries + visas, so it stays in sync. Printable / savable.
type VisaStatus = "valid" | "expired" | "unknown" | "missing";
function RaceVisaPanel({ search }: { search: string }) {
  const { competitions, entries, visas, athletes, t } = useLane();
  const nameOf = (id: string) => { const a = athletes.find((x) => x.id === id); return a ? `${a.last} ${a.first}` : id; };

  const statusFor = (athleteId: string, raceDate: string): { status: VisaStatus; visa?: Visa } => {
    const mine = visas.filter((v) => v.athleteId === athleteId && !v.archived);
    if (mine.length === 0) return { status: "missing" };
    const covering = mine.find((v) => !v.notKnown && v.validFrom && v.validTo && v.validFrom <= raceDate && raceDate <= v.validTo);
    if (covering) return { status: "valid", visa: covering };
    const unknown = mine.find((v) => v.notKnown);
    if (unknown) return { status: "unknown", visa: unknown };
    // Newest visa on file that doesn't cover the date → treat as expired/invalid.
    const latest = [...mine].sort((a, b) => (b.validTo || "").localeCompare(a.validTo || ""))[0];
    return { status: "expired", visa: latest };
  };

  const badge: Record<VisaStatus, { label: string; variant: "success" | "danger" | "warning" | "" }> = {
    valid: { label: t("vs.valid"), variant: "success" },
    expired: { label: t("vs.notValid"), variant: "danger" },
    unknown: { label: t("vs.unknown"), variant: "warning" },
    missing: { label: t("vs.noVisa"), variant: "" },
  };

  // One flat row per (race, athlete) — same single-table format as the visa list.
  const rows = competitions
    .filter((c) => entries.some((e) => e.competitionId === c.id))
    .flatMap((c) => Array.from(new Set(entries.filter((e) => e.competitionId === c.id).map((e) => e.athleteId)))
      .map((aid) => ({ race: c, athleteId: aid, name: nameOf(aid), ...statusFor(aid, c.date) })))
    .filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.race.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (+new Date(a.race.date) - +new Date(b.race.date)) || a.name.localeCompare(b.name));

  const esc = (s: string) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  const printList = () => {
    const body = `<h1>${t("docs.raceVisaCheck")}</h1><table><tr><th>${t("docs.race")}</th><th>${t("docs.validFrom")}</th><th>${t("docs.athlete")}</th><th>${t("docs.visa")}</th><th>${t("docs.validFrom")}</th><th>${t("docs.validTo")}</th><th>${t("docs.embassy")}</th><th>${t("common.status")}</th></tr>${rows
      .map((r) => `<tr><td>${esc(r.race.name)}</td><td>${esc(r.race.date)}</td><td>${esc(r.name)}</td><td>${esc(r.visa?.type || r.visa?.kind || "—")}</td><td>${esc(r.visa?.validFrom || "—")}</td><td>${esc(r.visa?.validTo || "—")}</td><td>${esc(r.visa?.embassy || "—")}</td><td>${esc(badge[r.status].label)}</td></tr>`)
      .join("")}</table>`;
    downloadWordDoc("race-visa-check", body, t("docs.raceVisaCheck"));
  };
  const exportCsv = () => downloadCsv("race-visa-check", rows.map((r) => ({
    race: r.race.name, date: r.race.date, athlete: r.name, visa: r.visa?.type || r.visa?.kind || "", valid_from: r.visa?.validFrom || "", valid_to: r.visa?.validTo || "", embassy: r.visa?.embassy || "", status: badge[r.status].label,
  })));

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{t("docs.raceVisaCheck")} · {rows.length}</div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn btn-secondary btn-sm" onClick={exportCsv}><Icon name="download" size={13} /> {t("docs.saveCsv")}</button>
          <button className="btn btn-secondary btn-sm" onClick={printList}><Icon name="fileText" size={13} /> {t("docs.print")}</button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="text-sm muted" style={{ padding: 18 }}>{t("docs.raceVisaEmpty")}</div>
      ) : (
        <table className="table">
          <thead><tr><th>{t("docs.race")}</th><th>{t("docs.athlete")}</th><th>{t("docs.visa")}</th><th>{t("docs.validFrom")}</th><th>{t("docs.validTo")}</th><th>{t("docs.embassy")}</th><th style={{ width: 90 }}>{t("common.status")}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.race.id}-${r.athleteId}`}>
                <td><div className="fw-600">{r.race.name}</div><div className="text-xs muted mono">{r.race.date}</div></td>
                <td className="fw-600">{r.name}</td>
                <td>{r.visa?.type || r.visa?.kind || "—"}</td>
                <td className="text-sm mono muted">{r.visa?.validFrom || "—"}</td>
                <td className="text-sm mono">{r.visa?.validTo || "—"}</td>
                <td className="text-sm">{r.visa?.embassy || "—"}</td>
                <td><Badge variant={badge[r.status].variant}>{badge[r.status].label}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function UploadDropzone({ onUpload, empty }: { onUpload: (files: { name: string; size?: string }[]) => void; empty?: boolean }) {
  const { t } = useLane();
  const [over, setOver] = useState(false);
  const toMeta = (files: File[]) => files.map((f) => ({ name: f.name, size: (f.size / 1048576).toFixed(1) + " MB" }));
  // Clicking the dropzone opens the OS file picker — same result as drag-drop.
  const browse = async () => {
    const files = await pickFiles("image/*,application/pdf,.doc,.docx", true);
    if (files.length) onUpload(toMeta(files));
  };
  return (
    <div
      onClick={browse}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); browse(); } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onUpload(toMeta(files));
      }}
      className="card"
      style={{
        padding: empty ? 48 : 22,
        borderStyle: "dashed",
        background: over ? "var(--accent-soft)" : "var(--bg-1)",
        borderColor: over ? "var(--accent)" : "var(--border-1)",
        textAlign: "center",
        transition: "all 150ms",
        cursor: "pointer",
      }}
    >
      <Icon name="upload" size={empty ? 28 : 18} style={{ color: over ? "var(--accent)" : "var(--fg-3)" }} />
      <div style={{ marginTop: 8 }}>
        <span className="fw-600" style={{ fontSize: empty ? 16 : 13 }}>
          {empty ? t("docs.dropTitle") : t("docs.dropMore")}
          {!empty && <span style={{ color: "var(--accent)" }}>{t("docs.browse")}</span>}
        </span>
      </div>
      {empty && <div className="text-sm muted" style={{ marginTop: 4 }}>{t("docs.dropHint")}</div>}
    </div>
  );
}

function DocumentPreviewModal({ doc, athletes, onClose }: { doc: LaneDocument; athletes: Athlete[]; onClose: () => void }) {
  const { t } = useLane();
  const athlete = athletes.find((a) => a.id === doc.athleteId);
  return (
    <Modal
      open={true}
      onClose={onClose}
      size="xl"
      title={doc.name}
      footer={
        <>
          <button className="btn btn-secondary"><Icon name="external" size={13} /> {t("docs.open")}</button>
          <button className="btn btn-secondary"><Icon name="share" size={13} /> {t("docs.share")}</button>
          <button className="btn btn-secondary"><Icon name="download" size={13} /> {t("docs.download")}</button>
          <button className="btn btn-primary">{t("docs.replaceFile")}</button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, height: 460 }}>
        <div className="card" style={{ background: "var(--bg-2)", display: "grid", placeItems: "center", overflow: "hidden", position: "relative" }}>
          {doc.type === "image" ? (
            <div style={{ width: "80%", height: "80%", borderRadius: 8, background: "repeating-linear-gradient(45deg, #2a3245 0 8px, #232a3c 8px 16px)", display: "grid", placeItems: "center", color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
              [ image preview ]
            </div>
          ) : (
            <div style={{ width: 240, height: 320, background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: 8, padding: 20, display: "flex", flexDirection: "column", gap: 10, boxShadow: "var(--shadow-2)" }}>
              <div className="display fw-700" style={{ fontSize: 14, color: "var(--fg-1)" }}>{doc.name.replace(/\.[^.]+$/, "")}</div>
              <div style={{ height: 6 }} />
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} style={{ height: 6, background: "var(--bg-3)", borderRadius: 2, width: i % 3 === 0 ? "60%" : "100%" }} />
              ))}
            </div>
          )}
          <div className="row" style={{ position: "absolute", bottom: 12, padding: "4px 12px", background: "var(--bg-1)", borderRadius: 999, border: "1px solid var(--border-1)", gap: 4 }}>
            <button className="icon-btn btn-sm"><Icon name="chevronLeft" size={13} /></button>
            <span className="text-xs mono">{t("docs.page")} 1 {t("docs.of")} 4</span>
            <button className="icon-btn btn-sm"><Icon name="chevronRight" size={13} /></button>
          </div>
        </div>
        <div className="col" style={{ gap: 14 }}>
          <div>
            <div className="text-xs mono fw-700 muted" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("docs.details")}</div>
            <div className="col" style={{ marginTop: 8, gap: 10 }}>
              <InfoRow icon="folder" label={t("docs.category")} value={<Badge>{t("doccat." + doc.category)}</Badge>} />
              <InfoRow icon="hash" label={t("docs.size")} value={<span className="mono">{doc.size}</span>} />
              <InfoRow icon="calendar" label={t("docs.uploaded")} value={doc.uploaded} />
              {doc.expires && <InfoRow icon="clock" label={t("docs.expires")} value={<ExpiryBadge expires={doc.expires} />} />}
              {athlete && <InfoRow icon="user" label={t("docs.athlete")} value={<><Avatar name={athlete.first + " " + athlete.last} color={athlete.color} size="xs" /> {athlete.first} {athlete.last}</>} />}
            </div>
          </div>

          <div className="divider" />
          <div>
            <div className="text-xs mono fw-700 muted" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("docs.versions")}</div>
            <div className="col" style={{ marginTop: 8, gap: 6 }}>
              <div className="row">
                <Badge variant="success" dot>{t("docs.current")}</Badge>
                <span className="text-sm fw-600">v3</span>
                <span className="spacer" />
                <span className="text-xs muted mono">{doc.uploaded}</span>
              </div>
              <div className="row">
                <span className="text-sm muted">v2</span>
                <span className="spacer" />
                <span className="text-xs muted mono">2024-09-22</span>
              </div>
              <div className="row">
                <span className="text-sm muted">v1</span>
                <span className="spacer" />
                <span className="text-xs muted mono">2023-06-05</span>
              </div>
            </div>
          </div>

          <div className="divider" />
          <div>
            <div className="text-xs mono fw-700 muted" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("docs.access")}</div>
            <div className="row" style={{ marginTop: 8 }}>
              <Icon name="lock" size={14} style={{ color: "var(--fg-3)" }} />
              <span className="text-sm">{t("docs.restricted")}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
