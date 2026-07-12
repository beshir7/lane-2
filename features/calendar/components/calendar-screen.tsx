"use client";

// Calendar — Month / Week / Day views, drag events, create/edit, filters.

import React, { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Drawer, EmptyState, Segmented, Tag } from "@/components/primitives";
import { EventTypeBadge, FilterDropdown, formatHour } from "@/components/shared";
import { useLane } from "@/components/lane-provider";
import { localeOf } from "@/lib/i18n";
import { downloadCsv } from "@/utils";
import type { Athlete, CalendarEvent, CalendarCategory } from "@/lib/types";

type CalView = "month" | "week" | "day";

// Local (not UTC) ISO date for "today", used to highlight the current day.
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// A calendar item is either a real editable event or a read-only item derived
// from a race (competition). Race items carry the entered athletes and link to
// the race detail instead of opening the event editor.
type CalItem = CalendarEvent & { isRace?: boolean; raceId?: string };

const getWeekStart = (d: Date) => {
  const out = new Date(d);
  out.setDate(out.getDate() - out.getDay());
  return out;
};
// Local (not UTC) ISO date — using toISOString() here shifts the day in +offset
// timezones, which mis-highlighted "today" and placed events on the wrong day.
const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const catColor = (cat: string) =>
  cat === "competition" ? "var(--danger)" : cat === "training" ? "var(--success)" : cat === "travel" ? "var(--warning)" : "var(--accent)";
const catBg = (cat: string) =>
  cat === "competition" ? "rgba(245, 91, 110, 0.13)" : cat === "training" ? "rgba(34, 211, 160, 0.13)" : cat === "travel" ? "rgba(245, 177, 76, 0.13)" : "rgba(107, 125, 255, 0.16)";

