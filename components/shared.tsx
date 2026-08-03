"use client";

// Small components shared across multiple screens.

import React, { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { Icon } from "./icon";
import { Badge } from "./primitives";
import { useLane } from "./lane-provider";
import type { AthleteStatus, CalendarCategory } from "@/lib/types";

// Re-exported from lib/utils so screens can keep importing it from "@/components/shared".
export { formatHour } from "@/utils";

export function DateStack({ date }: { date: string }) {
  const d = new Date(date + "T00:00");
  return (
    <div
      style={{
        width: 44,
        textAlign: "center",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
        border: "1px solid var(--border-1)",
        padding: "4px 6px",
        flexShrink: 0,
      }}
    >
      <div className="mono text-xs" style={{ color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {d.toLocaleDateString("en-US", { month: "short" })}
      </div>
      <div className="display" style={{ fontSize: 16, fontWeight: 800, lineHeight: 1, color: "var(--fg-1)", letterSpacing: "-0.02em" }}>
        {d.getDate()}
      </div>
    </div>
  );
}

export function EventTypeBadge({ category }: { category: CalendarCategory | string }) {
  const { t } = useLane();
  // The calendar tracks two kinds of entry: competitions and meetings.
  const map: Record<string, { v: any; l: string }> = {
    competition: { v: "danger", l: t("cal.catCompetition") },
    meeting: { v: "accent", l: t("cal.catMeeting") },
  };
  const it = map[category] || { v: "accent", l: t("cal.catMeeting") };
  return (
    <Badge variant={it.v} dot>
      {it.l}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: AthleteStatus | string }) {
  const { t } = useLane();
  const variant: Record<string, any> = { active: "success", injury: "danger", pregnant: "warning", inactive: "" };
  const key = `status.${status}`;
  const label = variant[status] !== undefined ? t(key) : status;
  return (
    <Badge variant={variant[status] ?? ""} dot>
      {label}
    </Badge>
  );
}

export function EntryStatusBadge({ status }: { status: string }) {
  const { t } = useLane();
  const variant: Record<string, any> = { proposed: "", waiting: "warning", accepted: "info", ok: "success" };
  const label = variant[status] !== undefined ? t(`entry.${status}`) : status;
  return (
    <Badge variant={variant[status] ?? ""} dot>
      {label}
    </Badge>
  );
}

export function FilterDropdown({
  label,
  value,
  options,
  onChange,
  align = "left",
}: {
  label: string;
  value: string;
  options: { v: string; l: string }[];
  onChange: (v: string) => void;
  // Which edge the menu is anchored to. Use "right" when the control sits at the
  // right of the screen so the menu doesn't overflow past the viewport.
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false), open);
  const current = options.find((o) => o.v === value);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn btn-secondary btn-sm" onClick={() => setOpen(!open)}>
        <span style={{ color: "var(--fg-3)" }}>{label}:</span> {current?.l || "—"} <Icon name="chevronDown" size={12} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            ...(align === "right" ? { right: 0 } : { left: 0 }),
            minWidth: 160,
            maxWidth: "min(220px, calc(100vw - 24px))",
            zIndex: 10,
            background: "var(--bg-1)",
            border: "1px solid var(--border-2)",
            borderRadius: "var(--r-md)",
            boxShadow: "var(--shadow-lift)",
            padding: 4,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {options.map((o) => (
            <button
              key={o.v}
              onClick={() => {
                onChange(o.v);
                setOpen(false);
              }}
              style={{
                padding: "7px 10px",
                borderRadius: 4,
                textAlign: "left",
                fontSize: 13,
                background: o.v === value ? "var(--accent-soft)" : "transparent",
                color: o.v === value ? "var(--accent)" : "var(--fg-1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {o.l}
              {o.v === value && <Icon name="check" size={12} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function InfoRow({ icon, label, value }: { icon: string; label: string; value: ReactNode }) {
  return (
    <div className="row" style={{ gap: 10 }}>
      <Icon name={icon} size={14} style={{ color: "var(--fg-3)" }} />
      <div className="text-xs muted" style={{ width: 80, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div className="text-md fw-500" style={{ flex: 1 }}>
        {value}
      </div>
    </div>
  );
}

/**
 * A label/value tile. Three shapes, one implementation:
 *  - "inline" — bare column in a row of stats (athlete card)
 *  - "card"   — the same, boxed and centred (peek drawer)
 *  - "meta"   — boxed with the label above the value (competition peek header)
 * Long labels ellipsize with the full text on hover, so a wide word like
 * "COMPETIZIONI" can never overlap its neighbour.
 */
export function Stat({
  label,
  value,
  mono,
  variant = "inline",
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  variant?: "inline" | "card" | "meta";
}) {
  const clip: CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  const labelEl = (
    <div
      className="muted"
      title={label}
      style={{
        fontSize: variant === "meta" ? 11 : 10,
        textTransform: "uppercase",
        letterSpacing: variant === "meta" ? "0.04em" : "0.02em",
        ...clip,
      }}
    >
      {label}
    </div>
  );

  if (variant === "meta") {
    return (
      <div className="card card-pad" style={{ padding: "8px 12px", minWidth: 90 }}>
        {labelEl}
        <div className={`fw-700${mono ? " mono" : ""}`} style={{ fontSize: 13, marginTop: 2 }}>{value}</div>
      </div>
    );
  }

  const valueEl = (
    <div
      className={`${variant === "card" ? "display " : ""}fw-700${mono ? " mono" : ""}`}
      style={{ fontSize: variant === "card" ? 16 : 14, letterSpacing: variant === "card" ? "-0.02em" : "-0.01em", ...clip }}
    >
      {value}
    </div>
  );

  return variant === "card" ? (
    <div className="card card-pad" style={{ flex: 1, minWidth: 0, padding: "10px 12px", textAlign: "center" }}>
      {valueEl}
      {labelEl}
    </div>
  ) : (
    <div style={{ flex: 1, minWidth: 0 }}>
      {valueEl}
      {labelEl}
    </div>
  );
}

/** Large coloured numeral over a caption — medal counts on the athlete header. */
export function BigStat({ v, l, c }: { v: ReactNode; l: string; c: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="display fw-700" style={{ fontSize: 26, color: c, letterSpacing: "-0.03em", lineHeight: 1 }}>
        {v}
      </div>
      <div className="text-xs muted" style={{ textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>
        {l}
      </div>
    </div>
  );
}
