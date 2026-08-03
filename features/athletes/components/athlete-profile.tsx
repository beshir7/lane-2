"use client";

// Athlete detail profile with tabbed content.

import { Icon } from "@/components/icon";
import { useLane } from "@/components/lane-provider";
import { Avatar, Badge, ConfirmModal, EmptyState, Modal, Tabs, Tag } from "@/components/primitives";
import { BigStat, EntryStatusBadge, InfoRow, StatusBadge } from "@/components/shared";
import { localeOf } from "@/lib/i18n";
import type { Athlete, Competition, RaceEntry, Whereabouts } from "@/lib/types";
import { placementColor } from "@/utils";
import { daysUntil, toLocalIso, todayIso } from "@/utils/dates";
import { GENDER_COLOR } from "@/utils/athlete";
import { useState } from "react";
import { printAthleteDossier } from "../athlete-print";
import { AthleteFormModal } from "./athlete-form-modal";
import { TravelTab } from "./athlete-travel";

export function AthleteProfile({ athleteId }: { athleteId: string }) {
  const { athletes, competitions, entries, passports, visas, navigate, updateAthlete, deleteAthlete, t, lang } = useLane();
  const athlete = athletes.find((a) => a.id === athleteId);
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!athlete) return <div className="page">{t("prof.notFound")}</div>;

  const athleteEntries = entries.filter((e) => e.athleteId === athlete.id);
  const athletePassports = passports.filter((p) => p.athleteId === athlete.id);
  const athleteVisas = visas.filter((v) => v.athleteId === athlete.id);

  // Split the athlete's entries by their competition's date: the Competitions
  // tab shows what's still to come, History shows what's already been run.
  const cutoff = todayIso();
  const dateOf = (e: RaceEntry) => competitions.find((c) => c.id === e.competitionId)?.date || "";
  const upcomingEntries = athleteEntries.filter((e) => dateOf(e) >= cutoff);
  const pastEntries = athleteEntries.filter((e) => dateOf(e) && dateOf(e) < cutoff);

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate("athletes")} style={{ marginBottom: 12 }}>
        <Icon name="chevronLeft" size={13} /> {t("prof.allAthletes")}
      </button>

      <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
        <div style={{ height: 120, background: `linear-gradient(135deg, ${athlete.color}aa 0%, ${athlete.color}33 60%, transparent 100%)`, position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent 0 39px, rgba(255,255,255,0.06) 39px 40px)" }} />
          <div style={{ position: "absolute", top: 16, right: 18, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <button className="btn btn-secondary btn-sm" title={t("prof.printDossier")} onClick={() => printAthleteDossier({ athlete, entries, competitions, passports, visas, t, locale: localeOf(lang) })}>
              <Icon name="fileText" size={13} /> {t("common.print")}
            </button>
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
          { value: "competitions", label: t("prof.competitions"), count: upcomingEntries.length },
          { value: "travel", label: t("prof.passportsVisas"), count: athletePassports.length + athleteVisas.length },
          { value: "history", label: t("prof.history"), count: pastEntries.length },
          { value: "whereabouts", label: t("prof.whereabouts") },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "overview" && <OverviewTab athlete={athlete} entries={athleteEntries} competitions={competitions} navigate={navigate} />}
      {tab === "competitions" && <AthleteCompetitionsTab entries={upcomingEntries} competitions={competitions} navigate={navigate} upcoming />}
      {tab === "travel" && <TravelTab athleteId={athlete.id} passports={athletePassports} visas={athleteVisas} />}
      {tab === "history" && <AthleteCompetitionsTab entries={pastEntries} competitions={competitions} navigate={navigate} />}
      {tab === "whereabouts" && <WhereaboutsCard athlete={athlete} />}

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
  const today = todayIso();
  // Real next event: the athlete's soonest race dated today or later.
  const nextEntry = entries
    .filter((e) => { const c = comp(e.competitionId); return !!c && (c.date || "") >= today; })
    .sort((a, b) => (comp(a.competitionId)?.date || "").localeCompare(comp(b.competitionId)?.date || ""))[0];
  const nextComp = nextEntry ? comp(nextEntry.competitionId) : undefined;
  const nextDiscipline = nextEntry?.discipline || "";
  const daysAway = nextComp ? Math.max(0, daysUntil(nextComp.date) ?? 0) : null;
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
            ) : Object.entries(athlete.pb).map(([ev, mark]) => {
              const meta = athlete.pbMeta?.[ev];
              const source = meta?.competitionId ? comp(meta.competitionId) : undefined;
              return (
                <div key={ev} style={{ padding: "10px 18px", borderBottom: "1px solid var(--border-1)" }}>
                  <div className="row">
                    <div style={{ width: 100, color: "var(--fg-2)", fontWeight: 500 }}>{ev}</div>
                    <div className="display fw-700 mono" style={{ fontSize: 22, color: "var(--accent)", letterSpacing: "-0.02em" }}>{mark || <span className="muted" style={{ fontSize: 13 }}>—</span>}</div>
                    <div className="spacer" />
                    {meta?.place != null && <span className="text-xs fw-700 mono" style={{ color: placementColor(meta.place) }}>#{meta.place}</span>}
                    {mark && <Badge variant="success" dot>PB</Badge>}
                  </div>
                  {/* Where the mark was set — links straight to that competition. */}
                  {mark && (
                    <div className="row text-xs muted" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      {source ? (
                        <>
                          <span>{t("prof.pbSetAt")}</span>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: 0, height: "auto", color: "var(--accent)", fontSize: 12 }}
                            onClick={() => navigate("competition-detail", source.id)}
                          >
                            {source.name} <Icon name="external" size={10} />
                          </button>
                          {meta?.date && <span className="mono">· {meta.date}</span>}
                          {(meta?.venue || source.location) && <span>· {meta?.venue || source.location}</span>}
                        </>
                      ) : (
                        <span>{t("prof.pbNoSource")}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t("prof.rank")}</div>
              <div className="card-subtitle">{t("prof.rankDesc")}</div>
            </div>
          </div>
          <div style={{ padding: 18 }}>
            <RankChart entries={entries} competitions={competitions} color={athlete.color} onOpen={(id) => navigate("competition-detail", id)} />
          </div>
        </div>
      </div>

      <div className="col" style={{ gap: 12 }}>
        {/* Next event — the athlete's soonest upcoming competition. The whole
            card is clickable and opens that competition. */}
        <div
          className="card card-pad"
          onClick={nextComp ? () => navigate("competition-detail", nextComp.id) : undefined}
          role={nextComp ? "button" : undefined}
          tabIndex={nextComp ? 0 : undefined}
          onKeyDown={nextComp ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("competition-detail", nextComp.id); } } : undefined}
          style={{ background: athlete.color + "0d", borderColor: athlete.color + "55", cursor: nextComp ? "pointer" : undefined }}
        >
          <div className="text-xs mono fw-700" style={{ color: athlete.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("prof.nextEvent")}</div>
          {nextComp ? (
            <>
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <div className="display fw-700" style={{ fontSize: 18, letterSpacing: "-0.02em", flex: 1, minWidth: 0 }}>{nextComp.name}</div>
                <Icon name="chevronRight" size={16} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
              </div>
              <div className="text-sm muted" style={{ marginTop: 4 }}>
                {nextComp.date} · {daysAway === 0 ? t("notif.raceToday") : `${t("prof.in")} ${daysAway} ${daysAway === 1 ? t("time.day") : t("time.days")}`}{nextComp.location ? ` · ${nextComp.location}` : ""}
              </div>
              {nextDiscipline && <div className="text-xs muted" style={{ marginTop: 2 }}>{nextDiscipline}</div>}
              <div className="row" style={{ marginTop: 14, gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); navigate("competition-detail", nextComp.id); }}>{t("prof.viewEvent")}</button>
                <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); navigate("calendar"); }}><Icon name="calendar" size={13} /> {t("prof.openPlan")}</button>
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

// Rank graph: the athlete's finishing position in each competition they have a
// result for, oldest → newest. The y-axis is inverted so 1st sits at the top;
// each point is coloured by placement and links to its competition.
function RankChart({ entries, competitions, color, onOpen }: { entries: RaceEntry[]; competitions: Competition[]; color: string; onOpen: (competitionId: string) => void }) {
  const { t, lang } = useLane();
  const loc = localeOf(lang);
  const comp = (id: string) => competitions.find((c) => c.id === id);

  const points = entries
    .filter((e) => e.position != null && e.position > 0 && comp(e.competitionId)?.date)
    .map((e) => ({ entry: e, c: comp(e.competitionId)!, pos: e.position as number }))
    .sort((a, b) => a.c.date.localeCompare(b.c.date));

  if (points.length === 0) {
    return <div className="text-sm muted" style={{ padding: "6px 2px" }}>{t("prof.noRank")}</div>;
  }

  const W = 640, H = 190, padL = 30, padR = 12, padT = 12, padB = 34;
  const worst = Math.max(3, ...points.map((p) => p.pos));
  const n = points.length;
  const x = (i: number) => padL + (n === 1 ? (W - padL - padR) / 2 : (i / (n - 1)) * (W - padL - padR));
  // Inverted: position 1 at the top.
  const y = (pos: number) => padT + ((pos - 1) / Math.max(1, worst - 1)) * (H - padT - padB);
  const ticks = Array.from(new Set([1, Math.ceil(worst / 2), worst])).filter((v) => v >= 1);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.pos)}`).join(" ");

  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 190 }}>
        {ticks.map((v) => (
          <g key={v}>
            <line className="grid-line" x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} />
            <text x={padL - 7} y={y(v) + 3} textAnchor="end">{v}</text>
          </g>
        ))}
        {n > 1 && <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((p, i) => (
          <g key={p.entry.id} onClick={() => onOpen(p.c.id)} style={{ cursor: "pointer" }}>
            <title>{`${p.c.name} · ${p.c.date} · #${p.pos}${p.entry.time ? " · " + p.entry.time : ""}`}</title>
            <circle cx={x(i)} cy={y(p.pos)} r="9" fill="transparent" />
            <circle cx={x(i)} cy={y(p.pos)} r="4.5" fill={placementColor(p.pos)} stroke="var(--bg-1)" strokeWidth="2" />
            <text x={x(i)} y={H - 12} textAnchor="middle">
              {new Date(p.c.date + "T00:00").toLocaleDateString(loc, { month: "short", day: "numeric" })}
            </text>
          </g>
        ))}
      </svg>
      <div className="text-xs muted" style={{ marginTop: 6, textAlign: "center" }}>
        {t("prof.racesAcross", {
          r: points.length,
          rw: points.length === 1 ? t("word.competition") : t("word.competitions"),
          m: new Set(points.map((p) => p.c.date.slice(0, 7))).size,
          mw: new Set(points.map((p) => p.c.date.slice(0, 7))).size === 1 ? t("word.month") : t("word.months"),
        })}
      </div>
    </div>
  );
}

