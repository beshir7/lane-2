"use client";

// Statistiche + pie chart (photo_28): how a set of race results breaks down by
// finishing place — 1st black · 2nd blue · 3rd green · 4–10 yellow · >10 purple.
// Used on the Races page: an aggregate over all races, and per single race.
// Percentages are taken over ALL entries passed in (DNF/DNS included in the base).

import React from "react";
import { useLane } from "@/components/lane-provider";
import { PLACEMENT_COLORS } from "@/utils";
import type { RaceEntry } from "@/lib/types";

type BucketKey = "first" | "second" | "third" | "mid" | "rest";

const BUCKETS: { key: BucketKey; color: string; statLabel: string; legendLabel: string }[] = [
  { key: "first", color: PLACEMENT_COLORS.first, statLabel: "stats.firstPlaces", legendLabel: "place.first" },
  { key: "second", color: PLACEMENT_COLORS.second, statLabel: "stats.secondPlaces", legendLabel: "place.second" },
  { key: "third", color: PLACEMENT_COLORS.third, statLabel: "stats.thirdPlaces", legendLabel: "place.third" },
  { key: "mid", color: PLACEMENT_COLORS.mid, statLabel: "stats.fromFourToTen", legendLabel: "place.fourToTen" },
  { key: "rest", color: PLACEMENT_COLORS.rest, statLabel: "stats.aboveTen", legendLabel: "place.aboveTen" },
];

function bucketOf(pos?: number | null): BucketKey | null {
  if (pos == null || pos < 1) return null;
  if (pos === 1) return "first";
  if (pos === 2) return "second";
  if (pos === 3) return "third";
  if (pos <= 10) return "mid";
  return "rest";
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x1, y1] = p(start);
  const [x2, y2] = p(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

export function PlacementStats({ entries, totalLabelKey = "stats.results", title }: { entries: RaceEntry[]; totalLabelKey?: string; title?: string }) {
  const { t, lang } = useLane();
  const total = entries.length;
  const counts: Record<BucketKey, number> = { first: 0, second: 0, third: 0, mid: 0, rest: 0 };
  entries.forEach((e) => {
    const b = bucketOf(e.position);
    if (b) counts[b]++;
  });
  const placed = BUCKETS.reduce((s, b) => s + counts[b.key], 0);
  const pct = (n: number) => {
    const s = total ? ((n / total) * 100).toFixed(1) : "0.0";
    return lang === "it" ? s.replace(".", ",") : s;
  };

  // Pie slices proportional to the placed results (the coloured wedges).
  let angle = -Math.PI / 2;
  const R = 54, C = 60;
  const slices = BUCKETS.filter((b) => counts[b.key] > 0).map((b) => {
    const sweep = (counts[b.key] / (placed || 1)) * Math.PI * 2;
    const path = arcPath(C, C, R, angle, angle + sweep);
    angle += sweep;
    return { color: b.color, path };
  });

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="text-xs mono fw-700 muted" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{title ?? t("stats.title")}</div>
      <div className="row" style={{ gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div className="col" style={{ gap: 4, flex: 1, minWidth: 220 }}>
          {BUCKETS.map((b) => (
            <div key={b.key} className="row text-sm" style={{ gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: b.color, flex: "none" }} />
              <span className="fw-700 mono" style={{ minWidth: 22, textAlign: "right" }}>{counts[b.key]}</span>
              <span style={{ color: "var(--fg-2)" }}>{t(b.statLabel)}</span>
              <span className="muted mono">({pct(counts[b.key])}%)</span>
            </div>
          ))}
        </div>
        {placed > 0 && (
          <div className="row" style={{ gap: 14, alignItems: "center" }}>
            <svg viewBox="0 0 120 120" style={{ width: 120, height: 120, flex: "none" }}>
              {slices.length === 1 ? (
                <circle cx={C} cy={C} r={R} fill={slices[0].color} />
              ) : (
                slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="var(--bg-1)" strokeWidth="1" />)
              )}
            </svg>
            <div className="col" style={{ gap: 5 }}>
              {BUCKETS.map((b) => (
                <span key={b.key} className="row text-xs" style={{ gap: 6, color: "var(--fg-3)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: b.color, display: "inline-block" }} />
                  {t(b.legendLabel)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="text-sm muted">{t(totalLabelKey)}: <span className="fw-700" style={{ color: "var(--fg-1)" }}>{total}</span></div>
    </div>
  );
}
