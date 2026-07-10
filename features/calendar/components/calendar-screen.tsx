"use client";

// Calendar — Month / Week / Day views, drag events, create/edit, filters.

import React, { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Drawer, EmptyState, Segmented, Tag } from "@/components/primitives";
import { EventTypeBadge, FilterDropdown, formatHour } from "@/components/shared";
import { useLane } from "@/components/lane-provider";
import { EntriesMatrixView } from "./entries-matrix";
import type { Athlete, CalendarEvent, CalendarCategory } from "@/lib/types";

type CalView = "plan" | "month" | "week" | "day";

const getWeekStart = (d: Date) => {
  const out = new Date(d);
  out.setDate(out.getDate() - out.getDay());
  return out;
};
const formatDate = (d: Date) => d.toISOString().slice(0, 10);

const catColor = (cat: string) =>
  cat === "competition" ? "var(--danger)" : cat === "training" ? "var(--success)" : cat === "travel" ? "var(--warning)" : "var(--accent)";
const catBg = (cat: string) =>
  cat === "competition" ? "rgba(245, 91, 110, 0.13)" : cat === "training" ? "rgba(34, 211, 160, 0.13)" : cat === "travel" ? "rgba(245, 177, 76, 0.13)" : "rgba(107, 125, 255, 0.16)";