// Anti-doping whereabouts: current address + the daily window the athlete is
// available for an out-of-competition test.
function WhereaboutsCard({ athlete }: { athlete: Athlete }) {
  const { t, updateAthlete } = useLane();
  const [editing, setEditing] = useState(false);
  const w = athlete.whereabouts;
  const hasData = !!(w && (w.address || w.availableFrom));

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title row" style={{ gap: 6 }}>
          <Icon name="pin" size={14} style={{ color: "var(--accent)" }} />
          {t("prof.whereabouts")}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
          <Icon name={hasData ? "edit" : "plus"} size={13} /> {hasData ? t("prof.whereaboutsUpdate") : t("prof.whereaboutsSet")}
        </button>
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="text-sm muted">{t("prof.whereaboutsDesc")}</div>
        {!hasData ? (
          <div className="text-sm muted">{t("prof.whereaboutsNone")}</div>
        ) : (
          <>
            <InfoRow icon="pin" label={t("prof.waAddress")} value={w?.address || "—"} />
            <InfoRow
              icon="clock"
              label={t("prof.waAvailable")}
              value={w?.availableFrom || w?.availableTo ? <span className="mono">{w?.availableFrom || "—"} → {w?.availableTo || "—"}</span> : "—"}
            />
            {(w?.fromDate || w?.toDate) && (
              <InfoRow icon="calendar" label={t("prof.waPeriodFrom")} value={<span className="mono">{w?.fromDate || "—"} → {w?.toDate || "—"}</span>} />
            )}
            {w?.note && <InfoRow icon="fileText" label={t("prof.waNote")} value={w.note} />}
            {w?.updated && <div className="text-xs muted mono">{t("prof.waUpdated")} {w.updated}</div>}
          </>
        )}
      </div>
      {editing && (
        <WhereaboutsModal
          initial={w}
          onClose={() => setEditing(false)}
          onSave={(next) => { updateAthlete(athlete.id, { whereabouts: next }); setEditing(false); }}
        />
      )}
    </div>
  );
}

