"use client";

// Athlete detail profile with tabbed content.

import { Icon } from "@/components/icon";
import { useLane } from "@/components/lane-provider";
import { Avatar, Badge, ConfirmModal, EmptyState, Tabs, Tag } from "@/components/primitives";
import { BigStat, EntryStatusBadge, InfoRow, StatusBadge } from "@/components/shared";
import { localeOf } from "@/lib/i18n";
import type { Athlete, Competition, RaceEntry } from "@/lib/types";
import { placementColor } from "@/utils";
import { useState } from "react";
import { AthleteFormModal } from "./athlete-form-modal";
import { TravelTab } from "./athlete-travel";

const GENDER_COLOR: Record<string, string> = { F: "#f55b6e", M: "#5b6ef5", X: "var(--fg-1)" };

export function AthleteProfile({ athleteId }: { athleteId: string }) {
  const { athletes, events, competitions, entries, passports, visas, navigate, updateAthlete, deleteAthlete, t } = useLane();
  const athlete = athletes.find((a) => a.id === athleteId);
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!athlete) return <div className="page">{t("prof.notFound")}</div>;

  const athleteEvents = events.filter((e) => e.athletes.includes(athlete.id));
  const athleteEntries = entries.filter((e) => e.athleteId === athlete.id);
  const athletePassports = passports.filter((p) => p.athleteId === athlete.id);
  const athleteVisas = visas.filter((v) => v.athleteId === athlete.id);

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate("athletes")} style={{ marginBottom: 12 }}>
        <Icon name="chevronLeft" size={13} /> {t("prof.allAthletes")}
      </button>

      <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
        <div style={{ height: 120, background: `linear-gradient(135deg, ${athlete.color}aa 0%, ${athlete.color}33 60%, transparent 100%)`, position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent 0 39px, rgba(255,255,255,0.06) 39px 40px)" }} />
          <div style={{ position: "absolute", top: 16, right: 18, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}><Icon name="edit" size={13} /> {t("common.edit")}</button>
            <button className="btn btn-secondary btn-sm" style={{ color: "var(--danger)" }} onClick={() => setConfirmDelete(true)}><Icon name="trash" size={13} /> {t("common.delete")}</button>
          </div>
        </div>
        <div style={{ padding: "0 24px 20px", marginTop: -42 }}>
          <div className="row" style={{ alignItems: "flex-end", gap: 20 }}>
            <Avatar name={athlete.first + " " + athlete.last} color={athlete.color} size="xl" style={{ border: "4px solid var(--bg-1)" }} />
            <div style={{ flex: 1, paddingBottom: 6 }}>
              <div className="row" style={{ gap: 10 }}>
                <h2 className="display" style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", color: GENDER_COLOR[athlete.gender] || "var(--fg-1)" }}>
                  {athlete.first} {athlete.last}{athlete.contract ? ` (${athlete.contract})` : ""}
                </h2>
                <StatusBadge status={athlete.status} />
              </div>
              <div className="row" style={{ gap: 14, marginTop: 6, flexWrap: "wrap" }}>
                <span className="text-sm muted">{athlete.nationality}</span>
                <span className="text-sm muted">·</span>
                <span className="text-sm muted">{athlete.specialty}</span>
                <span className="text-sm muted">·</span>
                <span className="text-sm muted">{athlete.age} {t("prof.yrs")}</span>
                {athlete.sponsor && <><span className="text-sm muted">·</span><span className="text-sm muted">{athlete.sponsor}</span></>}
                <span className="text-sm muted">·</span>
                <span className="text-sm muted">{t("prof.coach")} {athlete.coach}</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "auto auto auto", gap: 22, paddingBottom: 6 }}>
              <BigStat v={athlete.medals.gold} l={t("dash.gold")} c="#f5b14c" />
              <BigStat v={athlete.medals.silver} l={t("dash.silver")} c="#c9d3df" />
              <BigStat v={athlete.medals.bronze} l={t("dash.bronze")} c="#c08c5e" />
            </div>
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { value: "overview", label: t("prof.overview") },
          { value: "competitions", label: t("prof.competitions"), count: athleteEntries.length },
          { value: "travel", label: t("prof.passportsVisas"), count: athletePassports.length + athleteVisas.length },
          { value: "history", label: t("prof.history") },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "overview" && <OverviewTab athlete={athlete} entries={athleteEntries} competitions={competitions} navigate={navigate} />}
      {tab === "competitions" && <AthleteCompetitionsTab entries={athleteEntries} competitions={competitions} />}
      {tab === "travel" && <TravelTab athleteId={athlete.id} passports={athletePassports} visas={athleteVisas} />}
      {tab === "history" && <AthleteHistoryTab />}

      {editing && (
        <AthleteFormModal
          athlete={athlete}
          onClose={() => setEditing(false)}
          onSave={(data) => { updateAthlete(athlete.id, data); setEditing(false); }}
          onDelete={() => { deleteAthlete(athlete.id); navigate("athletes"); }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={t("prof.deleteAthlete")}
          message={t("prof.deleteConfirm", { name: `${athlete.first} ${athlete.last}` })}
          onCancel={() => setConfirmDelete(false)}
          choices={[
            { label: t("common.cancel"), variant: "secondary", onClick: () => setConfirmDelete(false) },
            { label: t("common.delete"), variant: "danger", onClick: () => { deleteAthlete(athlete.id); navigate("athletes"); } },
          ]}
        />
      )}
    </div>
  );
}