export function CalendarScreen() {
  const { events, athletes, competitions, entries, updateEvent, createEvent, deleteEvent, navigate, t, lang } = useLane();
  const loc = localeOf(lang);
  const [view, setView] = useState<CalView>("month");
  const isTimeView = view === "month" || view === "week" || view === "day";
  const [cursor, setCursor] = useState(() => new Date());
  const [filterCat, setFilterCat] = useState<Set<string>>(new Set(["competition", "training", "travel", "meeting"]));
  const [filterAthlete, setFilterAthlete] = useState("all");
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [newOnDate, setNewOnDate] = useState<any>(null);

  // Every dated race becomes a calendar item on its day, carrying the athletes
  // entered in it (from race entries) so the calendar reflects Races + Athletes.
  const raceEvents = useMemo<CalItem[]>(
    () =>
      competitions
        .filter((c) => c.date)
        .map((c) => ({
          id: `race-${c.id}`,
          raceId: c.id,
          isRace: true,
          title: c.name,
          category: "competition" as CalendarCategory,
          date: c.date,
          startHour: 9,
          duration: 2,
          athletes: entries.filter((e) => e.competitionId === c.id).map((e) => e.athleteId),
          location: c.location || "",
        })),
    [competitions, entries]
  );

  const filtered = useMemo<CalItem[]>(
    () =>
      [...events, ...raceEvents].filter((e) => {
        if (!filterCat.has(e.category)) return false;
        if (filterAthlete !== "all" && !e.athletes.includes(filterAthlete)) return false;
        return true;
      }),
    [events, raceEvents, filterCat, filterAthlete]
  );

  // Races link to the race detail; real events open the editor.
  const openItem = (ev: CalItem) => {
    if (ev.isRace && ev.raceId) navigate("competition-detail", ev.raceId);
    else setEditEvent(ev);
  };

  const moveCursor = (delta: number) => {
    const next = new Date(cursor);
    if (view === "month") next.setMonth(cursor.getMonth() + delta);
    else if (view === "week") next.setDate(cursor.getDate() + delta * 7);
    else next.setDate(cursor.getDate() + delta);
    setCursor(next);
  };

  const today = () => setCursor(new Date());

  const exportEvents = () => downloadCsv(
    "calendar-events",
    events.map((e) => ({ title: e.title, category: e.category, date: e.date, start: formatHour(e.startHour), duration: e.duration, location: e.location, athletes: e.athletes.length }))
  );

  const title =
    view === "month"
      ? cursor.toLocaleDateString(loc, { month: "long", year: "numeric" })
      : view === "week"
      ? `${t("cal.weekOf")} ${getWeekStart(cursor).toLocaleDateString(loc, { month: "short", day: "numeric" })}`
      : cursor.toLocaleDateString(loc, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // Only real events can be dragged to reschedule; race items are read-only.
  const moveEvent = (eventId: string, newDate: string) => {
    if (eventId.startsWith("race-")) return;
    updateEvent(eventId, { date: newDate });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("cal.title")}</h1>
          <p className="page-subtitle">{t("cal.subtitle")}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={exportEvents}><Icon name="download" size={14} /> {t("common.export")}</button>
          <button className="btn btn-primary" onClick={() => setNewOnDate(new Date(cursor))}><Icon name="plus" size={14} /> {t("cal.newEvent")}</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ padding: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {isTimeView && (
            <>
              <div className="row" style={{ gap: 4 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => moveCursor(-1)}><Icon name="chevronLeft" size={13} /></button>
                <button className="btn btn-secondary btn-sm" onClick={today}>{t("cal.today")}</button>
                <button className="btn btn-secondary btn-sm" onClick={() => moveCursor(1)}><Icon name="chevronRight" size={13} /></button>
              </div>
              <div className="display fw-700" style={{ fontSize: 18, letterSpacing: "-0.02em", marginLeft: 8, textTransform: "capitalize" }}>{title}</div>

              <div className="row" style={{ gap: 5 }}>
                <CategoryFilter cat="competition" label={t("cal.comps")} color="var(--danger)" filterCat={filterCat} setFilterCat={setFilterCat} />
                <CategoryFilter cat="training" label={t("cal.training")} color="var(--success)" filterCat={filterCat} setFilterCat={setFilterCat} />
                <CategoryFilter cat="travel" label={t("cal.travel")} color="var(--warning)" filterCat={filterCat} setFilterCat={setFilterCat} />
                <CategoryFilter cat="meeting" label={t("cal.meetings")} color="var(--accent)" filterCat={filterCat} setFilterCat={setFilterCat} />
              </div>

              <FilterDropdown label={t("cal.athlete")} value={filterAthlete} options={[{ v: "all", l: t("cal.allAthletes") }, ...athletes.map((a) => ({ v: a.id, l: `${a.first} ${a.last}` }))]} onChange={setFilterAthlete} />
            </>
          )}

          <div className="spacer" />

          <Segmented
            options={[
              { value: "month", label: t("cal.month") },
              { value: "week", label: t("cal.week") },
              { value: "day", label: t("cal.day") },
            ]}
            value={view}
            onChange={setView}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 16, overflow: "auto" }}>
        {view === "month" && <MonthView cursor={cursor} events={filtered} onMoveEvent={moveEvent} onClickDate={(d) => setNewOnDate(d)} onClickEvent={openItem} />}
        {view === "week" && <WeekView cursor={cursor} events={filtered} onMoveEvent={moveEvent} onClickEvent={openItem} onClickSlot={(d, h) => setNewOnDate({ date: d, startHour: h })} />}
        {view === "day" && <DayView cursor={cursor} events={filtered} athletes={athletes} onClickEvent={openItem} onClickSlot={(d, h) => setNewOnDate({ date: d, startHour: h })} />}
      </div>

      {editEvent && (
        <EventEditDrawer
          event={editEvent}
          athletes={athletes}
          allEvents={events}
          onClose={() => setEditEvent(null)}
          onSave={(data) => { updateEvent(editEvent.id, data); setEditEvent(null); }}
          onDelete={() => { deleteEvent(editEvent.id); setEditEvent(null); }}
        />
      )}
      {newOnDate && (
        <EventEditDrawer isNew initialDate={newOnDate} athletes={athletes} allEvents={events} onClose={() => setNewOnDate(null)} onSave={(data) => { createEvent(data); setNewOnDate(null); }} />
      )}
    </div>
  );
}

