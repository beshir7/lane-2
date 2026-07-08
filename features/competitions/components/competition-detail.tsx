"use client";

// Race card — organizer, disciplines, per-discipline athlete entries with the
// entry workflow (proposed → waiting → accepted → ok) and results.

import { Icon } from "@/components/icon";
import { useLane } from "@/components/lane-provider";
import { Avatar, Badge, EmptyState, Modal, Tabs } from "@/components/primitives";
import { BigStat, DateStack, EntryStatusBadge, InfoRow } from "@/components/shared";
import type { Athlete, Competition, EntryStatus, MeetingDiscipline, RaceEntry } from "@/lib/types";
import { ALL_DISCIPLINES } from "@/lib/reference";
import { downloadCsv } from "@/utils";
import React, { useState } from "react";
import { CompStatusBadge } from "./competitions-screen";

const ENTRY_STATUSES: { v: EntryStatus; l: string }[] = [
  { v: "proposed", l: "Proposed" },
  { v: "waiting", l: "Waiting list" },
  { v: "accepted", l: "Accepted" },
  { v: "ok", l: "OK" },
];

export function CompetitionDetail({ competitionId }: { competitionId: string }) {
  const { competitions, athletes, entries, organizers, navigate, t } = useLane();
  const competition = competitions.find((c) => c.id === competitionId);
  const [tab, setTab] = useState("overview");
  const [showAdd, setShowAdd] = useState(false);
  const [showDisc, setShowDisc] = useState(false);
  const [foglio, setFoglio] = useState<null | { withAthletes: boolean }>(null);
  const [resultFor, setResultFor] = useState<RaceEntry | null>(null);

  if (!competition) return <div className="page">{t("race.notFound")}</div>;

  // Race sheet (foglio gara): ask whether to include the athlete list (photo_15).
  const openFoglio = () => setFoglio({ withAthletes: window.confirm(t("race.foglioConfirm")) });

  const compEntries = entries.filter((e) => e.competitionId === competition.id);
  const organizer = organizers.find((o) => o.id === competition.organizerId);
  const disciplines: MeetingDiscipline[] = competition.disciplines?.length
    ? competition.disciplines
    : competition.events.map((e) => ({ discipline: e, gender: "M" as const, date: competition.date }));
  const withResults = compEntries.filter((e) => e.position != null || e.time);

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate("competitions")} style={{ marginBottom: 12 }}>
        <Icon name="chevronLeft" size={13} /> {t("race.all")}
      </button>

      <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: 28, background: "radial-gradient(circle at 80% 50%, rgba(107, 125, 255, 0.15) 0%, transparent 60%), linear-gradient(135deg, var(--bg-1), var(--bg-2))", position: "relative", borderBottom: "1px solid var(--border-1)" }}>
          <div className="row" style={{ alignItems: "flex-start", gap: 24, position: "relative" }}>
            <DateStack date={competition.date} />
            <div style={{ flex: 1 }}>
              <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                <CompStatusBadge status={competition.status} />
                <Badge variant={competition.tier === "tier-1" ? "accent" : ""}>{competition.type}</Badge>
                {competition.level && <Badge>{competition.level}</Badge>}
                {competition.category && <Badge>{competition.category}</Badge>}
              </div>
              <h2 className="display" style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 8 }}>{competition.name}</h2>
              <div className="text-md muted" style={{ marginTop: 4 }}>{competition.location}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "auto auto auto", gap: 28 }}>
              <CompStat n={compEntries.length} l="Entries" />
              <CompStat n={disciplines.length} l="Disciplines" />
              <CompStat n={withResults.length} l="Results" />
            </div>
            <div className="col" style={{ gap: 6 }}>
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> {t("race.addAthletes")}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDisc(true)}><Icon name="layers" size={13} /> {t("race.disciplines")}</button>
              <button className="btn btn-secondary btn-sm" onClick={openFoglio}><Icon name="fileText" size={13} /> {t("race.sheet")}</button>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "entries", label: "Entries", count: compEntries.length },
          { value: "results", label: "Results", count: withResults.length },
          { value: "disciplines", label: "Disciplines", count: disciplines.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "overview" && <CompOverviewTab c={competition} organizer={organizer} disciplines={disciplines} entryCount={compEntries.length} />}
      {tab === "entries" && <CompEntriesTab entries={compEntries} athletes={athletes} onAdd={() => setShowAdd(true)} onResult={setResultFor} />}
      {tab === "results" && <CompResultsTab entries={withResults} athletes={athletes} />}
      {tab === "disciplines" && <CompDisciplinesTab disciplines={disciplines} entries={compEntries} athletes={athletes} />}

      {showAdd && <AddEntryModal competition={competition} disciplines={disciplines} athletes={athletes} onClose={() => setShowAdd(false)} />}
      {showDisc && <DisciplineManagerModal competition={competition} onClose={() => setShowDisc(false)} />}
      {resultFor && <ResultModal entry={resultFor} athletes={athletes} onClose={() => setResultFor(null)} />}
      {foglio && <FoglioModal competition={competition} organizer={organizer} entries={compEntries} athletes={athletes} withAthletes={foglio.withAthletes} onClose={() => setFoglio(null)} />}
    </div>
  );
}