function OverviewTab({ athlete, entries, competitions, navigate }: { athlete: Athlete; entries: RaceEntry[]; competitions: Competition[]; navigate: (page: string, arg?: string | null) => void }) {
  const { t } = useLane();
  const comp = (id: string) => competitions.find((c) => c.id === id);
  const today = new Date().toISOString().slice(0, 10);
  // Real next event: the athlete's soonest race dated today or later.
  const nextComp = entries
    .map((e) => comp(e.competitionId))
    .filter((c): c is Competition => !!c && (c.date || "") >= today)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))[0];
  const daysUntil = nextComp ? Math.round((+new Date(nextComp.date + "T00:00") - Date.now()) / 86400000) : null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
      <div className="col" style={{ gap: 12 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">{t("prof.biography")}</div></div>
          <div style={{ padding: 18, fontSize: 14, lineHeight: 1.6, color: "var(--fg-2)" }}>{athlete.bio || <span className="muted">{t("prof.noBio")}</span>}</div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">{t("prof.personalBests")}</div></div>
          <div style={{ padding: "8px 0" }}>
            {Object.keys(athlete.pb).length === 0 ? (
              <div className="text-sm muted" style={{ padding: "12px 18px" }}>{t("prof.noPb")}</div>
            ) : Object.entries(athlete.pb).map(([ev, mark]) => (
              <div key={ev} className="row" style={{ padding: "10px 18px", borderBottom: "1px solid var(--border-1)" }}>
                <div style={{ width: 100, color: "var(--fg-2)", fontWeight: 500 }}>{ev}</div>
                <div className="display fw-700 mono" style={{ fontSize: 22, color: "var(--accent)", letterSpacing: "-0.02em" }}>{mark || <span className="muted" style={{ fontSize: 13 }}>—</span>}</div>
                <div className="spacer" />
                {mark && <Badge variant="success" dot>PB</Badge>}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">{t("prof.season")}</div></div>
          <div style={{ padding: 18 }}>
            <SeasonChart entries={entries} competitions={competitions} color={athlete.color} />
          </div>
        </div>
      </div>

      <div className="col" style={{ gap: 12 }}>
        <div className="card card-pad" style={{ background: athlete.color + "0d", borderColor: athlete.color + "55" }}>
          <div className="text-xs mono fw-700" style={{ color: athlete.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("prof.nextEvent")}</div>
          {nextComp ? (
            <>
              <div className="display fw-700" style={{ fontSize: 18, marginTop: 6, letterSpacing: "-0.02em" }}>{nextComp.name}</div>
              <div className="text-sm muted" style={{ marginTop: 4 }}>{nextComp.date} · {t("prof.in")} {daysUntil} {daysUntil === 1 ? t("time.day") : t("time.days")}{nextComp.location ? ` · ${nextComp.location}` : ""}</div>
              <div className="row" style={{ marginTop: 14, gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={() => navigate("competition-detail", nextComp.id)}>{t("prof.viewEvent")}</button>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate("calendar")}><Icon name="calendar" size={13} /> {t("prof.openPlan")}</button>
              </div>
            </>
          ) : (
            <div className="text-sm muted" style={{ marginTop: 6 }}>{t("prof.noUpcoming")}</div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">{t("prof.personalDetails")}</div></div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <InfoRow icon="mail" label={t("prof.email")} value={athlete.contact.email} />
            <InfoRow icon="phone" label={t("prof.phone")} value={athlete.contact.phone} />
            <InfoRow icon="globe" label={t("prof.nationality")} value={athlete.nationality} />
            <InfoRow icon="user" label={t("prof.born")} value={`${athlete.dob}${athlete.placeOfBirth ? " · " + athlete.placeOfBirth : ""} (${athlete.age})`} />
            {athlete.residence && <InfoRow icon="globe" label={t("prof.residence")} value={athlete.residence} />}
            {athlete.maritalStatus && <InfoRow icon="users" label={t("prof.marital")} value={athlete.maritalStatus} />}
            {athlete.employment && <InfoRow icon="user" label={t("prof.employ")} value={athlete.employment} />}
            {athlete.taxCode && <InfoRow icon="fileText" label={t("prof.taxCode")} value={athlete.taxCode} />}
            {athlete.fidalNumber && <InfoRow icon="shield" label={t("prof.fidal")} value={athlete.fidalNumber} />}
            <InfoRow icon="users" label={t("prof.club")} value={athlete.club || "—"} />
            <InfoRow icon="user" label={t("prof.coach")} value={athlete.coach} />
            <InfoRow icon="calendar" label={t("prof.joined")} value={athlete.joined} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">{t("prof.physicalKit")}</div></div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <InfoRow icon="user" label={t("prof.height")} value={athlete.height ? `${athlete.height} ${athlete.heightUnit || "cm"}` : "—"} />
            <InfoRow icon="user" label={t("prof.weight")} value={athlete.weight ? `${athlete.weight} ${athlete.weightUnit || "kg"}` : "—"} />
            <InfoRow icon="star" label={t("prof.sponsor")} value={athlete.sponsor || "—"} />
            <InfoRow icon="star" label={t("prof.shoes")} value={athlete.shoeSize || "—"} />
            <InfoRow icon="star" label={t("prof.clothing")} value={athlete.clothingSize || "—"} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">{t("prof.tags")}</div></div>
          <div style={{ padding: 14, display: "flex", flexWrap: "wrap", gap: 5 }}>
            <Tag>{athlete.specialty}</Tag>
            <Tag>{athlete.squad}</Tag>
            <Tag>Diamond League</Tag>
            {athlete.medals.gold > 5 && <Tag>{t("prof.veteran")}</Tag>}
            {athlete.age < 25 && <Tag>U25</Tag>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Real season summary: how many races the athlete ran in each month of their
// season (derived from race entries), rather than a fabricated form line.
function SeasonChart({ entries, competitions, color }: { entries: RaceEntry[]; competitions: Competition[]; color: string }) {
  const { t, lang } = useLane();
  const loc = localeOf(lang);
  const monthOf = (id: string) => (competitions.find((c) => c.id === id)?.date || "").slice(0, 7);
  const months = entries.map((e) => monthOf(e.competitionId)).filter(Boolean);
  if (months.length === 0) {
    return <div className="text-sm muted" style={{ padding: "6px 2px" }}>{t("prof.noSeason")}</div>;
  }
  const uniq = Array.from(new Set(months)).sort();
  // Continuous month range from the first race to the last.
  const [fy, fm] = uniq[0].split("-").map(Number);
  const [ly, lm] = uniq[uniq.length - 1].split("-").map(Number);
  const range: string[] = [];
  let y = fy, m = fm;
  while ((y < ly || (y === ly && m <= lm)) && range.length < 24) {
    range.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  const counts = range.map((mo) => months.filter((x) => x === mo).length);
  const max = Math.max(1, ...counts);
  const labels = range.map((mo) => new Date(mo + "-01T00:00").toLocaleDateString(loc, { month: "short" }));
  return (
    <div>
      <div className="row" style={{ alignItems: "flex-end", gap: 8, height: 150 }}>
        {range.map((mo, i) => (
          <div key={mo} className="col" style={{ flex: 1, alignItems: "center", gap: 6, justifyContent: "flex-end", height: "100%" }}>
            <div className="text-xs mono fw-700" style={{ color, minHeight: 14 }}>{counts[i] || ""}</div>
            <div style={{ width: "60%", maxWidth: 40, height: `${(counts[i] / max) * 100}%`, minHeight: counts[i] ? 4 : 0, background: color, borderRadius: 4 }} />
            <div className="text-xs muted">{labels[i]}</div>
          </div>
        ))}
      </div>
      <div className="text-xs muted" style={{ marginTop: 10, textAlign: "center" }}>
        {t("prof.racesAcross", { r: months.length, rw: months.length === 1 ? t("word.race") : t("word.races"), m: uniq.length, mw: uniq.length === 1 ? t("word.month") : t("word.months") })}
      </div>
    </div>
  );
}

function AthleteCompetitionsTab({ entries, competitions }: { entries: RaceEntry[]; competitions: Competition[] }) {
  const { t } = useLane();
  const comp = (id: string) => competitions.find((c) => c.id === id);
  const compName = (id: string) => comp(id)?.name || id;
  if (entries.length === 0) {
    return (
      <div className="card">
        <EmptyState icon="trophy" title={t("prof.noEntries")} description={t("prof.noEntriesDesc")} />
      </div>
    );
  }
  // Chronological order (by competition date).
  const ordered = [...entries].sort((a, b) => (comp(a.competitionId)?.date || "").localeCompare(comp(b.competitionId)?.date || ""));
  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="card">
        <div className="card-header"><div className="card-title">{t("prof.entriesResults")}</div></div>
        <table className="table">
          <thead>
            <tr><th>{t("prof.competition")}</th><th>{t("prof.discipline")}</th><th>{t("common.status")}</th><th>{t("prof.place")}</th><th>{t("prof.time")}</th><th>{t("prof.wind")}</th><th>{t("prof.note")}</th></tr>
          </thead>
          <tbody>
            {ordered.map((e) => {
              const color = placementColor(e.position);
              return (
              <tr key={e.id} style={{ color: e.position != null ? color : undefined }}>
                <td className="fw-600" style={{ color: e.position != null ? color : undefined }}>{compName(e.competitionId)}</td>
                <td style={{ color: e.position != null ? color : undefined }}>{e.discipline}</td>
                <td><EntryStatusBadge status={e.status} /></td>
                <td>{e.position ? <span className="fw-700 mono">#{e.position}</span> : "—"}</td>
                <td className="display fw-700 mono" style={{ color: e.position != null ? color : "var(--accent)" }}>{e.time || "—"}</td>
                <td className="text-sm mono" style={{ color: e.position != null ? color : undefined }}>{e.wind || "—"}</td>
                <td className="text-xs" style={{ color: e.position != null ? color : "var(--fg-3)" }}>{e.note || ""}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AthleteHistoryTab() {
  const { t } = useLane();
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">{t("prof.activityLog")}</div></div>
      <EmptyState icon="calendar" title={t("prof.noActivityTitle")} description={t("prof.noActivityDesc")} />
    </div>
  );
}