function CategoryFilter({ cat, label, color, filterCat, setFilterCat }: { cat: string; label: string; color: string; filterCat: Set<string>; setFilterCat: (s: Set<string>) => void }) {
  const on = filterCat.has(cat);
  return (
    <button
      className="btn btn-sm"
      onClick={() => {
        const next = new Set(filterCat);
        on ? next.delete(cat) : next.add(cat);
        setFilterCat(next);
      }}
      style={{ background: on ? color + "1a" : "transparent", color: on ? color : "var(--fg-3)", borderColor: on ? color + "55" : "var(--border-1)", border: "1px solid" }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: on ? color : "var(--fg-3)" }} />
      {label}
    </button>
  );
}

function MonthView({ cursor, events, onMoveEvent, onClickDate, onClickEvent }: { cursor: Date; events: CalItem[]; onMoveEvent: (id: string, d: string) => void; onClickDate: (d: Date) => void; onClickEvent: (e: CalItem) => void }) {
  const { t } = useLane();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - startOffset + 1;
    const date = new Date(year, month, dayNum);
    cells.push({ date, inMonth: dayNum >= 1 && dayNum <= daysInMonth });
  }
  const todayStr = todayIso();
  const eventsForDay = (date: Date) => events.filter((e) => e.date === formatDate(date));
  const [dragOver, setDragOver] = useState<string | null>(null);

  return (
    <div className="cal-grid-month">
      {["weekday.sun", "weekday.mon", "weekday.tue", "weekday.wed", "weekday.thu", "weekday.fri", "weekday.sat"].map((d) => (
        <div key={d} className="cal-day-header">{t(d)}</div>
      ))}
      {cells.map((c, i) => {
        const dayEvents = eventsForDay(c.date);
        const dStr = formatDate(c.date);
        const isToday = dStr === todayStr;
        return (
          <div
            key={i}
            className={`cal-day ${!c.inMonth ? "is-other-month" : ""} ${isToday ? "is-today" : ""} ${dragOver === dStr ? "drag-over" : ""}`}
            onClick={() => onClickDate(c.date)}
            onDragOver={(e) => { e.preventDefault(); setDragOver(dStr); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              const eventId = e.dataTransfer.getData("text/eventId");
              if (eventId) onMoveEvent(eventId, dStr);
              setDragOver(null);
            }}
          >
            <span className="cal-day-num">{c.date.getDate()}</span>
            {dayEvents.slice(0, 3).map((ev) => (
              <div
                key={ev.id}
                className={`cal-event cat-${ev.category}`}
                draggable={!ev.isRace}
                onDragStart={(e) => e.dataTransfer.setData("text/eventId", ev.id)}
                onClick={(e) => { e.stopPropagation(); onClickEvent(ev); }}
                title={ev.isRace ? `${ev.title} · ${ev.athletes.length} entered` : `${ev.title} · ${formatHour(ev.startHour)}`}
              >
                <span className="mono" style={{ fontSize: 9, opacity: 0.85 }}>{ev.isRace ? <Icon name="trophy" size={9} /> : formatHour(ev.startHour)}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</span>
              </div>
            ))}
            {dayEvents.length > 3 && <div className="text-xs muted" style={{ paddingLeft: 4 }}>+{dayEvents.length - 3} {t("cal.more")}</div>}
          </div>
        );
      })}
    </div>
  );
}