export function CalendarScreen() {
  const { events, athletes, updateEvent, createEvent, deleteEvent } = useLane();
  // Default to the race-planning matrix (DB-backed); switch to the calendar grids as needed.
  const [view, setView] = useState<CalView>("plan");
  const isTimeView = view === "month" || view === "week" || view === "day";
  const [cursor, setCursor] = useState(new Date(2026, 4, 21));
  const [filterCat, setFilterCat] = useState<Set<string>>(new Set(["competition", "training", "travel", "meeting"]));
  const [filterAthlete, setFilterAthlete] = useState("all");
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [newOnDate, setNewOnDate] = useState<any>(null);

  const filtered = events.filter((e) => {
    if (!filterCat.has(e.category)) return false;
    if (filterAthlete !== "all" && !e.athletes.includes(filterAthlete)) return false;
    return true;
  });

  const moveCursor = (delta: number) => {
    const next = new Date(cursor);
    if (view === "month") next.setMonth(cursor.getMonth() + delta);
    else if (view === "week") next.setDate(cursor.getDate() + delta * 7);
    else next.setDate(cursor.getDate() + delta);
    setCursor(next);
  };

  const today = () => setCursor(new Date(2026, 4, 21));

  const title =
    view === "month"
      ? cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : view === "week"
      ? `Week of ${getWeekStart(cursor).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : cursor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const moveEvent = (eventId: string, newDate: string) => updateEvent(eventId, { date: newDate });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">Drag events to reschedule · Real-time sync across the team</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary"><Icon name="download" size={14} /> Export</button>
          <button className="btn btn-secondary"><Icon name="link" size={14} /> Sync calendars</button>
          <button className="btn btn-primary" onClick={() => setNewOnDate(new Date(cursor))}><Icon name="plus" size={14} /> New event</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ padding: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {isTimeView && (
            <>
              <div className="row" style={{ gap: 4 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => moveCursor(-1)}><Icon name="chevronLeft" size={13} /></button>
                <button className="btn btn-secondary btn-sm" onClick={today}>Today</button>
                <button className="btn btn-secondary btn-sm" onClick={() => moveCursor(1)}><Icon name="chevronRight" size={13} /></button>
              </div>
              <div className="display fw-700" style={{ fontSize: 18, letterSpacing: "-0.02em", marginLeft: 8 }}>{title}</div>

              <div className="row" style={{ gap: 5 }}>
                <CategoryFilter cat="competition" label="Comps" color="var(--danger)" filterCat={filterCat} setFilterCat={setFilterCat} />
                <CategoryFilter cat="training" label="Training" color="var(--success)" filterCat={filterCat} setFilterCat={setFilterCat} />
                <CategoryFilter cat="travel" label="Travel" color="var(--warning)" filterCat={filterCat} setFilterCat={setFilterCat} />
                <CategoryFilter cat="meeting" label="Meetings" color="var(--accent)" filterCat={filterCat} setFilterCat={setFilterCat} />
              </div>

              <FilterDropdown label="Athlete" value={filterAthlete} options={[{ v: "all", l: "All athletes" }, ...athletes.map((a) => ({ v: a.id, l: `${a.first} ${a.last}` }))]} onChange={setFilterAthlete} />
            </>
          )}

          <div className="spacer" />

          <Segmented
            options={[
              { value: "plan", label: "Plan" },
              { value: "month", label: "Month" },
              { value: "week", label: "Week" },
              { value: "day", label: "Day" },
            ]}
            value={view}
            onChange={setView}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 16, overflow: "auto" }}>
        {view === "plan" && <EntriesMatrixView />}
        {view === "month" && <MonthView cursor={cursor} events={filtered} onMoveEvent={moveEvent} onClickDate={(d) => setNewOnDate(d)} onClickEvent={setEditEvent} />}
        {view === "week" && <WeekView cursor={cursor} events={filtered} onMoveEvent={moveEvent} onClickEvent={setEditEvent} onClickSlot={(d, h) => setNewOnDate({ date: d, startHour: h })} />}
        {view === "day" && <DayView cursor={cursor} events={filtered} onClickEvent={setEditEvent} onClickSlot={(d, h) => setNewOnDate({ date: d, startHour: h })} />}
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

function MonthView({ cursor, events, onMoveEvent, onClickDate, onClickEvent }: { cursor: Date; events: CalendarEvent[]; onMoveEvent: (id: string, d: string) => void; onClickDate: (d: Date) => void; onClickEvent: (e: CalendarEvent) => void }) {
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
  const todayStr = "2026-05-21";
  const eventsForDay = (date: Date) => events.filter((e) => e.date === formatDate(date));
  const [dragOver, setDragOver] = useState<string | null>(null);

  return (
    <div className="cal-grid-month">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
        <div key={d} className="cal-day-header">{d}</div>
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
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/eventId", ev.id)}
                onClick={(e) => { e.stopPropagation(); onClickEvent(ev); }}
                title={`${ev.title} · ${formatHour(ev.startHour)}`}
              >
                <span className="mono" style={{ fontSize: 9, opacity: 0.85 }}>{formatHour(ev.startHour)}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</span>
              </div>
            ))}
            {dayEvents.length > 3 && <div className="text-xs muted" style={{ paddingLeft: 4 }}>+{dayEvents.length - 3} more</div>}
          </div>
        );
      })}
    </div>
  );
}

function WeekView({ cursor, events, onMoveEvent, onClickEvent, onClickSlot }: { cursor: Date; events: CalendarEvent[]; onMoveEvent: (id: string, d: string) => void; onClickEvent: (e: CalendarEvent) => void; onClickSlot: (d: string, h: number) => void }) {
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
        const isToday = dStr === "2026-05-21";
        return (
          <div key={i} className="cal-week-col">
            <div className="cal-week-col-header" style={{ color: isToday ? "var(--accent)" : undefined }}>
              {d.toLocaleDateString("en-US", { weekday: "short" })}
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
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/eventId", ev.id)}
                    onClick={(e) => { e.stopPropagation(); onClickEvent(ev); }}
                    style={{ top, height, color: catColor(ev.category), background: catBg(ev.category), borderLeftColor: catColor(ev.category) }}
                  >
                    <div className="mono text-xs" style={{ opacity: 0.8 }}>{formatHour(ev.startHour)}</div>
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

function DayView({ cursor, events, onClickEvent, onClickSlot }: { cursor: Date; events: CalendarEvent[]; onClickEvent: (e: CalendarEvent) => void; onClickSlot: (d: string, h: number) => void }) {
  const dStr = formatDate(cursor);
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
          <div className="card-header"><div className="card-title">{cursor.toLocaleDateString("en-US", { weekday: "long" })} agenda</div></div>
          <div style={{ padding: "8px 0" }}>
            {dayEvents.length === 0 ? (
              <EmptyState icon="calendar" title="Nothing scheduled" />
            ) : (
              dayEvents.map((ev) => (
                <button key={ev.id} className="row" style={{ width: "100%", padding: "10px 18px", gap: 12, textAlign: "left" }} onClick={() => onClickEvent(ev)}>
                  <div className="mono text-sm fw-600" style={{ width: 50, color: "var(--accent)" }}>{formatHour(ev.startHour)}</div>
                  <div style={{ flex: 1 }}>
                    <div className="fw-600 text-md">{ev.title}</div>
                    <div className="text-xs muted">{ev.duration}h · {ev.location}</div>
                  </div>
                  <EventTypeBadge category={ev.category} />
                </button>
              ))
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
  const init: any =
    event || {
      title: "",
      category: "training" as CalendarCategory,
      date: typeof initialDate === "object" && initialDate?.date ? initialDate.date : initialDate ? formatDate(initialDate) : "2026-05-21",
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
    if (!form.title) e.title = "Title required";
    if (!form.date) e.date = "Date required";
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
      title={isNew ? "New event" : "Edit event"}
      footer={
        <>
          {!isNew && onDelete && <button className="btn btn-ghost" onClick={onDelete} style={{ color: "var(--danger)", marginRight: "auto" }}><Icon name="trash" size={13} /> Delete</button>}
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>{isNew ? "Create event" : "Save changes"}</button>
        </>
      }
    >
      <div className="col" style={{ gap: 14 }}>
        <div className="field">
          <label className="field-label">Title</label>
          <input className="input" placeholder="e.g. Speed Endurance Session" value={form.title} onChange={(e) => update("title", e.target.value)} aria-invalid={!!errors.title} autoFocus />
          {errors.title && <span className="field-error"><Icon name="alert" size={11} /> {errors.title}</span>}
        </div>
        <div className="field">
          <label className="field-label">Category</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            {[
              { v: "training", l: "Training", c: "var(--success)", i: "activity" },
              { v: "competition", l: "Competition", c: "var(--danger)", i: "trophy" },
              { v: "travel", l: "Travel", c: "var(--warning)", i: "globe" },
              { v: "meeting", l: "Meeting", c: "var(--accent)", i: "users" },
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
            <label className="field-label">Date</label>
            <input type="date" className="input" value={form.date} onChange={(e) => update("date", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Start</label>
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
            <label className="field-label">Duration</label>
            <select className="input" value={form.duration} onChange={(e) => update("duration", Number(e.target.value))}>
              <option value="0.5">30 min</option>
              <option value="1">1 hour</option>
              <option value="1.5">1.5 hours</option>
              <option value="2">2 hours</option>
              <option value="3">3 hours</option>
              <option value="4">4 hours</option>
            </select>
          </div>
        </div>

        {conflict && (
          <div className="card card-pad row" style={{ gap: 10, background: "var(--warning-soft)", borderColor: "var(--warning)", padding: 12 }}>
            <Icon name="warningTri" size={18} style={{ color: "var(--warning)", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="fw-700 text-sm">Schedule conflict</div>
              <div className="text-xs muted">Overlaps with <b>{conflict.title}</b> at {formatHour(conflict.startHour)}.</div>
            </div>
            <button className="btn btn-secondary btn-sm">Resolve</button>
          </div>
        )}

        <div className="field">
          <label className="field-label">Location</label>
          <div className="input-group">
            <Icon name="pin" size={14} />
            <input className="input" placeholder="e.g. Track 1, Lane Gym" value={form.location} onChange={(e) => update("location", e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label className="field-label">Assign athletes <span className="muted text-xs" style={{ fontWeight: 400 }}>· {form.athletes.length} selected</span></label>
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
          <label className="field-label">Reminders</label>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            <Tag>1 day before</Tag>
            <Tag>1 hour before</Tag>
            <button className="btn btn-ghost btn-sm"><Icon name="plus" size={12} /> Add</button>
          </div>
        </div>

        <div className="card card-pad" style={{ background: "var(--bg-2)", padding: 12 }}>
          <div className="row">
            <Icon name="cloud" size={14} style={{ color: "var(--success)" }} />
            <div className="text-xs fw-600" style={{ color: "var(--success)" }}>Auto-saving</div>
            <span className="spacer" />
            <span className="text-xs muted mono">Synced 2 sec ago</span>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
