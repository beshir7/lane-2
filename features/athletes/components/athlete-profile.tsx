"use client";

// Athlete detail profile with tabbed content.

import { Icon } from "@/components/icon";
import { useLane } from "@/components/lane-provider";
import { Avatar, Badge, EmptyState, Tabs, Tag } from "@/components/primitives";
import { BigStat, EntryStatusBadge, InfoRow, StatusBadge } from "@/components/shared";
import type { Athlete, Competition, RaceEntry } from "@/lib/types";
import { placementColor } from "@/utils";
import { useState } from "react";
import { AthleteFormModal } from "./athlete-form-modal";
import { TravelTab } from "./athlete-travel";

const GENDER_COLOR: Record<string, string> = { F: "#f55b6e", M: "#5b6ef5", X: "var(--fg-1)" };

export function AthleteProfile({ athleteId }: { athleteId: string }) {
  const { athletes, events, competitions, entries, passports, visas, navigate, updateAthlete, deleteAthlete } = useLane();
  const athlete = athletes.find((a) => a.id === athleteId);
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);

  if (!athlete) return <div className="page">Athlete not found</div>;

  const athleteEvents = events.filter((e) => e.athletes.includes(athlete.id));
  const athleteEntries = entries.filter((e) => e.athleteId === athlete.id);
  const athletePassports = passports.filter((p) => p.athleteId === athlete.id);
  const athleteVisas = visas.filter((v) => v.athleteId === athlete.id);

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate("athletes")} style={{ marginBottom: 12 }}>
        <Icon name="chevronLeft" size={13} /> All athletes
      </button>

      <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
        <div style={{ height: 120, background: `linear-gradient(135deg, ${athlete.color}aa 0%, ${athlete.color}33 60%, transparent 100%)`, position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent 0 39px, rgba(255,255,255,0.06) 39px 40px)" }} />
          <div style={{ position: "absolute", top: 16, right: 18, display: "flex", gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}><Icon name="edit" size={13} /> Edit</button>
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
                <span className="text-sm muted">{athlete.age} yrs</span>
                {athlete.sponsor && <><span className="text-sm muted">·</span><span className="text-sm muted">{athlete.sponsor}</span></>}
                <span className="text-sm muted">·</span>
                <span className="text-sm muted">Coach {athlete.coach}</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "auto auto auto", gap: 22, paddingBottom: 6 }}>
              <BigStat v={athlete.medals.gold} l="Gold" c="#f5b14c" />
              <BigStat v={athlete.medals.silver} l="Silver" c="#c9d3df" />
              <BigStat v={athlete.medals.bronze} l="Bronze" c="#c08c5e" />
            </div>
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "competitions", label: "Competitions", count: athleteEntries.length },
          { value: "travel", label: "Passports & visas", count: athletePassports.length + athleteVisas.length },
          { value: "history", label: "History" },
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
    </div>
  );
}