function WhereaboutsModal({ initial, onClose, onSave }: { initial?: Whereabouts; onClose: () => void; onSave: (w: Whereabouts) => void }) {
  const { t } = useLane();
  const [form, setForm] = useState<Whereabouts>({
    address: initial?.address || "",
    availableFrom: initial?.availableFrom || "06:00",
    availableTo: initial?.availableTo || "07:00",
    fromDate: initial?.fromDate || "",
    toDate: initial?.toDate || "",
    note: initial?.note || "",
    updated: initial?.updated || "",
  });
  const set = (k: keyof Whereabouts, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = () => {
    const d = new Date();
    onSave({ ...form, updated: toLocalIso(d) });
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={t("prof.whereabouts")}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn btn-primary" onClick={submit}>{t("common.save")}</button>
        </>
      }
    >
      <div className="col" style={{ gap: 14 }}>
        <div className="text-sm muted">{t("prof.whereaboutsDesc")}</div>
        <div className="field">
          <label className="field-label">{t("prof.waAddress")}</label>
          <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} autoFocus />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field"><label className="field-label">{t("prof.waFrom")}</label><input type="time" className="input" value={form.availableFrom} onChange={(e) => set("availableFrom", e.target.value)} /></div>
          <div className="field"><label className="field-label">{t("prof.waTo")}</label><input type="time" className="input" value={form.availableTo} onChange={(e) => set("availableTo", e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field"><label className="field-label">{t("prof.waPeriodFrom")}</label><input type="date" className="input" value={form.fromDate} onChange={(e) => set("fromDate", e.target.value)} /></div>
          <div className="field"><label className="field-label">{t("prof.waPeriodTo")}</label><input type="date" className="input" value={form.toDate} onChange={(e) => set("toDate", e.target.value)} /></div>
        </div>
        <div className="field">
          <label className="field-label">{t("prof.waNote")}</label>
          <textarea className="input" value={form.note} onChange={(e) => set("note", e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

// Shared by the Competitions tab (upcoming) and History tab (already run).
// Every row opens the competition it belongs to.
function AthleteCompetitionsTab({
  entries,
  competitions,
  navigate,
  upcoming,
}: {
  entries: RaceEntry[];
  competitions: Competition[];
  navigate: (page: string, arg?: string | null) => void;
  upcoming?: boolean;
}) {
  const { t } = useLane();
  const comp = (id: string) => competitions.find((c) => c.id === id);
  if (entries.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={upcoming ? "calendar" : "trophy"}
          title={upcoming ? t("prof.noUpcomingComps") : t("prof.noPastComps")}
          description={upcoming ? t("prof.noUpcomingCompsDesc") : t("prof.noPastCompsDesc")}
        />
      </div>
    );
  }
  // Upcoming: soonest first. History: most recent first.
  const ordered = [...entries].sort((a, b) => {
    const da = comp(a.competitionId)?.date || "", db = comp(b.competitionId)?.date || "";
    return upcoming ? da.localeCompare(db) : db.localeCompare(da);
  });
  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="card">
        <div className="card-header"><div className="card-title">{upcoming ? t("prof.upcomingComps") : t("prof.pastComps")}</div></div>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 96 }}>{t("athlete.date")}</th>
              <th>{t("prof.competition")}</th>
              <th>{t("prof.discipline")}</th>
              <th>{t("common.status")}</th>
              {!upcoming && <><th style={{ width: 62 }}>{t("prof.place")}</th><th style={{ width: 90 }}>{t("prof.time")}</th><th style={{ width: 70 }}>{t("prof.wind")}</th><th>{t("prof.note")}</th></>}
            </tr>
          </thead>
          <tbody>
            {ordered.map((e) => {
              const c = comp(e.competitionId);
              const color = e.position != null ? placementColor(e.position) : undefined;
              return (
                <tr
                  key={e.id}
                  onClick={() => c && navigate("competition-detail", c.id)}
                  title={c ? t("prof.openCompetition") : undefined}
                  style={{ color, cursor: c ? "pointer" : undefined }}
                >
                  <td className="text-sm mono muted" style={{ whiteSpace: "nowrap" }}>{c?.date || "—"}</td>
                  <td className="fw-600" style={{ color }}>
                    <div className="row" style={{ gap: 6 }}>
                      <span>{c?.name || e.competitionId}</span>
                      <Icon name="chevronRight" size={12} style={{ color: "var(--fg-3)" }} />
                    </div>
                    {c?.location && <div className="text-xs muted">{c.location}</div>}
                  </td>
                  <td style={{ color }}>{e.discipline}</td>
                  <td onClick={(ev) => ev.stopPropagation()}><EntryStatusBadge status={e.status} /></td>
                  {!upcoming && (
                    <>
                      <td>{e.position ? <span className="fw-700 mono">#{e.position}</span> : "—"}</td>
                      <td className="display fw-700 mono" style={{ color: color || "var(--accent)" }}>{e.time || "—"}</td>
                      <td className="text-sm mono" style={{ color }}>{e.wind || "—"}</td>
                      <td className="text-xs" style={{ color: color || "var(--fg-3)" }}>{e.note || ""}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
