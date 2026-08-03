// Building blocks for the printable Word documents ("Stampa"): the global print
// menu, the athlete dossier, the competition entry sheet and the document lists
// all assemble the same HTML fragments, so they assemble them from here.

import { downloadWordDoc } from "@/utils";

/** Escape text for interpolation into a document body. */
export const esc = (v: unknown) => String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

/** A bordered table; an empty row set still renders one "—" row so a printed
 *  section never collapses into a bare heading. */
export function tableHtml(headers: string[], rows: (string | number)[][]): string {
  const head = `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>`;
  const body = rows.length
    ? rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${headers.length}">—</td></tr>`;
  return `<table>${head}${body}</table>`;
}

/** Label/value block (the `.dl` style). Rows with no value are dropped, so a
 *  half-filled record prints as a short block rather than a column of dashes. */
export function detailsHtml(rows: [string, unknown][]): string {
  const filled = rows.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "" && String(v) !== "—");
  if (!filled.length) return "";
  return `<table class="dl">${filled.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>`;
}

/** Title + subtitle + one table, downloaded as a .doc. */
export function tableDoc(filename: string, title: string, subtitle: string, headers: string[], rows: (string | number)[][]) {
  downloadWordDoc(filename, `<h1>${esc(title)}</h1><p class="sub">${esc(subtitle)}</p>${tableHtml(headers, rows)}`, title);
}

/** A document split into headed groups (athlete list by country/discipline/sponsor). */
export function groupedDoc(filename: string, title: string, headers: string[], groups: { heading: string; rows: (string | number)[][] }[]) {
  const body = groups.map((g) => `<h2>${esc(g.heading)} (${g.rows.length})</h2>${tableHtml(headers, g.rows)}`).join("");
  downloadWordDoc(filename, `<h1>${esc(title)}</h1>${body}`, title);
}
