"use client";

// Admin Dashboard — KPIs, trend chart, upcoming events, activity, alerts.

import { Icon } from "@/components/icon";
import { useLane } from "@/components/lane-provider";
import { Avatar, Badge, EmptyState, KPI, Segmented } from "@/components/primitives";
import { DateStack } from "@/components/shared";
import { localeOf } from "@/lib/i18n";
import { downloadCsv } from "@/utils";
import { useMemo, useState } from "react";

const RANGE_DAYS: Record<string, number> = { d: 1, w: 7, m: 31, q: 92 };

function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00");
  return isNaN(d.getTime()) ? null : Math.round((d.getTime() - Date.now()) / 86400000);
}

export function DashboardScreen() {
  const { athletes, competitions, events, entries, activity, passports, visas, navigate, t, lang } = useLane();
  const [range, setRange] = useState("w");
  const loc = localeOf(lang);

  // ---- Performance trend from real data: race entries & athletes competing per
  // month, over the 12 months ending at the most recent month we have races in. ----
  const trend = useMemo(() => {
    const monthOf = (compId: string) => (competitions.find((c) => c.id === compId)?.date || "").slice(0, 7);
    const dataMonths = entries.map((e) => monthOf(e.competitionId)).filter(Boolean).sort();
    const latest = dataMonths[dataMonths.length - 1] || new Date().toISOString().slice(0, 7);
    const [ly, lm] = latest.split("-").map(Number);
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(ly, lm - 1 - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const entriesFor = (mo: string) => entries.filter((e) => monthOf(e.competitionId) === mo);
    return {
      labels: months.map((mo) => new Date(mo + "-01T00:00").toLocaleDateString(loc, { month: "short" })),
      entriesPerMonth: months.map((mo) => entriesFor(mo).length),
      athletesPerMonth: months.map((mo) => new Set(entriesFor(mo).map((e) => e.athleteId)).size),
      hasData: entries.length > 0,
    };
  }, [entries, competitions, loc]);

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

  const topPerformers = [...athletes].sort((a, b) => b.progress - a.progress).slice(0, 4);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("dash.title")}</h1>
          <p className="page-subtitle">{new Date().toLocaleDateString(loc, { weekday: "long", month: "long", day: "numeric" })} · {athletes.length} {t("dash.athletes")} · {upcomingCount} {t("dash.upcomingComps")} · {eventsInRange} {t("dash.eventsThis")} {range === "d" ? t("range.day") : range === "w" ? t("range.week") : range === "m" ? t("range.month") : t("range.quarter")}</p>
        </div>
        <div className="page-header-actions">
          <Segmented options={[{ label: t("range.today"), value: "d" }, { label: t("range.weekLabel"), value: "w" }, { label: t("range.monthLabel"), value: "m" }, { label: t("range.quarterLabel"), value: "q" }]} value={range} onChange={setRange} />
          <button className="btn btn-secondary" onClick={exportSummary}><Icon name="download" size={14} /> {t("common.export")}</button>
          <button className="btn btn-primary" onClick={() => navigate("calendar")}><Icon name="plus" size={14} /> {t("dash.newEvent")}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <KPI label={t("dash.kpiActive")} value={activeCount} delta={`${athletes.length} ${t("dash.kpiTotal")}`} deltaDir="up" sparkData={[0, activeCount]} sparkColor="var(--lane-4)" />
        <KPI label={t("dash.kpiComps")} value={competitions.length} delta={`${upcomingCount} ${t("dash.kpiUpcoming")}`} deltaDir="up" sparkData={[0, competitions.length]} sparkColor="var(--lane-3)" />
        <KPI label={t("dash.kpiMedals")} value={totalMedals} delta={`${medals.gold} ${t("dash.kpiGold")}`} deltaDir="up" sparkData={[0, totalMedals]} sparkColor="var(--lane-2)" />
        <KPI label={t("dash.kpiTravel")} value={passports.length + visas.length} delta={`${visas.length} ${t("dash.kpiVisas")}`} deltaDir="up" sparkData={[0, passports.length + visas.length]} sparkColor="var(--lane-1)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t("dash.compActivity")}</div>
              <div className="card-subtitle">{t("dash.compActivitySub")}</div>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <LegendDot color="#6b7dff" label={t("dash.legendEntries")} />
              <LegendDot color="#f5b14c" label={t("dash.legendAthletes")} />
            </div>
          </div>
          <div style={{ padding: 18 }}>
            {!trend.hasData ? (
              <EmptyState icon="dashboard" title={t("dash.noCompData")} description={t("dash.noCompDataDesc")} />
            ) : (
              <PerformanceChart labels={trend.labels} series1={trend.entriesPerMonth} series2={trend.athletesPerMonth} />
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">{t("dash.medalDist")}</div>
          </div>
          <div style={{ padding: 22, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            {totalMedals === 0 ? (
              <EmptyState icon="trophy" title={t("dash.noMedals")} description={t("dash.noMedalsDesc")} />
            ) : (
              <>
                <MedalDonut gold={medals.gold} silver={medals.silver} bronze={medals.bronze} label={t("dash.medals")} />
                <div style={{ display: "flex", gap: 18, width: "100%", justifyContent: "center" }}>
                  <MedalLegend color="#f5b14c" label={t("dash.gold")} value={medals.gold} />
                  <MedalLegend color="#c9d3df" label={t("dash.silver")} value={medals.silver} />
                  <MedalLegend color="#c08c5e" label={t("dash.bronze")} value={medals.bronze} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, alignItems: "start" }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">{t("dash.upcoming")}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("competitions")}>{t("dash.seeAll")} <Icon name="chevronRight" size={12} /></button>
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
                <div className="text-sm" style={{ color: "var(--fg-2)" }}>{c.entries} {t("dash.entered")}</div>
                <Icon name="chevronRight" size={14} style={{ color: "var(--fg-3)" }} />
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">{t("dash.recentActivity")}</div>
            <span className="text-xs muted mono">LIVE</span>
          </div>
          <div style={{ padding: "8px 0" }}>
            {activity.length === 0 ? (
              <div className="text-sm muted" style={{ padding: "12px 18px" }}>{t("dash.noActivity")}</div>
            ) : activity.slice(0, 6).map((a) => (
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
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title row" style={{ gap: 6 }}>
              <Icon name="warningTri" size={14} style={{ color: "var(--warning)" }} />
              {t("dash.expiries")}
            </div>
            <Badge variant={expiries.some((e) => (e.days as number) < 0) ? "danger" : "warning"}>{expiries.length}</Badge>
          </div>
          <div style={{ padding: "8px 0" }}>
            {expiries.length === 0 ? (
              <div className="text-sm muted" style={{ padding: "12px 18px" }}>{t("dash.noExpiries")}</div>
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
                      <div className="fw-600 text-md">{d < 0 ? t("dash.expired") : t("dash.expiresInDays", { n: d, u: d === 1 ? t("time.day") : t("time.days") })}</div>
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

function PerformanceChart({ labels, series1, series2 }: { labels: string[]; series1: number[]; series2: number[] }) {
  const W = 720, H = 220, padL = 36, padR = 12, padT = 14, padB = 26;
  const n = Math.max(series1.length, 1);
  // Auto-scale the y-axis to the data (nice round top, at least 4).
  const peak = Math.max(1, ...series1, ...series2);
  const max = Math.max(4, Math.ceil(peak / 4) * 4);
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const x = (i: number) => padL + (n === 1 ? 0.5 : i / (n - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const buildPath = (s: number[]) => s.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 220 }}>
      <defs>
        <linearGradient id="pg1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5b6ef5" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#5b6ef5" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line className="grid-line" x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} />
          <text x={padL - 8} y={y(v) + 3} textAnchor="end">{v}</text>
        </g>
      ))}
      {labels.map((m, i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle">{m}</text>
      ))}
      <path d={`${buildPath(series1)} L ${x(n - 1)} ${H - padB} L ${padL} ${H - padB} Z`} fill="url(#pg1)" />
      <path d={buildPath(series1)} fill="none" stroke="#6b7dff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={buildPath(series2)} fill="none" stroke="#f5b14c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
      {series1.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="var(--bg-1)" stroke="#6b7dff" strokeWidth="2" />
      ))}
    </svg>
  );
}

function MedalDonut({ gold, silver, bronze, label }: { gold: number; silver: number; bronze: number; label: string }) {
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
      <text x="90" y="104" textAnchor="middle" style={{ font: "600 11px var(--font-ui)", fill: "var(--fg-3)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</text>
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