function OverviewTab({ athlete, entries, competitions, navigate }: { athlete: Athlete; entries: RaceEntry[]; competitions: Competition[]; navigate: (page: string, arg?: string | null) => void }) {
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
          <div className="card-header"><div className="card-title">Biography</div></div>
          <div style={{ padding: 18, fontSize: 14, lineHeight: 1.6, color: "var(--fg-2)" }}>{athlete.bio || <span className="muted">No biography yet.</span>}</div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Personal bests</div></div>
          <div style={{ padding: "8px 0" }}>
            {Object.keys(athlete.pb).length === 0 ? (
              <div className="text-sm muted" style={{ padding: "12px 18px" }}>No personal bests recorded. Add disciplines when editing the athlete.</div>
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
          <div className="card-header"><div className="card-title">Season</div></div>
          <div style={{ padding: 18 }}>
            <SeasonChart entries={entries} competitions={competitions} color={athlete.color} />
          </div>
        </div>
      </div>

      <div className="col" style={{ gap: 12 }}>
        <div className="card card-pad" style={{ background: athlete.color + "0d", borderColor: athlete.color + "55" }}>
          <div className="text-xs mono fw-700" style={{ color: athlete.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>Next event</div>
          {nextComp ? (
            <>
              <div className="display fw-700" style={{ fontSize: 18, marginTop: 6, letterSpacing: "-0.02em" }}>{nextComp.name}</div>
              <div className="text-sm muted" style={{ marginTop: 4 }}>{nextComp.date} · in {daysUntil} day{daysUntil === 1 ? "" : "s"}{nextComp.location ? ` · ${nextComp.location}` : ""}</div>
              <div className="row" style={{ marginTop: 14, gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={() => navigate("competition-detail", nextComp.id)}>View event</button>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate("calendar")}><Icon name="calendar" size={13} /> Open plan</button>
              </div>
            </>
          ) : (
            <div className="text-sm muted" style={{ marginTop: 6 }}>No upcoming events. Enter this athlete into a race and it will show here.</div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Personal details</div></div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <InfoRow icon="mail" label="Email" value={athlete.contact.email} />
            <InfoRow icon="phone" label="Phone" value={athlete.contact.phone} />
            <InfoRow icon="globe" label="Nationality" value={athlete.nationality} />
            <InfoRow icon="user" label="Born" value={`${athlete.dob}${athlete.placeOfBirth ? " · " + athlete.placeOfBirth : ""} (${athlete.age})`} />
            {athlete.residence && <InfoRow icon="globe" label="Residence" value={athlete.residence} />}
            {athlete.maritalStatus && <InfoRow icon="users" label="Marital" value={athlete.maritalStatus} />}
            {athlete.employment && <InfoRow icon="user" label="Employ" value={athlete.employment} />}
            {athlete.taxCode && <InfoRow icon="fileText" label="Tax code" value={athlete.taxCode} />}
            {athlete.fidalNumber && <InfoRow icon="shield" label="FIDAL #" value={athlete.fidalNumber} />}
            <InfoRow icon="users" label="Club" value={athlete.club || "—"} />
            <InfoRow icon="user" label="Coach" value={athlete.coach} />
            <InfoRow icon="calendar" label="Joined" value={athlete.joined} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Physical & kit</div></div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <InfoRow icon="user" label="Height" value={athlete.height ? `${athlete.height} ${athlete.heightUnit || "cm"}` : "—"} />
            <InfoRow icon="user" label="Weight" value={athlete.weight ? `${athlete.weight} ${athlete.weightUnit || "kg"}` : "—"} />
            <InfoRow icon="star" label="Sponsor" value={athlete.sponsor || "—"} />
            <InfoRow icon="star" label="Shoes" value={athlete.shoeSize || "—"} />
            <InfoRow icon="star" label="Clothing" value={athlete.clothingSize || "—"} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Tags</div></div>
          <div style={{ padding: 14, display: "flex", flexWrap: "wrap", gap: 5 }}>
            <Tag>{athlete.specialty}</Tag>
            <Tag>{athlete.squad}</Tag>
            <Tag>Diamond League</Tag>
            {athlete.medals.gold > 5 && <Tag>Veteran</Tag>}
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
  const monthOf = (id: string) => (competitions.find((c) => c.id === id)?.date || "").slice(0, 7);
  const months = entries.map((e) => monthOf(e.competitionId)).filter(Boolean);
  if (months.length === 0) {
    return <div className="text-sm muted" style={{ padding: "6px 2px" }}>No races entered this season yet.</div>;
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
  const labels = range.map((mo) => new Date(mo + "-01T00:00").toLocaleDateString("en-US", { month: "short" }));
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
        {months.length} race{months.length === 1 ? "" : "s"} across {uniq.length} month{uniq.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}

function AthleteCompetitionsTab({ entries, competitions }: { entries: RaceEntry[]; competitions: Competition[] }) {
  const comp = (id: string) => competitions.find((c) => c.id === id);
  const compName = (id: string) => comp(id)?.name || id;
  if (entries.length === 0) {
    return (
      <div className="card">
        <EmptyState icon="trophy" title="No race entries" description="This athlete has not been entered into any competition yet." />
      </div>
    );
  }
  // Chronological order (by competition date).
  const ordered = [...entries].sort((a, b) => (comp(a.competitionId)?.date || "").localeCompare(comp(b.competitionId)?.date || ""));
  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="card">
        <div className="card-header"><div className="card-title">Race entries & results</div></div>
        <table className="table">
          <thead>
            <tr><th>Competition</th><th>Discipline</th><th>Status</th><th>Place</th><th>Time</th><th>Wind</th><th>Note</th></tr>
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
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Activity log</div></div>
      <EmptyState icon="calendar" title="No activity yet" description="Edits, uploads and results for this athlete will appear here." />
    </div>
  );
}
