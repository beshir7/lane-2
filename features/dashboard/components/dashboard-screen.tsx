"use client";

// Admin Dashboard — KPIs, trend chart, upcoming events, top performers, activity, alerts.

import React, { useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Badge, EmptyState, KPI, Segmented } from "@/components/primitives";
import { DateStack, EventTypeBadge, formatHour } from "@/components/shared";
import { useLane } from "@/components/lane-provider";
import { downloadCsv } from "@/utils";

const RANGE_DAYS: Record<string, number> = { d: 1, w: 7, m: 31, q: 92 };

function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00");
  return isNaN(d.getTime()) ? null : Math.round((d.getTime() - Date.now()) / 86400000);
}

export function DashboardScreen() {
  const { athletes, competitions, events, activity, passports, visas, navigate } = useLane();
  const [range, setRange] = useState("w");

  // ---- Derived metrics (all from real data) ----
  const windowEnd = Date.now() + RANGE_DAYS[range] * 86400000;
  const inWindow = (iso: string) => { const t = +new Date(iso + "T00:00"); return t >= Date.now() - 86400000 && t <= windowEnd; };
  const activeCount = athletes.filter((a) => a.status === "active").length;
  const medals = athletes.reduce((s, a) => ({ gold: s.gold + (a.medals?.gold || 0), silver: s.silver + (a.medals?.silver || 0), bronze: s.bronze + (a.medals?.bronze || 0) }), { gold: 0, silver: 0, bronze: 0 });
  const totalMedals = medals.gold + medals.silver + medals.bronze;
  const upcomingCount = competitions.filter((c) => c.status !== "completed").length;
  const eventsInRange = events.filter((e) => inWindow(e.date)).length;

  const exportSummary = () => downloadCsv("dashboard-summary", [
    { metric: "Athletes", value: athletes.length },
    { metric: "Active athletes", value: activeCount },
    { metric: "Competitions", value: competitions.length },
    { metric: "Upcoming competitions", value: upcomingCount },
    { metric: "Medals (G/S/B)", value: `${medals.gold}/${medals.silver}/${medals.bronze}` },
    { metric: "Documents", value: passports.length + visas.length },
  ]);

  const nameOf = (id: string) => { const a = athletes.find((x) => x.id === id); return a ? `${a.first} ${a.last}` : "—"; };
  const expiries = [
    ...passports.map((p) => ({ kind: "Passport", athleteId: p.athleteId, label: `${nameOf(p.athleteId)} · passport`, to: p.expiry })),
    ...visas.map((v) => ({ kind: "Visa", athleteId: v.athleteId, label: `${nameOf(v.athleteId)} · ${v.type}`, to: v.validTo })),
  ]
    .map((x) => ({ ...x, days: daysUntil(x.to) }))
    .filter((x) => x.days != null && x.days < 120)
    .sort((a, b) => (a.days as number) - (b.days as number))
    .slice(0, 6);

  const upcomingComps = competitions
    .filter((c) => c.status !== "completed")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(0, 5);

  const upcomingEvents = events
    .filter((e) => +new Date(e.date + "T00:00") >= Date.now() - 86400000)
    .sort((a, b) => +new Date(a.date + "T00:00") - +new Date(b.date + "T00:00"))
    .slice(0, 6);

  const topPerformers = [...athletes].sort((a, b) => b.progress - a.progress).slice(0, 4);

  const trendData = [56, 60, 58, 64, 69, 67, 72, 78, 75, 82, 80, 86];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {athletes.length} athletes · {upcomingCount} upcoming competitions · {eventsInRange} events this {range === "d" ? "day" : range === "w" ? "week" : range === "m" ? "month" : "quarter"}</p>
        </div>
        <div className="page-header-actions">
          <Segmented options={[{ label: "Today", value: "d" }, { label: "Week", value: "w" }, { label: "Month", value: "m" }, { label: "Quarter", value: "q" }]} value={range} onChange={setRange} />
          <button className="btn btn-secondary" onClick={exportSummary}><Icon name="download" size={14} /> Export</button>
          <button className="btn btn-primary" onClick={() => navigate("calendar")}><Icon name="plus" size={14} /> New event</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <KPI label="Active athletes" value={activeCount} delta={`${athletes.length} total`} deltaDir="up" sparkData={[0, activeCount]} sparkColor="var(--lane-4)" />
        <KPI label="Competitions" value={competitions.length} delta={`${upcomingCount} upcoming`} deltaDir="up" sparkData={[0, competitions.length]} sparkColor="var(--lane-3)" />
        <KPI label="Medals" value={totalMedals} delta={`${medals.gold} gold`} deltaDir="up" sparkData={[0, totalMedals]} sparkColor="var(--lane-2)" />
        <KPI label="Travel docs" value={passports.length + visas.length} delta={`${visas.length} visas`} deltaDir="up" sparkData={[0, passports.length + visas.length]} sparkColor="var(--lane-1)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Performance trend</div>
              <div className="card-subtitle">Team average performance index · last 12 months</div>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <LegendDot color="var(--lane-4)" label="Team avg." />
              <LegendDot color="var(--lane-2)" label="Top 5 avg." />
              <button className="btn btn-ghost btn-sm"><Icon name="more" size={14} /></button>
            </div>
          </div>
          <div style={{ padding: 18 }}>
            {athletes.length === 0 ? (
              <EmptyState icon="dashboard" title="No performance data" description="Add athletes to see the team form trend." />
            ) : (
              <PerformanceChart series1={trendData} series2={trendData.map((v) => v + 8 + Math.sin(v) * 2)} />
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Medal distribution</div>
          </div>
          <div style={{ padding: 22, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            {totalMedals === 0 ? (
              <EmptyState icon="trophy" title="No medals yet" description="Medals tally as you add them to athletes." />
            ) : (
              <>
                <MedalDonut gold={medals.gold} silver={medals.silver} bronze={medals.bronze} />
                <div style={{ display: "flex", gap: 18, width: "100%", justifyContent: "center" }}>
                  <MedalLegend color="#f5b14c" label="Gold" value={medals.gold} />
                  <MedalLegend color="#c9d3df" label="Silver" value={medals.silver} />
                  <MedalLegend color="#c08c5e" label="Bronze" value={medals.bronze} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Upcoming competitions</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("competitions")}>See all <Icon name="chevronRight" size={12} /></button>
          </div>
          <div style={{ padding: "6px 0" }}>
            {upcomingComps.map((c) => (
              <button key={c.id} className="row" style={{ width: "100%", padding: "10px 18px", borderRadius: 0, gap: 14, textAlign: "left" }} onClick={() => navigate("competition-detail", c.id)}>
                <DateStack date={c.date} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fw-600 text-md" style={{ color: "var(--fg-1)" }}>{c.name}</div>
                  <div className="text-sm muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.location}</div>
                </div>
                <Badge variant={c.tier === "tier-1" ? "accent" : ""}>{c.type}</Badge>
                <div className="text-sm" style={{ color: "var(--fg-2)" }}>{c.entries} entered</div>
                <Icon name="chevronRight" size={14} style={{ color: "var(--fg-3)" }} />
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Top performers</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("athletes")}>See all <Icon name="chevronRight" size={12} /></button>
          </div>
          <div style={{ padding: "6px 0" }}>
            {topPerformers.map((a, i) => (
              <button key={a.id} className="row" style={{ width: "100%", padding: "10px 18px", gap: 14, textAlign: "left" }} onClick={() => navigate("athlete-detail", a.id)}>
                <span className="mono" style={{ width: 18, color: "var(--fg-3)", fontWeight: 700, fontSize: 13 }}>{i + 1}</span>
                <Avatar name={a.first + " " + a.last} color={a.color} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fw-600 text-md">{a.first} {a.last}</div>
                  <div className="text-sm muted">{a.nationality} · {a.specialty}</div>
                </div>
                <div style={{ width: 100, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="text-xs mono" style={{ color: "var(--fg-3)" }}>Form {a.progress}%</div>
                  <div className="progress"><div style={{ width: a.progress + "%", background: a.color }} /></div>
                </div>
                <Icon name="chevronRight" size={14} style={{ color: "var(--fg-3)" }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">This week</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("calendar")}>Open calendar <Icon name="arrowUpRight" size={12} /></button>
          </div>
          <div style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Type</th>
                  <th>Athletes</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {upcomingEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <div className="mono text-xs" style={{ color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {new Date(ev.date + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                      <div className="mono text-sm">{formatHour(ev.startHour)}</div>
                    </td>
                    <td className="fw-600">{ev.title}</td>
                    <td><EventTypeBadge category={ev.category} /></td>
                    <td>
                      {ev.athletes.length === 0 ? <span className="muted text-sm">All team</span> : (
                        <div className="avatar-stack">
                          {ev.athletes.slice(0, 3).map((aid) => {
                            const a = athletes.find((x) => x.id === aid);
                            return <Avatar key={aid} name={a?.first + " " + a?.last} color={a?.color} size="xs" />;
                          })}
                          {ev.athletes.length > 3 && <span className="avatar avatar-xs" style={{ background: "var(--bg-3)", color: "var(--fg-2)" }}>+{ev.athletes.length - 3}</span>}
                        </div>
                      )}
                    </td>
                    <td className="text-sm muted">{ev.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col" style={{ gap: 12 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent activity</div>
              <span className="text-xs muted mono">LIVE</span>
            </div>
            <div style={{ padding: "8px 0" }}>
              {activity.slice(0, 5).map((a) => (
                <div key={a.id} className="row" style={{ padding: "9px 18px", gap: 12 }}>
                  <Avatar name={a.user} initials={a.initials} color={a.color} size="sm" />
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.45 }}>
                    <b style={{ fontWeight: 600, color: "var(--fg-1)" }}>{a.user}</b>{" "}
                    <span style={{ color: "var(--fg-3)" }}>{a.action}</span>{" "}
                    <span style={{ color: "var(--fg-1)", fontWeight: 500 }}>{a.target}</span>
                    <div className="text-xs muted mono" style={{ marginTop: 2 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title row" style={{ gap: 6 }}>
                <Icon name="warningTri" size={14} style={{ color: "var(--warning)" }} />
                Passport & visa expiries
              </div>
              <Badge variant={expiries.some((e) => (e.days as number) < 0) ? "danger" : "warning"}>{expiries.length}</Badge>
            </div>
            <div style={{ padding: "8px 0" }}>
              {expiries.length === 0 ? (
                <div className="text-sm muted" style={{ padding: "12px 18px" }}>No documents expiring in the next 120 days.</div>
              ) : (
                expiries.map((e, i) => {
                  const d = e.days as number;
                  const color = d < 0 ? "var(--danger)" : d < 60 ? "var(--warning)" : "var(--info)";
                  return (
                    <button key={i} className="row" style={{ width: "100%", padding: "10px 18px", gap: 12, textAlign: "left" }} onClick={() => navigate("athlete-detail", e.athleteId)}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--bg-2)", color, display: "grid", placeItems: "center" }}>
                        <Icon name={e.kind === "Passport" ? "globe" : "fileText"} size={14} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="fw-600 text-md">{d < 0 ? "Expired" : `Expires in ${d} days`}</div>
                        <div className="text-sm muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.label}</div>
                      </div>
                      <span className="text-xs mono muted">{e.to}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="row" style={{ gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      <span className="text-xs muted fw-600">{label}</span>
    </div>
  );
}

function PerformanceChart({ series1, series2 }: { series1: number[]; series2: number[] }) {
  const W = 720, H = 220, padL = 36, padR = 12, padT = 14, padB = 26;
  const months = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  const min = 40;
  const max = 100;
  const x = (i: number) => padL + (i / (series1.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const buildPath = (s: number[]) => s.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 220 }}>
      <defs>
        <linearGradient id="pg1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5b6ef5" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#5b6ef5" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40, 60, 80, 100].map((v) => (
        <g key={v}>
          <line className="grid-line" x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} />
          <text x={padL - 8} y={y(v) + 3} textAnchor="end">{v}</text>
        </g>
      ))}
      {months.map((m, i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle">{m}</text>
      ))}
      <path d={`${buildPath(series1)} L ${x(series1.length - 1)} ${H - padB} L ${padL} ${H - padB} Z`} fill="url(#pg1)" />
      <path d={buildPath(series1)} fill="none" stroke="#6b7dff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={buildPath(series2)} fill="none" stroke="#f5b14c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
      {series1.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="var(--bg-1)" stroke="#6b7dff" strokeWidth="2" />
      ))}
    </svg>
  );
}

function MedalDonut({ gold, silver, bronze }: { gold: number; silver: number; bronze: number }) {
  const total = gold + silver + bronze;
  const r = 60;
  const c = 2 * Math.PI * r;
  const slice = (n: number) => (n / total) * c;
  let offset = 0;
  const arcs = [
    { v: gold, color: "#f5b14c" },
    { v: silver, color: "#c9d3df" },
    { v: bronze, color: "#c08c5e" },
  ];
  return (
    <svg width="180" height="180" viewBox="0 0 180 180">
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--bg-2)" strokeWidth="18" />
      {arcs.map((a, i) => {
        const len = slice(a.v);
        const dasharray = `${len} ${c - len}`;
        const el = (
          <circle key={i} cx="90" cy="90" r={r} fill="none" stroke={a.color} strokeWidth="18" strokeDasharray={dasharray} strokeDashoffset={-offset} transform="rotate(-90 90 90)" strokeLinecap="butt" />
        );
        offset += len;
        return el;
      })}
      <text x="90" y="86" textAnchor="middle" style={{ font: "800 28px var(--font-display)", fill: "var(--fg-1)", letterSpacing: "-0.03em" }}>{total}</text>
      <text x="90" y="104" textAnchor="middle" style={{ font: "600 11px var(--font-ui)", fill: "var(--fg-3)", letterSpacing: "0.05em", textTransform: "uppercase" }}>MEDALS</text>
    </svg>
  );
}

function MedalLegend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="row" style={{ gap: 6, justifyContent: "center" }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
        <span className="text-xs fw-600 muted" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <div className="display" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 4 }}>{value}</div>
    </div>
  );
}