function WeekView({ cursor, events, onMoveEvent, onClickEvent, onClickSlot }: { cursor: Date; events: CalItem[]; onMoveEvent: (id: string, d: string) => void; onClickEvent: (e: CalItem) => void; onClickSlot: (d: string, h: number) => void }) {
  const { t, lang } = useLane();
  const loc = localeOf(lang);
  const weekStart = getWeekStart(cursor);
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  const [dragOver, setDragOver] = useState<string | null>(null);

  return (
    <div className="cal-week">
      <div className="time-col">
        <div className="cal-week-col-header" style={{ visibility: "hidden" }}>00:00</div>
        {hours.map((h) => (
          <div key={h} className="hour-row">
            <span className="time-label">{String(h).padStart(2, "0")}:00</span>
          </div>
        ))}
      </div>
      {days.map((d, i) => {
        const dStr = formatDate(d);
        const dayEvents = events.filter((ev) => ev.date === dStr);
        const isToday = dStr === todayIso();
        return (
          <div key={i} className="cal-week-col">
            <div className="cal-week-col-header" style={{ color: isToday ? "var(--accent)" : undefined, textTransform: "capitalize" }}>
              {d.toLocaleDateString(loc, { weekday: "short" })}
              <b style={{ color: isToday ? "var(--accent)" : "var(--fg-1)" }}>{d.getDate()}</b>
            </div>
            <div style={{ position: "relative" }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className={`hour-row ${dragOver === `${dStr}-${h}` ? "drag-over" : ""}`}
                  onClick={() => onClickSlot(dStr, h)}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(`${dStr}-${h}`); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const eventId = e.dataTransfer.getData("text/eventId");
                    if (eventId) onMoveEvent(eventId, dStr);
                    setDragOver(null);
                  }}
                />
              ))}
              {dayEvents.map((ev) => {
                const top = (ev.startHour - 6) * 56;
                const height = Math.max(ev.duration * 56, 24);
                if (top < 0) return null;
                return (
                  <div
                    key={ev.id}
                    className="cal-week-event"
                    draggable={!ev.isRace}
                    onDragStart={(e) => e.dataTransfer.setData("text/eventId", ev.id)}
                    onClick={(e) => { e.stopPropagation(); onClickEvent(ev); }}
                    style={{ top, height, color: catColor(ev.category), background: catBg(ev.category), borderLeftColor: catColor(ev.category) }}
                  >
                    <div className="mono text-xs" style={{ opacity: 0.8 }}>{ev.isRace ? `${ev.athletes.length} ${t("cal.entered")}` : formatHour(ev.startHour)}</div>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({ cursor, events, athletes, onClickEvent, onClickSlot }: { cursor: Date; events: CalItem[]; athletes: Athlete[]; onClickEvent: (e: CalItem) => void; onClickSlot: (d: string, h: number) => void }) {
  const { t, lang } = useLane();
  const loc = localeOf(lang);
  const dStr = formatDate(cursor);
  const byId = new Map(athletes.map((a) => [a.id, a]));
  const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  const dayEvents = events.filter((ev) => ev.date === dStr).sort((a, b) => a.startHour - b.startHour);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="cal-week" style={{ borderRadius: 0, border: "none" }}>
          <div className="time-col">
            {hours.map((h) => (
              <div key={h} className="hour-row">
                <span className="time-label">{String(h).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>
          <div className="cal-week-col" style={{ position: "relative", gridColumn: "span 7" }}>
            {hours.map((h) => (
              <div key={h} className="hour-row" onClick={() => onClickSlot(dStr, h)} />
            ))}
            {dayEvents.map((ev) => {
              const top = (ev.startHour - 6) * 56;
              const height = Math.max(ev.duration * 56, 24);
              if (top < 0) return null;
              return (
                <div
                  key={ev.id}
                  className="cal-week-event"
                  onClick={() => onClickEvent(ev)}
                  style={{ top, height, color: catColor(ev.category), background: catBg(ev.category), borderLeftColor: catColor(ev.category), fontSize: 12, padding: "8px 12px" }}
                >
                  <div className="mono text-xs" style={{ opacity: 0.8 }}>{formatHour(ev.startHour)} · {ev.duration}h · {ev.location}</div>
                  <div className="fw-600">{ev.title}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="col" style={{ gap: 12 }}>
        <div className="card">
          <div className="card-header"><div className="card-title" style={{ textTransform: "capitalize" }}>{cursor.toLocaleDateString(loc, { weekday: "long" })} {t("cal.agenda")}</div></div>
          <div style={{ padding: "8px 0" }}>
            {dayEvents.length === 0 ? (
              <EmptyState icon="calendar" title={t("cal.nothing")} />
            ) : (
              dayEvents.map((ev) => {
                const roster = ev.athletes.map((id) => byId.get(id)).filter(Boolean) as Athlete[];
                return (
                  <button key={ev.id} className="row" style={{ width: "100%", padding: "10px 18px", gap: 12, textAlign: "left" }} onClick={() => onClickEvent(ev)}>
                    <div className="mono text-sm fw-600" style={{ width: 50, color: "var(--accent)" }}>{ev.isRace ? <Icon name="trophy" size={14} /> : formatHour(ev.startHour)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fw-600 text-md">{ev.title}</div>
                      <div className="text-xs muted">{ev.isRace ? `${roster.length} ${roster.length === 1 ? t("cal.athleteWord") : t("cal.athletesWord")} ${t("cal.entered")}${ev.location ? ` · ${ev.location}` : ""}` : `${ev.duration}h · ${ev.location}`}</div>
                      {roster.length > 0 && (
                        <div className="row" style={{ gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                          {roster.slice(0, 6).map((a) => <Avatar key={a.id} name={`${a.first} ${a.last}`} color={a.color} size="xs" />)}
                          {roster.length > 6 && <span className="text-xs muted">+{roster.length - 6}</span>}
                        </div>
                      )}
                    </div>
                    <EventTypeBadge category={ev.category} />
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

function EventEditDrawer({
  event,
  isNew,
  initialDate,
  athletes,
  allEvents,
  onClose,
  onSave,
  onDelete,
}: {
  event?: CalendarEvent;
  isNew?: boolean;
  initialDate?: any;
  athletes: Athlete[];
  allEvents: CalendarEvent[];
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: () => void;
}) {
  const { t } = useLane();
  const init: any =
    event || {
      title: "",
      category: "training" as CalendarCategory,
      date: typeof initialDate === "object" && initialDate?.date ? initialDate.date : initialDate ? formatDate(initialDate) : todayIso(),
      startHour: typeof initialDate === "object" && initialDate?.startHour ? initialDate.startHour : 9,
      duration: 1.5,
      location: "",
      athletes: [] as string[],
    };
  const [form, setForm] = useState<any>(init);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = (k: string, v: any) => setForm({ ...form, [k]: v });

  const toggleAthlete = (id: string) => {
    setForm({ ...form, athletes: form.athletes.includes(id) ? form.athletes.filter((a: string) => a !== id) : [...form.athletes, id] });
  };

  const submit = () => {
    const e: Record<string, string> = {};
    if (!form.title) e.title = t("cal.titleRequired");
    if (!form.date) e.date = t("cal.dateRequired");
    setErrors(e);
    if (Object.keys(e).length === 0) {
      onSave({ ...form, id: form.id || "e" + Math.random().toString(36).slice(2, 6) });
    }
  };

  const conflict = useMemo(() => {
    if (!form.athletes.length) return null;
    const list = allEvents.filter((e) => {
      if (e.id === form.id) return false;
      if (e.date !== form.date) return false;
      const overlap = e.startHour < form.startHour + form.duration && e.startHour + e.duration > form.startHour;
      const sharedAthletes = e.athletes.some((a) => form.athletes.includes(a));
      return overlap && sharedAthletes;
    });
    return list.length > 0 ? list[0] : null;
  }, [form, allEvents]);

  return (
    <Drawer
      open={true}
      onClose={onClose}
      title={isNew ? t("cal.newEvent") : t("cal.editEvent")}
      footer={
        <>
          {!isNew && onDelete && <button className="btn btn-ghost" onClick={onDelete} style={{ color: "var(--danger)", marginRight: "auto" }}><Icon name="trash" size={13} /> {t("common.delete")}</button>}
          <button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn btn-primary" onClick={submit}>{isNew ? t("cal.createEvent") : t("cal.saveChanges")}</button>
        </>
      }
    >
      <div className="col" style={{ gap: 14 }}>
        <div className="field">
          <label className="field-label">{t("cal.fTitle")}</label>
          <input className="input" placeholder={t("cal.fTitlePlaceholder")} value={form.title} onChange={(e) => update("title", e.target.value)} aria-invalid={!!errors.title} autoFocus />
          {errors.title && <span className="field-error"><Icon name="alert" size={11} /> {errors.title}</span>}
        </div>
        <div className="field">
          <label className="field-label">{t("cal.category")}</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            {[
              { v: "training", l: t("cal.catTraining"), c: "var(--success)", i: "activity" },
              { v: "competition", l: t("cal.catCompetition"), c: "var(--danger)", i: "trophy" },
              { v: "travel", l: t("cal.catTravel"), c: "var(--warning)", i: "globe" },
              { v: "meeting", l: t("cal.catMeeting"), c: "var(--accent)", i: "users" },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => update("category", opt.v)}
                style={{
                  padding: 8,
                  borderRadius: "var(--r-md)",
                  border: "1px solid",
                  borderColor: form.category === opt.v ? opt.c : "var(--border-1)",
                  background: form.category === opt.v ? opt.c + "1a" : "var(--bg-2)",
                  color: form.category === opt.v ? opt.c : "var(--fg-2)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  alignItems: "center",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <Icon name={opt.i} size={15} />
                {opt.l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10 }}>
          <div className="field">
            <label className="field-label">{t("cal.date")}</label>
            <input type="date" className="input" value={form.date} onChange={(e) => update("date", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">{t("cal.start")}</label>
            <input
              type="time"
              className="input"
              value={formatHour(form.startHour)}
              onChange={(e) => {
                const [h, m] = e.target.value.split(":").map(Number);
                update("startHour", h + (m || 0) / 60);
              }}
            />
          </div>
          <div className="field">
            <label className="field-label">{t("cal.duration")}</label>
            <select className="input" value={form.duration} onChange={(e) => update("duration", Number(e.target.value))}>
              <option value="0.5">{t("cal.dur30")}</option>
              <option value="1">{t("cal.dur1")}</option>
              <option value="1.5">{t("cal.dur15")}</option>
              <option value="2">{t("cal.dur2")}</option>
              <option value="3">{t("cal.dur3")}</option>
              <option value="4">{t("cal.dur4")}</option>
            </select>
          </div>
        </div>

        {conflict && (
          <div className="card card-pad row" style={{ gap: 10, background: "var(--warning-soft)", borderColor: "var(--warning)", padding: 12 }}>
            <Icon name="warningTri" size={18} style={{ color: "var(--warning)", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="fw-700 text-sm">{t("cal.conflict")}</div>
              <div className="text-xs muted">{t("cal.overlaps")} <b>{conflict.title}</b> {t("cal.at")} {formatHour(conflict.startHour)}.</div>
            </div>
            <button className="btn btn-secondary btn-sm">{t("cal.resolve")}</button>
          </div>
        )}

        <div className="field">
          <label className="field-label">{t("cal.location")}</label>
          <div className="input-group">
            <Icon name="pin" size={14} />
            <input className="input" placeholder={t("cal.locationPlaceholder")} value={form.location} onChange={(e) => update("location", e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label className="field-label">{t("cal.assignAthletes")} <span className="muted text-xs" style={{ fontWeight: 400 }}>· {form.athletes.length} {t("cal.selected")}</span></label>
          <div className="card" style={{ padding: 6, maxHeight: 220, overflowY: "auto" }}>
            {athletes.map((a) => {
              const on = form.athletes.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggleAthlete(a.id)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 4, display: "flex", alignItems: "center", gap: 10, background: on ? "var(--accent-soft)" : "transparent", textAlign: "left" }}
                >
                  <input type="checkbox" checked={on} readOnly />
                  <Avatar name={a.first + " " + a.last} color={a.color} size="xs" />
                  <span className="fw-500 text-sm">{a.first} {a.last}</span>
                  <span className="muted text-xs">{a.specialty}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label className="field-label">{t("cal.reminders")}</label>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            <Tag>{t("cal.dayBefore")}</Tag>
            <Tag>{t("cal.hourBefore")}</Tag>
            <button className="btn btn-ghost btn-sm"><Icon name="plus" size={12} /> {t("common.add")}</button>
          </div>
        </div>

        <div className="card card-pad" style={{ background: "var(--bg-2)", padding: 12 }}>
          <div className="row">
            <Icon name="cloud" size={14} style={{ color: "var(--success)" }} />
            <div className="text-xs fw-600" style={{ color: "var(--success)" }}>{t("cal.autosaving")}</div>
            <span className="spacer" />
            <span className="text-xs muted mono">{t("cal.synced")}</span>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
