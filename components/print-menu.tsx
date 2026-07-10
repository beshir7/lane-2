"use client";

// Global "Stampa" (Print) menu (photo_12) — a single toolbar dropdown that
// generates printable Word documents for many combined lists, independent of the
// current page. Month-scoped lists honour the month picker at the top of the menu.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icon";
import { useLane } from "./lane-provider";
import { downloadWordDoc } from "@/utils";

const esc = (v: unknown) => String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

function tableHtml(headers: string[], rows: (string | number)[][]) {
  const head = `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>`;
  const body = rows.length
    ? rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${headers.length}">—</td></tr>`;
  return `<table>${head}${body}</table>`;
}

function tableDoc(filename: string, title: string, subtitle: string, headers: string[], rows: (string | number)[][]) {
  downloadWordDoc(filename, `<h1>${esc(title)}</h1><p class="sub">${esc(subtitle)}</p>${tableHtml(headers, rows)}`, title);
}

// A document split into headed groups (photo_1: athlete list by country/discipline/sponsor).
function groupedDoc(filename: string, title: string, headers: string[], groups: { heading: string; rows: (string | number)[][] }[]) {
  const body = groups.map((g) => `<h2>${esc(g.heading)} (${g.rows.length})</h2>${tableHtml(headers, g.rows)}`).join("");
  downloadWordDoc(filename, `<h1>${esc(title)}</h1>${body}`, title);
}

