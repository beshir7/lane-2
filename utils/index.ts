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