// ---- Race sheet (printable "foglio gara", caption 25/26) ------------------
function FoglioModal({ competition, organizer, entries, athletes, withAthletes, onClose }: { competition: Competition; organizer?: { name: string; phone: string; email: string }; entries: RaceEntry[]; athletes: Athlete[]; withAthletes: boolean; onClose: () => void }) {
  const nameOf = (id: string) => { const a = athletes.find((x) => x.id === id); return a ? `${a.first} ${a.last}` : id; };
  const exportCsv = () => downloadCsv(`foglio-${competition.short || competition.name}`, entries.map((e) => ({
    athlete: nameOf(e.athleteId), discipline: e.discipline, gender: e.gender, status: e.status, place: e.position ?? "", time: e.time,
  })));
  return (
    <Modal open onClose={onClose} size="lg" title="Race sheet" footer={<><button className="btn btn-secondary" onClick={exportCsv}><Icon name="download" size={13} /> Export CSV</button><button className="btn btn-secondary" onClick={() => window.print()}><Icon name="fileText" size={13} /> Print</button><button className="btn btn-primary" onClick={onClose}>Close</button></>}>
      <div className="col" style={{ gap: 14 }}>
        <div>
          <div className="display fw-700" style={{ fontSize: 20 }}>{competition.name}</div>
          <div className="text-sm muted">{competition.location} · {competition.date}{competition.date !== competition.endDate ? ` → ${competition.endDate}` : ""} · {competition.level || competition.type}</div>
        </div>
        {organizer && (
          <div className="card card-pad">
            <div className="text-xs mono fw-700 muted" style={{ textTransform: "uppercase" }}>Organizer</div>
            <div className="fw-600" style={{ marginTop: 4 }}>{organizer.name}</div>
            <div className="text-sm muted">{organizer.phone} · {organizer.email}</div>
          </div>
        )}
        {withAthletes && (
        <table className="table">
          <thead><tr><th>Athlete</th><th>Discipline</th><th>Status</th><th>Place</th><th>Time</th></tr></thead>
          <tbody>
            {entries.length === 0 ? <tr><td colSpan={5} className="text-sm muted" style={{ padding: 14 }}>No entries.</td></tr> : entries.map((e) => (
              <tr key={e.id}>
                <td className="fw-600">{nameOf(e.athleteId)}</td>
                <td>{e.discipline} ({e.gender})</td>
                <td><EntryStatusBadge status={e.status} /></td>
                <td>{e.position ?? "—"}</td>
                <td className="mono">{e.time || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </Modal>
  );
}

function CompStat({ n, l }: { n: React.ReactNode; l: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="display fw-700" style={{ fontSize: 28, color: "var(--fg-1)", letterSpacing: "-0.03em", lineHeight: 1 }}>{n}</div>
      <div className="text-xs muted" style={{ textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>{l}</div>
    </div>
  );
}

function CompOverviewTab({ c, organizer, disciplines, entryCount }: { c: Competition; organizer?: { name: string; phone: string; email: string; nation: string }; disciplines: MeetingDiscipline[]; entryCount: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
      <div className="col" style={{ gap: 12 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Disciplines</div></div>
          <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
            {disciplines.map((d, i) => (
              <div key={i} className="card card-pad" style={{ padding: 12, textAlign: "center" }}>
                <div className="display fw-700" style={{ fontSize: 14 }}>{d.discipline}</div>
                <div className="text-xs muted mono" style={{ marginTop: 4 }}>{d.gender === "W" ? "Women" : "Men"}</div>
              </div>
            ))}
          </div>
        </div>

        {c.status === "completed" && c.summary && (
          <div className="card">
            <div className="card-header"><div className="card-title">Summary</div></div>
            <div style={{ padding: 22, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              <BigStat v={c.summary.gold} l="Gold" c="#f5b14c" />
              <BigStat v={c.summary.silver} l="Silver" c="#c9d3df" />
              <BigStat v={c.summary.bronze} l="Bronze" c="#c08c5e" />
              <BigStat v={c.summary.points} l="Points" c="var(--accent)" />
            </div>
          </div>
        )}
      </div>

      <div className="col" style={{ gap: 12 }}>
        <div className="card card-pad">
          <div className="card-title" style={{ marginBottom: 12 }}>Details</div>
          <div className="col" style={{ gap: 10 }}>
            <InfoRow icon="calendar" label="Date" value={c.date === c.endDate ? c.date : `${c.date} → ${c.endDate}`} />
            <InfoRow icon="pin" label="Venue" value={c.location} />
            <InfoRow icon="globe" label="Country" value={c.country} />
            <InfoRow icon="trophy" label="Level" value={`${c.type}${c.level ? " · " + c.level : ""}`} />
            <InfoRow icon="users" label="Entries" value={String(entryCount)} />
          </div>
        </div>
        <div className="card card-pad">
          <div className="card-title" style={{ marginBottom: 8 }}>Race organizer</div>
          {organizer ? (
            <>
              <div className="row" style={{ gap: 10 }}>
                <Avatar name={organizer.name} color="#5b6ef5" size="md" />
                <div style={{ minWidth: 0 }}>
                  <div className="fw-600">{organizer.name}</div>
                  <div className="text-sm muted">{organizer.nation}</div>
                </div>
              </div>
              <div className="col" style={{ gap: 8, marginTop: 12 }}>
                <InfoRow icon="phone" label="Phone" value={organizer.phone || "—"} />
                <InfoRow icon="mail" label="Email" value={organizer.email || "—"} />
              </div>
            </>
          ) : (
            <div className="text-sm muted">No organizer assigned.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusSelect({ entry }: { entry: RaceEntry }) {
  const { updateEntry, t } = useLane();
  return (
    <select
      className="input"
      style={{ padding: "4px 8px", fontSize: 12, height: "auto", width: "auto" }}
      value={entry.status}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => updateEntry(entry.id, { status: e.target.value as EntryStatus })}
    >
      {ENTRY_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
    </select>
  );
}

function CompEntriesTab({ entries, athletes, onAdd, onResult }: { entries: RaceEntry[]; athletes: Athlete[]; onAdd: () => void; onResult: (e: RaceEntry) => void }) {
  const { deleteEntry } = useLane();
  const nameOf = (id: string) => { const a = athletes.find((x) => x.id === id); return a ? `${a.first} ${a.last}` : id; };
  const colorOf = (id: string) => athletes.find((x) => x.id === id)?.color || "#5b6ef5";
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Entries · {entries.length}</div>
        <button className="btn btn-secondary btn-sm" onClick={onAdd}><Icon name="plus" size={13} />Add Athletes</button>
      </div>
      {entries.length === 0 ? (
        <EmptyState icon="users" title="No athletes entered" description="Add athletes to the disciplines of this race." action={<button className="btn btn-primary btn-sm" onClick={onAdd}><Icon name="plus" size={13} />Add Athletes</button>} />
      ) : (
        <table className="table">
          <thead>
            <tr><th>Athlete</th><th>Discipline</th><th>Status</th><th>Result</th><th style={{ width: 120 }}></th></tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={nameOf(e.athleteId)} color={colorOf(e.athleteId)} size="sm" />
                    <div className="fw-600">{nameOf(e.athleteId)}</div>
                  </div>
                </td>
                <td>{e.discipline} <span className="text-xs muted">({e.gender})</span></td>
                <td><StatusSelect entry={e} /></td>
                <td>
                  {e.position != null || e.time ? (
                    <span className="mono">{e.position ? `#${e.position}` : ""} {e.time}</span>
                  ) : <span className="muted text-sm">—</span>}
                </td>
                <td>
                  <div className="row" style={{ gap: 4 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => onResult(e)}><Icon name="edit" size={12} /> Result</button>
                    <button className="icon-btn" style={{ color: "var(--danger)" }} onClick={() => deleteEntry(e.id)}><Icon name="trash" size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CompResultsTab({ entries, athletes }: { entries: RaceEntry[]; athletes: Athlete[] }) {
  const nameOf = (id: string) => { const a = athletes.find((x) => x.id === id); return a ? `${a.first} ${a.last}` : id; };
  if (entries.length === 0) {
    return <div className="card"><EmptyState icon="trophy" title="No results yet" description="Results appear here once entered against an athlete." /></div>;
  }
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Results · {entries.length}</div></div>
      <table className="table">
        <thead><tr><th>Athlete</th><th>Discipline</th><th>Place</th><th>Time</th><th>Wind</th><th>Note</th></tr></thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td className="fw-600">{nameOf(e.athleteId)}</td>
              <td>{e.discipline}</td>
              <td>{e.position ? <Badge variant={e.position === 1 ? "warning" : e.position <= 3 ? "info" : ""}>#{e.position}</Badge> : "—"}</td>
              <td className="display mono fw-700" style={{ color: "var(--accent)", fontSize: 16 }}>{e.time || "—"}</td>
              <td className="text-sm mono">{e.wind || "—"}</td>
              <td>{e.note && <Badge variant="success">{e.note}</Badge>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompDisciplinesTab({ disciplines, entries, athletes }: { disciplines: MeetingDiscipline[]; entries: RaceEntry[]; athletes: Athlete[] }) {
  const nameOf = (id: string) => { const a = athletes.find((x) => x.id === id); return a ? `${a.first} ${a.last}` : id; };
  return (
    <div className="col" style={{ gap: 12 }}>
      {disciplines.map((d, i) => {
        const inDisc = entries.filter((e) => e.discipline === d.discipline && e.gender === d.gender);
        return (
          <div key={i} className="card">
            <div className="card-header">
              <div className="card-title">{d.discipline} <span className="text-xs muted">· {d.gender === "W" ? "Women" : "Men"}</span></div>
              <span className="text-sm muted">{inDisc.length} entered</span>
            </div>
            <div style={{ padding: "6px 0" }}>
              {inDisc.length === 0 ? <div className="text-sm muted" style={{ padding: "8px 18px" }}>No athletes yet.</div> : inDisc.map((e) => (
                <div key={e.id} className="row" style={{ padding: "8px 18px", gap: 10 }}>
                  <div className="fw-600" style={{ flex: 1 }}>{nameOf(e.athleteId)}</div>
                  <EntryStatusBadge status={e.status} />
                  {e.time && <span className="mono text-sm">{e.time}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddEntryModal({ competition, disciplines, athletes, onClose }: { competition: Competition; disciplines: MeetingDiscipline[]; athletes: Athlete[]; onClose: () => void }) {
  const { createEntry, t } = useLane();
  const [athleteId, setAthleteId] = useState("");
  const [discIdx, setDiscIdx] = useState(0);
  const [status, setStatus] = useState<EntryStatus>("proposed");
  const [error, setError] = useState("");
  const submit = () => {
    if (!athleteId) { setError("Choose an athlete"); return; }
    const d = disciplines[discIdx];
    createEntry({ competitionId: competition.id, athleteId, discipline: d.discipline, gender: d.gender, status });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Add athlete — ${competition.short || competition.name}`} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}>Add entry</button></>}>
      <div className="col" style={{ gap: 14 }}>
        <div className="field">
          <label className="field-label">Athlete</label>
          <select className="input" value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
            <option value="">Select athlete…</option>
            {athletes.map((a) => <option key={a.id} value={a.id}>{a.first} {a.last} ({a.specialty})</option>)}
          </select>
          {error && <span className="field-error"><Icon name="alert" size={11} /> {error}</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field">
            <label className="field-label">Discipline</label>
            <select className="input" value={discIdx} onChange={(e) => setDiscIdx(Number(e.target.value))}>
              {disciplines.map((d, i) => <option key={i} value={i}>{d.discipline} ({d.gender})</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as EntryStatus)}>
              {ENTRY_STATUSES.map((s) => <option key={s.v} value={s.v}>{t(`entry.${s.v}`)}</option>)}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---- Manage disciplines (photo_16 "Aggiungi una disciplina alla competizione")
function DisciplineManagerModal({ competition, onClose }: { competition: Competition; onClose: () => void }) {
  const { updateCompetition } = useLane();
  const seed: MeetingDiscipline[] = competition.disciplines?.length
    ? competition.disciplines
    : competition.events.map((e) => ({ discipline: e, gender: "M" as const, date: competition.date }));
  const [list, setList] = useState<MeetingDiscipline[]>(seed);
  const [discipline, setDiscipline] = useState(ALL_DISCIPLINES[0]);
  const [gender, setGender] = useState<"M" | "W">("M");
  const [date, setDate] = useState(competition.date);
  const [indoor, setIndoor] = useState(false);
  const [toConfirm, setToConfirm] = useState(false);

  const add = () => {
    if (list.some((d) => d.discipline === discipline && d.gender === gender)) return;
    setList([...list, { discipline, gender, date: date || competition.date, indoor, toConfirm }]);
  };
  const remove = (i: number) => setList(list.filter((_, idx) => idx !== i));
  const save = () => { updateCompetition(competition.id, { disciplines: list }); onClose(); };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Disciplines"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
    >
      <div className="col" style={{ gap: 14 }}>
        <div className="card card-pad">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <div className="field">
              <label className="field-label">Discipline</label>
              <select className="input" value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
                {ALL_DISCIPLINES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Gender</label>
              <select className="input" value={gender} onChange={(e) => setGender(e.target.value as "M" | "W")}>
                <option value="M">Men</option>
                <option value="W">Women</option>
              </select>
            </div>
            <div className="field"><label className="field-label">Date</label><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <button className="btn btn-primary" onClick={add}><Icon name="plus" size={13} /> Add</button>
          </div>
          <div className="row" style={{ gap: 18, marginTop: 10, flexWrap: "wrap" }}>
            <label className="row" style={{ gap: 6, cursor: "pointer" }}><input type="checkbox" checked={indoor} onChange={(e) => setIndoor(e.target.checked)} /> Indoor</label>
            <label className="row" style={{ gap: 6, cursor: "pointer" }}><input type="checkbox" checked={toConfirm} onChange={(e) => setToConfirm(e.target.checked)} /> To confirm</label>
          </div>
        </div>

        <div>
          <div className="field-label" style={{ marginBottom: 6 }}>Disciplines for this race</div>
          {list.length === 0 ? (
            <div className="text-sm muted" style={{ padding: 8 }}>No disciplines yet.</div>
          ) : (
            <table className="table">
              <thead><tr><th>Discipline</th><th>Gender</th><th>Date</th><th></th><th style={{ width: 40 }}></th></tr></thead>
              <tbody>
                {list.map((d, i) => (
                  <tr key={i}>
                    <td className="fw-600">{d.discipline}</td>
                    <td>{d.gender === "W" ? "Women" : "Men"}</td>
                    <td className="text-sm mono">{d.date}</td>
                    <td>{d.indoor && <Badge>Indoor</Badge>} {d.toConfirm && <Badge variant="warning">To confirm</Badge>}</td>
                    <td><button className="icon-btn" style={{ color: "var(--danger)" }} onClick={() => remove(i)}><Icon name="trash" size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ResultModal({ entry, athletes, onClose }: { entry: RaceEntry; athletes: Athlete[]; onClose: () => void }) {
  const { updateEntry } = useLane();
  const a = athletes.find((x) => x.id === entry.athleteId);
  const [position, setPosition] = useState<string>(entry.position != null ? String(entry.position) : "");
  const [time, setTime] = useState(entry.time || "");
  const [wind, setWind] = useState(entry.wind || "");
  const [note, setNote] = useState(entry.note || "");
  const submit = () => {
    updateEntry(entry.id, { position: position ? Number(position) : undefined, time, wind, note, status: "ok" });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Result — ${a ? a.first + " " + a.last : ""} · ${entry.discipline}`} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}>Save result</button></>}>
      <div className="col" style={{ gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field"><label className="field-label">Place</label><input className="input mono" type="number" min="1" value={position} onChange={(e) => setPosition(e.target.value)} /></div>
          <div className="field"><label className="field-label">Time / mark</label><input className="input mono" placeholder="1:57.30 / 8.05m" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          <div className="field"><label className="field-label">Wind</label><input className="input mono" placeholder="+0.4" value={wind} onChange={(e) => setWind(e.target.value)} /></div>
          <div className="field">
            <label className="field-label">Note</label>
            <select className="input" value={note} onChange={(e) => setNote(e.target.value)}>
              <option value="">—</option>
              <option value="PB">Personal Best</option>
              <option value="SB">Season Best</option>
              <option value="NR">National Record</option>
              <option value="DNF">Did not finish</option>
              <option value="DQ">Disqualified</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}
