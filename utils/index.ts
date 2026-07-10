// Framework-agnostic helpers shared across the UI.

// ---- Formatting ---------------------------------------------------------
export const formatHour = (h: number) => {
  const hour = Math.floor(h);
  const min = Math.round((h - hour) * 60);
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
};

export const toISODate = (d: Date) => d.toISOString().slice(0, 10);

export const shortDate = (iso: string) =>
  new Date(iso + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const getWeekStart = (d: Date) => {
  const out = new Date(d);
  out.setDate(out.getDate() - out.getDay());
  return out;
};

export const initialsOf = (name: string) =>
  name.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

// ---- Calendar category theming ------------------------------------------
export const categoryColor = (cat: string) =>
  cat === "competition" ? "var(--danger)" : cat === "training" ? "var(--success)" : cat === "travel" ? "var(--warning)" : "var(--accent)";

export const categoryBg = (cat: string) =>
  cat === "competition"
    ? "rgba(245, 91, 110, 0.13)"
    : cat === "training"
    ? "rgba(34, 211, 160, 0.13)"
    : cat === "travel"
    ? "rgba(245, 177, 76, 0.13)"
    : "rgba(107, 125, 255, 0.16)";

// ---- Result placement theming -------------------------------------------
// Finishing-place colours used across athlete results, the race results table
// and the list preview: 1st black · 2nd blue · 3rd green · 4–10 yellow · >10 purple.
export const PLACEMENT_COLORS = {
  first: "var(--fg-1)", // 1st — "black" (theme-adaptive so it stays legible)
  second: "#5b6ef5",    // 2nd — blue
  third: "#22d3a0",     // 3rd — green
  mid: "#f5b14c",       // 4–10 — yellow
  rest: "#b96eff",      // above 10 — purple
} as const;

export function placementColor(pos?: number | null): string {
  if (pos == null || pos < 1) return "var(--fg-2)";
  if (pos === 1) return PLACEMENT_COLORS.first;
  if (pos === 2) return PLACEMENT_COLORS.second;
  if (pos === 3) return PLACEMENT_COLORS.third;
  if (pos <= 10) return PLACEMENT_COLORS.mid;
  return PLACEMENT_COLORS.rest;
}

// ---- Browser actions (used to make toolbar buttons real) ----------------
function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, data: unknown) {
  triggerDownload(filename.endsWith(".json") ? filename : `${filename}.json`, new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c])).join(","))].join("\n");
  triggerDownload(filename.endsWith(".csv") ? filename : `${filename}.csv`, new Blob([csv], { type: "text/csv" }));
}

/**
 * Generate a Word document (.doc) from an HTML body and download it. Word opens
 * an HTML file served as `application/msword`, so no heavy docx dependency is
 * needed — the athlete biography (photo_34) is built as styled HTML.
 */
export function downloadWordDoc(filename: string, htmlBody: string, title = "") {
  const doc = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${title}</title><style>
    body { font-family: Calibri, Arial, sans-serif; color: #1a1a1a; font-size: 11pt; }
    h1 { font-size: 22pt; margin: 0 0 2pt; }
    .sub { color: #666; font-size: 11pt; margin: 0 0 16pt; }
    h2 { font-size: 13pt; border-bottom: 1px solid #999; padding-bottom: 3pt; margin: 18pt 0 8pt; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ccc; padding: 4pt 8pt; text-align: left; font-size: 10.5pt; }
    th { background: #f0f0f0; }
    .dl td { border: none; padding: 2pt 8pt 2pt 0; }
    .dl .k { color: #666; width: 180pt; }
    p.bio { line-height: 1.5; white-space: pre-wrap; }
  </style></head><body>${htmlBody}</body></html>`;
  triggerDownload(filename.endsWith(".doc") ? filename : `${filename}.doc`, new Blob([doc], { type: "application/msword" }));
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Open a file picker and resolve with the chosen files. */
export function pickFiles(accept = "*", multiple = true): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = () => resolve(Array.from(input.files || []));
    input.click();
  });
}
