"use client";

// Athlete detail profile with tabbed content.

import React, { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Badge, EmptyState, Tabs, Tag } from "@/components/primitives";
import { DateStack, EventTypeBadge, InfoRow, StatusBadge, BigStat, formatHour, EntryStatusBadge } from "@/components/shared";
import { AthleteFormModal } from "./athlete-form-modal";
import { TravelTab } from "./athlete-travel";
import { useLane } from "@/components/lane-provider";
import type { Athlete, CalendarEvent, Competition, RaceEntry } from "@/lib/types";

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
            <button className="btn btn-secondary btn-sm"><Icon name="share" size={13} /> Share</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}><Icon name="edit" size={13} /> Edit</button>
            <button className="btn btn-secondary btn-sm"><Icon name="moreV" size={13} /></button>
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
          { value: "performance", label: "Performance", count: Object.keys(athlete.pb).length },
          { value: "competitions", label: "Competitions", count: athleteEntries.length },
          { value: "travel", label: "Passports & visas", count: athletePassports.length + athleteVisas.length },
          { value: "schedule", label: "Schedule", count: athleteEvents.length },
          { value: "history", label: "History" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "overview" && <OverviewTab athlete={athlete} />}
      {tab === "performance" && <PerformanceTab athlete={athlete} peers={athletes} />}
      {tab === "competitions" && <AthleteCompetitionsTab entries={athleteEntries} competitions={competitions} />}
      {tab === "travel" && <TravelTab athleteId={athlete.id} passports={athletePassports} visas={athleteVisas} />}
      {tab === "schedule" && <AthleteScheduleTab athleteEvents={athleteEvents} />}
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

function OverviewTab({ athlete }: { athlete: Athlete }) {
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
          <div className="card-header"><div className="card-title">Season form</div></div>
          <div style={{ padding: 18 }}>
            <FormChart progress={athlete.progress} color={athlete.color} />
          </div>
        </div>
      </div>

      <div className="col" style={{ gap: 12 }}>
        <div className="card card-pad" style={{ background: athlete.color + "0d", borderColor: athlete.color + "55" }}>
          <div className="text-xs mono fw-700" style={{ color: athlete.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>Next event</div>
          <div className="display fw-700" style={{ fontSize: 18, marginTop: 6, letterSpacing: "-0.02em" }}>{athlete.nextEvent}</div>
          <div className="text-sm muted" style={{ marginTop: 4 }}>14 days · entries close in 4 days</div>
          <div className="row" style={{ marginTop: 14, gap: 6 }}>
            <button className="btn btn-primary btn-sm">View event</button>
            <button className="btn btn-secondary btn-sm"><Icon name="calendar" size={13} /> Add to plan</button>
          </div>
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
            <InfoRow icon="user" label="Height" value={athlete.height ? `${athlete.height} cm` : "—"} />
            <InfoRow icon="user" label="Weight" value={athlete.weight ? `${athlete.weight} kg` : "—"} />
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

function FormChart({ progress, color }: { progress: number; color: string }) {
  const data = useMemo(() => {
    const out: number[] = [];
    let v = progress - 25 + Math.random() * 5;
    for (let i = 0; i < 12; i++) {
      v += (Math.random() - 0.35) * 6;
      v = Math.max(20, Math.min(100, v));
      out.push(v);
    }
    out[11] = progress;
    return out;
  }, [progress]);
  const W = 720, H = 220, padL = 36, padR = 14, padT = 14, padB = 28;
  const x = (i: number) => padL + (i / (data.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - 0) / 100) * (H - padT - padB);
  const path = data.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 220 }}>
      <defs>
        <linearGradient id="fc1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line className="grid-line" x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} />
          <text x={padL - 8} y={y(v) + 3} textAnchor="end">{v}</text>
        </g>
      ))}
      {["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "Now"].map((m, i) => (
        <text key={i} x={x(i)} y={H - 10} textAnchor="middle">{m}</text>
      ))}
      <path d={`${path} L ${x(data.length - 1)} ${H - padB} L ${padL} ${H - padB} Z`} fill="url(#fc1)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === data.length - 1 ? 5 : 3} fill={i === data.length - 1 ? color : "var(--bg-1)"} stroke={color} strokeWidth="2" />
      ))}
    </svg>
  );
}