const fmtDob = (iso?: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

type LeafOpt = { key: string; labelKey: string; run: () => void };
type Opt = LeafOpt | { key: string; labelKey: string; children: LeafOpt[] };

export function PrintMenu() {
  const { athletes, competitions, entries, visas, passports, t } = useLane();
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const [month, setMonth] = useState(""); // "YYYY-MM" — empty = all months
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const sections = useMemo(() => {
    const nameOf = (id: string) => { const a = athletes.find((x) => x.id === id); return a ? `${a.last}, ${a.first}` : id; };
    const compOf = (id: string) => competitions.find((c) => c.id === id);
    const inMonth = (iso?: string) => !month || (iso || "").startsWith(month);
    const monthLabel = month || t("print.allMonths");
    const races = competitions.filter((c) => inMonth(c.date)).sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    const raceRows = (list: typeof competitions) => list.map((c) => [c.date, c.name, c.country || "", c.level || c.type || "", c.category || "", String(c.entries ?? 0)]);
    const athleteRow = (a: (typeof athletes)[number]) => [`${a.last}, ${a.first}${a.contract ? ` (${a.contract})` : ""}`, a.nationality || "", fmtDob(a.dob), a.specialty || ""];

    const races_: Opt[] = [
      { key: "raceList", labelKey: "print.raceList", run: () => tableDoc("race-list", t("print.raceList"), monthLabel, ["Date", "Competition", "Nation", "Level", "Category", "Entries"], raceRows(races)) },
      { key: "meetingList", labelKey: "print.meetingList", run: () => tableDoc("meeting-list", t("print.meetingList"), monthLabel, ["Date", "Competition", "Nation", "Level", "Category", "Entries"], raceRows(races.filter((c) => c.category === "meeting"))) },
      { key: "indoorList", labelKey: "print.indoorList", run: () => tableDoc("indoor-list", t("print.indoorList"), monthLabel, ["Date", "Competition", "Nation", "Level", "Category", "Entries"], raceRows(races.filter((c) => c.category === "indoor"))) },
      { key: "raceCalendar", labelKey: "print.raceCalendar", run: () => tableDoc("race-calendar", t("print.raceCalendar"), monthLabel, ["Date", "Competition", "Location", "Nation"], races.map((c) => [c.date, c.name, c.location || "", c.country || ""])) },
      {
        key: "athleteMonthlyRaces", labelKey: "print.athleteMonthlyRaces", run: () => {
          const rows = entries
            .filter((e) => inMonth(compOf(e.competitionId)?.date))
            .map((e) => ({ e, c: compOf(e.competitionId) }))
            .sort((a, b) => (a.c?.date || "").localeCompare(b.c?.date || ""))
            .map(({ e, c }) => [c?.date || "", nameOf(e.athleteId), c?.name || e.competitionId, e.discipline, e.position ? `#${e.position}` : "", e.time || ""]);
          tableDoc("athletes-monthly-races", t("print.athleteMonthlyRaces"), monthLabel, ["Date", "Athlete", "Competition", "Discipline", "Place", "Time"], rows);
        },
      },
      {
        key: "athleteFutureRaces", labelKey: "print.athleteFutureRaces", run: () => {
          const today = new Date().toISOString().slice(0, 10);
          const future = competitions.filter((c) => (c.date || "") >= today).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
          const futureIds = new Set(future.map((c) => c.id));
          const rows = entries.filter((e) => futureIds.has(e.competitionId)).map((e) => { const c = compOf(e.competitionId); return [c?.date || "", nameOf(e.athleteId), c?.name || e.competitionId, e.discipline]; })
            .sort((a, b) => a[0].localeCompare(b[0]));
          tableDoc("athletes-future-races", t("print.athleteFutureRaces"), "", ["Date", "Athlete", "Competition", "Discipline"], rows);
        },
      },
    ];

    const roster = [...athletes].sort((a, b) => a.last.localeCompare(b.last));
    // Group the roster under sorted headings (photo_1: by nation / discipline / sponsor).
    const GROUP_HEADERS = ["Athlete", "Nationality", "Date of birth", "Discipline", "Sponsor"];
    const groupRows = (a: (typeof athletes)[number]) => [`${a.last}, ${a.first}${a.contract ? ` (${a.contract})` : ""}`, a.nationality || "", fmtDob(a.dob), a.specialty || "", a.sponsor || ""];
    const buildGroups = (keyFn: (a: (typeof athletes)[number]) => string) => {
      const map = new Map<string, (typeof athletes)[number][]>();
      roster.forEach((a) => { const k = keyFn(a) || "—"; (map.get(k) || map.set(k, []).get(k)!).push(a); });
      return [...map.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([heading, list]) => ({ heading, rows: list.map(groupRows) }));
    };

    const athletes_: Opt[] = [
      { key: "roster", labelKey: "print.roster", run: () => tableDoc("athlete-roster", t("print.roster"), `${roster.length}`, ["Athlete", "Nationality", "Date of birth", "Discipline", "Coach"], roster.map((a) => [...athleteRow(a), a.coach || ""])) },
      { key: "athletesWithSponsor", labelKey: "print.athletesWithSponsor", run: () => tableDoc("athletes-with-sponsor", t("print.athletesWithSponsor"), "", ["Athlete", "Sponsor", "Nationality"], roster.filter((a) => a.sponsor).map((a) => [`${a.last}, ${a.first}`, a.sponsor || "", a.nationality || ""])) },
      { key: "marathoners", labelKey: "print.marathoners", run: () => tableDoc("marathoners", t("print.marathoners"), "", ["Athlete", "Nationality", "Discipline"], roster.filter((a) => /marathon/i.test(a.specialty) || (a.disciplines || []).some((d) => /marathon/i.test(d))).map((a) => [`${a.last}, ${a.first}`, a.nationality || "", a.specialty || ""])) },
      // Personal bests (photo_2 concept): one row per PB mark an athlete holds.
      {
        key: "personalBests", labelKey: "print.personalBests", run: () => {
          const rows = roster.flatMap((a) => Object.entries(a.pb || {})
            .filter(([, mark]) => mark)
            .map(([disc, mark]) => [`${a.last}, ${a.first}${a.contract ? ` (${a.contract})` : ""}`, a.nationality || "", disc, mark]));
          tableDoc("personal-bests", t("print.personalBests"), `${rows.length}`, ["Athlete", "Nationality", "Discipline", "Personal best"], rows);
        },
      },
      // Men marathon runners ranked by marathon PB (photo_2).
      {
        key: "menMarathon", labelKey: "print.menMarathon", run: () => {
          const marOf = (a: (typeof athletes)[number]) => { const k = Object.keys(a.pb || {}).find((d) => /marathon/i.test(d)); return k ? a.pb[k] : ""; };
          const rows = roster
            .filter((a) => a.gender === "M" && (marOf(a) || /marathon/i.test(a.specialty)))
            .map((a) => ({ a, mark: marOf(a) }))
            .sort((x, y) => (x.mark || "~").localeCompare(y.mark || "~"))
            .map(({ a, mark }, i) => [String(i + 1), `${a.last}, ${a.first}${a.contract ? ` (${a.contract})` : ""}`, a.nationality || "", mark || "—"]);
          tableDoc("men-marathon-runners", t("print.menMarathon"), `${rows.length}`, ["#", "Athlete", "Nationality", "Marathon PB"], rows);
        },
      },
      { key: "track", labelKey: "print.track", run: () => tableDoc("track-athletes", t("print.track"), "", ["Athlete", "Nationality", "Discipline"], roster.filter((a) => !/marathon|road|cross/i.test(a.specialty)).map((a) => [`${a.last}, ${a.first}`, a.nationality || "", a.specialty || ""])) },
      {
        key: "athleteList", labelKey: "print.athleteList", children: [
          { key: "byCountry", labelKey: "print.byCountry", run: () => groupedDoc("athlete-list-by-country", `${t("print.athleteList")} — ${t("print.byCountry")}`, GROUP_HEADERS, buildGroups((a) => a.nationality)) },
          { key: "byDiscipline", labelKey: "print.byDiscipline", run: () => groupedDoc("athlete-list-by-discipline", `${t("print.athleteList")} — ${t("print.byDiscipline")}`, GROUP_HEADERS, buildGroups((a) => a.specialty)) },
          { key: "bySponsor", labelKey: "print.bySponsor", run: () => groupedDoc("athlete-list-by-sponsor", `${t("print.athleteList")} — ${t("print.bySponsor")}`, GROUP_HEADERS, buildGroups((a) => a.sponsor || t("print.noSponsor"))) },
        ],
      },
    ];

    const docs_: Opt[] = [
      { key: "athleteContacts", labelKey: "print.athleteContacts", run: () => tableDoc("athlete-contacts", t("print.athleteContacts"), `${roster.length}`, ["Athlete", "Email", "Phone", "Residence"], roster.map((a) => [`${a.last}, ${a.first}`, a.contact?.email || "", a.contact?.phone || "", a.residence || ""])) },
      { key: "visaList", labelKey: "print.visaList", run: () => tableDoc("visa-list", t("print.visaList"), "", ["Athlete", "Type", "Valid from", "Valid to"], visas.filter((v) => !v.archived).map((v) => [nameOf(v.athleteId), v.type || v.kind, v.validFrom || "", v.validTo || ""]).sort((a, b) => a[0].localeCompare(b[0]))) },
      { key: "passportList", labelKey: "print.passportList", run: () => tableDoc("passport-list", t("print.passportList"), "", ["Athlete", "Number", "Nation", "Expiry"], passports.map((p) => [nameOf(p.athleteId), p.number || "", p.nation || "", p.expiry || ""]).sort((a, b) => a[0].localeCompare(b[0]))) },
    ];

    return [
      { titleKey: "print.section.races", items: races_ },
      { titleKey: "print.section.athletes", items: athletes_ },
      { titleKey: "print.section.docs", items: docs_ },
    ];
  }, [athletes, competitions, entries, visas, passports, month, t]);

  const run = (fn: () => void) => { fn(); setOpen(false); setOpenSub(null); };
  const itemStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 8px", borderRadius: 6, textAlign: "left", fontSize: 13, background: "transparent", color: "var(--fg-1)" };
  const hoverOn = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.background = "var(--bg-2)");
  const hoverOff = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.background = "transparent");

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn btn-secondary btn-sm" onClick={() => setOpen((o) => !o)} title={t("print.menu")}>
        <Icon name="fileText" size={14} /> {t("print.menu")} <Icon name="chevronDown" size={12} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 60, width: 320, maxHeight: "70vh", overflowY: "auto",
            background: "var(--bg-1)", border: "1px solid var(--border-2)", borderRadius: "var(--r-md)", boxShadow: "var(--shadow-lift)", padding: 8,
          }}
        >
          <div className="field" style={{ padding: "2px 6px 8px" }}>
            <label className="field-label">{t("print.month")}</label>
            <div className="input-group" style={{ padding: 0 }}>
              <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} placeholder={t("print.allMonths")} />
              {month && <button className="icon-btn" title={t("print.allMonths")} onClick={() => setMonth("")}><Icon name="close" size={13} /></button>}
            </div>
          </div>
          {sections.map((sec) => (
            <div key={sec.titleKey}>
              <div className="text-xs mono fw-700 muted" style={{ textTransform: "uppercase", letterSpacing: "0.05em", padding: "8px 8px 4px" }}>{t(sec.titleKey)}</div>
              {sec.items.map((opt) =>
                "children" in opt ? (
                  <div key={opt.key}>
                    <button style={itemStyle} onMouseEnter={(e) => { hoverOn(e); setOpenSub(opt.key); }} onMouseLeave={hoverOff} onClick={() => setOpenSub((s) => (s === opt.key ? null : opt.key))} aria-expanded={openSub === opt.key}>
                      <Icon name="layers" size={13} style={{ color: "var(--fg-3)" }} /> {t(opt.labelKey)}
                      <span style={{ marginLeft: "auto", transition: "transform 120ms", transform: openSub === opt.key ? "rotate(90deg)" : "none" }}><Icon name="chevronRight" size={13} style={{ color: "var(--fg-3)" }} /></span>
                    </button>
                    {openSub === opt.key && (
                      <div style={{ paddingLeft: 12, borderLeft: "2px solid var(--border-1)", marginLeft: 14 }}>
                        {opt.children.map((ch) => (
                          <button key={ch.key} onClick={() => run(ch.run)} style={itemStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                            <Icon name="download" size={13} style={{ color: "var(--fg-3)" }} /> {t(ch.labelKey)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button key={opt.key} onClick={() => run(opt.run)} style={itemStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                    <Icon name="download" size={13} style={{ color: "var(--fg-3)" }} /> {t(opt.labelKey)}
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
