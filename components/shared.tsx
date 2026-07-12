"use client";

// Small components shared across multiple screens.

import React, { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
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
  const map: Record<string, { v: any; l: string }> = {
    competition: { v: "danger", l: "Competition" },
    training: { v: "success", l: "Training" },
    travel: { v: "warning", l: "Travel" },
    meeting: { v: "accent", l: "Meeting" },
  };
  const it = map[category] || { v: "", l: category };
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
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);
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