function PerformanceTab({ athlete, peers }: { athlete: Athlete; peers: Athlete[] }) {
  const compare = peers.filter((a) => a.category === athlete.category).slice(0, 4);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div className="card">
        <div className="card-header"><div className="card-title">Performance vs squad average</div></div>
        <div style={{ padding: 22 }}><RadarChart athlete={athlete} /></div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Compare with peers</div></div>
        <div style={{ padding: "8px 0" }}>
          {compare.map((a) => (
            <div key={a.id} className="row" style={{ padding: "10px 18px", gap: 12 }}>
              <Avatar name={a.first + " " + a.last} color={a.color} size="sm" />
              <div style={{ flex: 1 }}>
                <div className="fw-600">{a.first} {a.last}</div>
                <div className="text-xs muted">{a.specialty}</div>
              </div>
              <div className="display fw-700 mono" style={{ fontSize: 18, color: a.id === athlete.id ? "var(--accent)" : "var(--fg-1)", letterSpacing: "-0.02em" }}>{a.progress}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RadarChart({ athlete }: { athlete: Athlete }) {
  const axes = [
    { k: "Speed", v: athlete.progress, avg: 65 },
    { k: "Endurance", v: athlete.progress - 8, avg: 70 },
    { k: "Strength", v: athlete.progress + 5, avg: 60 },
    { k: "Technique", v: athlete.progress + 2, avg: 72 },
    { k: "Mental", v: athlete.progress - 4, avg: 64 },
    { k: "Recovery", v: athlete.progress + 6, avg: 68 },
  ];
  const W = 360, H = 340;
  const cx = W / 2, cy = H / 2;
  const R = 110;
  const angles = axes.map((_, i) => (i / axes.length) * Math.PI * 2 - Math.PI / 2);
  const point = (val: number, i: number): [number, number] => {
    const r = (val / 100) * R;
    return [cx + Math.cos(angles[i]) * r, cy + Math.sin(angles[i]) * r];
  };
  const poly = (vals: number[]) => vals.map((v, i) => point(v, i).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%" }}>
      {[25, 50, 75, 100].map((p) => (
        <polygon key={p} fill="none" stroke="var(--border-1)" strokeWidth="1" points={poly(axes.map(() => p))} />
      ))}
      {axes.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={point(100, i)[0]} y2={point(100, i)[1]} stroke="var(--border-1)" />
      ))}
      <polygon fill="rgba(245, 177, 76, 0.15)" stroke="#f5b14c" strokeWidth="1.5" strokeDasharray="3 3" points={poly(axes.map((a) => a.avg))} />
      <polygon fill={athlete.color + "33"} stroke={athlete.color} strokeWidth="2" points={poly(axes.map((a) => a.v))} />
      {axes.map((a, i) => {
        const p = point(115, i);
        return (
          <g key={i}>
            <text x={p[0]} y={p[1]} textAnchor="middle" dy="4" style={{ font: "600 11px var(--font-ui)", fill: "var(--fg-2)" }}>{a.k}</text>
          </g>
        );
      })}
    </svg>
  );
}

function AthleteCompetitionsTab({ entries, competitions }: { entries: RaceEntry[]; competitions: Competition[] }) {
  const compName = (id: string) => competitions.find((c) => c.id === id)?.name || id;
  if (entries.length === 0) {
    return (
      <div className="card">
        <EmptyState icon="trophy" title="No race entries" description="This athlete has not been entered into any competition yet." />
      </div>
    );
  }
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Race entries & results</div></div>
      <table className="table">
        <thead>
          <tr><th>Competition</th><th>Discipline</th><th>Status</th><th>Place</th><th>Time</th><th>Wind</th><th>Note</th></tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td className="fw-600">{compName(e.competitionId)}</td>
              <td>{e.discipline}</td>
              <td><EntryStatusBadge status={e.status} /></td>
              <td>{e.position ? <Badge variant={e.position === 1 ? "warning" : e.position <= 3 ? "info" : ""}>#{e.position}</Badge> : "—"}</td>
              <td className="display fw-700 mono" style={{ color: "var(--accent)" }}>{e.time || "—"}</td>
              <td className="text-sm mono">{e.wind || "—"}</td>
              <td className="text-xs muted">{e.note || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AthleteScheduleTab({ athleteEvents }: { athleteEvents: CalendarEvent[] }) {
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Upcoming schedule</div></div>
      <div style={{ padding: "8px 0" }}>
        {athleteEvents.length === 0 ? (
          <EmptyState icon="calendar" title="Nothing scheduled" description="Add a training session, competition or travel to this athlete's calendar." />
        ) : (
          athleteEvents.map((e) => (
            <div key={e.id} className="row" style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-1)", gap: 14 }}>
              <DateStack date={e.date} />
              <div style={{ flex: 1 }}>
                <div className="fw-600">{e.title}</div>
                <div className="text-sm muted">{formatHour(e.startHour)} · {e.location}</div>
              </div>
              <EventTypeBadge category={e.category} />
            </div>
          ))
        )}
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
