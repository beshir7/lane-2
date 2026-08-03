"use client";

// Free, fully in-browser travel-document OCR. The image never leaves the device:
// Tesseract.js reads the text locally, and we parse the Machine-Readable Zone
// (MRZ) — the "<<<<" lines on passports and MRZ visas — with the `mrz` library.
// The MRZ deterministically encodes the document number, names, nationality,
// date of birth and (crucially) the expiry date, so those come out reliably.
//
// Getting a usable read out of a phone photo is most of the work:
//   1. PREPROCESS  — crop to where the MRZ lives, upscale, greyscale, harden
//                    the contrast. Raw photos are too soft and too large.
//   2. TWO PASSES  — the bottom strip first (that's where the MRZ is on every
//                    passport and visa), then the whole image if that misses.
//   3. REPAIR      — OCR mangles the MRZ alphabet ("«" for "<<", stray marks).
//                    Characters are repaired IN PLACE so the fixed-width column
//                    positions the format depends on are preserved, then each
//                    line is snapped to a legal MRZ length (30 / 36 / 44).
//   4. FALL BACK   — `mrz` only knows TD1/TD2/TD3, and dispatches strictly on
//                    line length. Visa MRZs (MRV-A/MRV-B) share line 2's layout
//                    but not its check digits, so when the library refuses we
//                    read the fixed positions ourselves rather than give up.

import { parse } from "mrz";

// The fields the passport/visa forms actually have. Everything here maps to an
// input the user would otherwise type; nothing is extracted "for interest".
// firstName/lastName/sex come free with an MRZ read and are left in for that
// reason, but nothing is failed or retried on their account.
export interface ScanFields {
  documentNumber?: string;
  nationality?: string;    // display name if known, else ISO-3 code
  issueDate?: string;      // ISO yyyy-mm-dd → passport "Issued" / visa "Valid from"
  expirationDate?: string; // ISO yyyy-mm-dd → passport "Expiry"  / visa "Valid to"
  firstName?: string;
  lastName?: string;
  birthDate?: string;      // ISO yyyy-mm-dd — also used to keep a date of birth
                           // from being mistaken for an issue date
  sex?: string;
}

export interface ScanResult {
  ok: boolean;
  message: string;
  valid: boolean;          // MRZ check digits all passed
  fields: ScanFields;
  rawText: string;
}

// ISO-3 → display name for the nationalities the agency deals with most; any
// other code is passed through as-is.
const COUNTRY: Record<string, string> = {
  ETH: "Ethiopia", KEN: "Kenya", ITA: "Italy", ESP: "Spain", GBR: "United Kingdom",
  USA: "United States", NOR: "Norway", FRA: "France", GER: "Germany", NED: "Netherlands",
  MAR: "Morocco", QAT: "Qatar", UGA: "Uganda", TAN: "Tanzania", BDI: "Burundi", ERI: "Eritrea",
  DEU: "Germany", NLD: "Netherlands", BEL: "Belgium", CHE: "Switzerland", AUT: "Austria",
  PRT: "Portugal", POL: "Poland", SWE: "Sweden", DNK: "Denmark", FIN: "Finland",
  IRL: "Ireland", GRC: "Greece", TUR: "Turkey", ROU: "Romania", HUN: "Hungary",
  CZE: "Czechia", HRV: "Croatia", SVN: "Slovenia", SVK: "Slovakia", BGR: "Bulgaria",
  RUS: "Russia", UKR: "Ukraine", CAN: "Canada", MEX: "Mexico", BRA: "Brazil",
  ARG: "Argentina", AUS: "Australia", NZL: "New Zealand", JPN: "Japan", CHN: "China",
  IND: "India", PAK: "Pakistan", RSA: "South Africa", ZAF: "South Africa", NGA: "Nigeria",
  EGY: "Egypt", DZA: "Algeria", TUN: "Tunisia", SEN: "Senegal", CIV: "Côte d'Ivoire",
  GHA: "Ghana", CMR: "Cameroon", RWA: "Rwanda", SOM: "Somalia", SDN: "Sudan",
  SSD: "South Sudan", DJI: "Djibouti", TZA: "Tanzania", ZWE: "Zimbabwe", ZMB: "Zambia",
  BHR: "Bahrain", ARE: "United Arab Emirates", SAU: "Saudi Arabia", KWT: "Kuwait", OMN: "Oman",
};

/** Recognised ISO-3 codes, used to tell a nationality from an adjacent word. */
const ISO3 = new Set(Object.keys(COUNTRY));

/** The only line lengths `mrz` accepts: TD1, TD2/MRV-B, TD3/MRV-A. */
const MRZ_LENGTHS = [30, 36, 44];

// MRZ dates are YYMMDD. Expiry is always in the future (20xx). Births use a
// sliding window: a 2-digit year that would be "in the future" is last century.
function isoDate(yymmdd: string | undefined, kind: "birth" | "expiry"): string | undefined {
  if (!yymmdd || !/^\d{6}$/.test(yymmdd)) return undefined;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  let year: number;
  if (kind === "expiry") {
    year = 2000 + yy; // travel-doc expiries are all this century
  } else {
    const cur2 = new Date().getFullYear() % 100;
    year = yy > cur2 ? 1900 + yy : 2000 + yy;
  }
  if (+mm < 1 || +mm > 12 || +dd < 1 || +dd > 31) return undefined;
  return `${year}-${mm}-${dd}`;
}

// ---- Image preparation ---------------------------------------------------

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode failed")); };
    img.src = url;
  });
}

/**
 * Crop → upscale → greyscale → contrast-stretch. Tesseract reads small, soft
 * MRZ glyphs badly; a hard black-on-white strip at ~2000px wide reads well.
 * `topFraction`/`bottomFraction` select a horizontal band of the source.
 */
function prepare(img: HTMLImageElement, topFraction: number, bottomFraction: number, harden = true): HTMLCanvasElement {
  const sy = Math.floor(img.naturalHeight * topFraction);
  const sh = Math.max(1, Math.floor(img.naturalHeight * (bottomFraction - topFraction)));
  const sw = img.naturalWidth;

  const scale = Math.min(3, Math.max(1, 2000 / sw));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  // Greyscale, then (for MRZ passes) stretch the histogram so the print goes
  // properly black and the paper properly white. A fixed threshold destroys
  // faint scans, so this stretches between the observed 5th/95th percentiles.
  //
  // `harden` is off when reading the printed face of a document: hardening the
  // contrast there also hardens the guilloche security pattern behind the text,
  // which competes with the characters instead of separating from them.
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = px.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    d[i] = d[i + 1] = d[i + 2] = g;
    hist[g]++;
  }
  if (!harden) {
    ctx.putImageData(px, 0, 0);
    return canvas;
  }
  const total = canvas.width * canvas.height;
  let lo = 0, hi = 255, acc = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > total * 0.05) { lo = v; break; } }
  acc = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > total * 0.05) { hi = v; break; } }
  const span = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((d[i] - lo) / span) * 255));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(px, 0, 0);
  return canvas;
}

// ---- MRZ text repair -----------------------------------------------------

/**
 * Repair one OCR line into the MRZ alphabet WITHOUT changing its length — the
 * formats are fixed-width, so a dropped character shifts every field after it.
 * Unknown marks become "<" (filler), which is what they almost always are.
 */
function repairLine(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[«»]/g, "<<")            // one glyph, two fillers
    .replace(/[‹›〈〉≪≫]/g, "<")
    .replace(/[^A-Z0-9<]/g, "<");      // spaces, dashes, specks → filler
}

/**
 * Snap a near-miss length onto a legal one; `mrz` dispatches on it exactly, so
 * a line that is one character out is a line that cannot be read at all.
 *
 * Over-long lines are the common case: the scanner picks up specks past the end
 * of the zone, and every "«" it reads expands to two "<". Trailing filler is
 * dropped before giving up, since none of it carries data.
 */
function snapLength(line: string): string | null {
  const fit = (s: string): string | null => {
    const target = MRZ_LENGTHS.find((n) => Math.abs(s.length - n) <= 3);
    if (!target) return null;
    return s.length > target ? s.slice(0, target) : s.padEnd(target, "<");
  };
  return fit(line) ?? fit(line.replace(/<+$/, "")) ?? (line.length > 44 ? line.slice(0, 44) : null);
}

/**
 * Lines from the OCR text that could plausibly be MRZ, repaired and snapped.
 *
 * The filter has to separate MRZ from the ordinary print on the same page.
 * Repairing turns every space into "<", so a sentence like "REPUBLIC OF
 * SOMEWHERE" comes out looking superficially MRZ-ish — but only real MRZ has
 * RUNS of filler ("<<" name separators, long tails), and a line with no filler
 * at all is only plausible if it's mostly digits, which is what a tightly
 * packed second line looks like. Prose satisfies neither test.
 */
function mrzCandidates(text: string): string[] {
  const out: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const repaired = repairLine(rawLine.trim());
    if (repaired.length < 27) continue;
    const hasFillerRun = /<{2,}/.test(repaired);
    const digitRatio = (repaired.match(/\d/g) || []).length / repaired.length;
    if (!hasFillerRun && digitRatio < 0.35) continue;
    const snapped = snapLength(repaired);
    if (snapped) out.push(snapped);
  }
  return out;
}

// `isoDates` marks the printed path, which resolves full years from the page and
// so needs none of the YYMMDD century-guessing the MRZ path does.
type Parsed = { fields: Record<string, string | null>; valid: boolean; isoDates?: boolean };

function tryParse(lines: string[]): Parsed | null {
  if (lines.length < 2) return null;
  if (new Set(lines.map((l) => l.length)).size !== 1) return null; // must be uniform
  try {
    const r = parse(lines);
    return { fields: r.fields as Record<string, string | null>, valid: !!r.valid };
  } catch {
    return null;
  }
}

/**
 * Read the fixed positions ourselves. Line 2 of TD2 (36), TD3 (44) and both
 * visa formats (MRV-A/MRV-B) share a layout:
 *   0–8 document number · 9 check · 10–12 nationality · 13–18 birth date
 *   19 check · 20 sex · 21–26 expiry · 27 check
 * and line 1 carries "LASTNAME<<FIRSTNAME" from position 5. `mrz` rejects the
 * visa formats outright, so this recovers the fields that matter from them.
 */
function fallbackParse(lines: string[]): Parsed | null {
  const [l1, l2] = lines;
  if (!l1 || !l2 || l2.length < 28) return null;
  if (l1.length !== 36 && l1.length !== 44) return null;

  const documentNumber = l2.slice(0, 9).replace(/</g, "").trim();
  const nationality = l2.slice(10, 13).replace(/</g, "");
  const birthDate = l2.slice(13, 19);
  const sexChar = l2[20];
  const expirationDate = l2.slice(21, 27);
  if (!/^\d{6}$/.test(expirationDate) && !/^\d{6}$/.test(birthDate)) return null;

  const names = l1.slice(5).split("<<");
  const lastName = (names[0] || "").replace(/</g, " ").trim();
  const firstName = (names[1] || "").replace(/</g, " ").trim();

  return {
    valid: false, // no check digits verified on this path — flagged to the user
    fields: {
      documentNumber: documentNumber || null,
      nationality: nationality || null,
      firstName: firstName || null,
      lastName: lastName || null,
      birthDate: /^\d{6}$/.test(birthDate) ? birthDate : null,
      expirationDate: /^\d{6}$/.test(expirationDate) ? expirationDate : null,
      sex: sexChar === "M" || sexChar === "F" ? sexChar : null,
    },
  };
}

/** Every plausible grouping of candidate lines, most-likely first. */
function decode(cands: string[]): Parsed | null {
  const groups: string[][] = [];
  for (let i = cands.length - 2; i >= 0; i--) groups.push([cands[i], cands[i + 1]]);       // pairs, bottom-up
  for (let i = cands.length - 3; i >= 0; i--) groups.push([cands[i], cands[i + 1], cands[i + 2]]); // TD1 triples
  for (const g of groups) { const p = tryParse(g); if (p) return p; }
  for (const g of groups) { const p = fallbackParse(g); if (p) return p; }
  return null;
}

// ---- Printed-field fallback ---------------------------------------------
// Not every travel document shows an MRZ on the side you photograph: a US
// passport card and a French national ID card both keep theirs on the back, and
// plenty of older visas have none at all. The printed fields are right there
// though, so when no MRZ turns up we read those instead — flagged as
// unverified, because unlike an MRZ they carry no check digits.
//
// This path targets EXACTLY the four inputs the passport and visa forms have —
// number, nationality, issue date, expiry date — and returns whatever it
// managed to find. A document that yields three of the four is worth three
// fields the user doesn't have to type, so nothing here fails wholesale.

const MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

/** A date found in the text, with where it was found — labels are matched by
 *  proximity, so the position matters as much as the value. */
type DateHit = { iso: string; index: number; len: number };

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Every date in the text, in the order it appears.
 *
 * Separators vary by issuing country and OCR rarely gets them right anyway:
 * French and Italian cards print "13 07 1990", passports print "29 NOV 2019",
 * and a scanner turns any of "/", "." and "-" into each other freely. So all of
 * them are accepted, including a plain space.
 */
function findDates(text: string): DateHit[] {
  const hits: DateHit[] = [];
  const add = (y: string, mo: number, d: number, index: number, len: number) => {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return;
    hits.push({ iso: `${y}-${pad(mo)}-${pad(d)}`, index, len });
  };
  let m: RegExpExecArray | null;

  // 29 NOV 2019 · 12JUN2024 · 29-NOV-2019
  const alpha = /\b(\d{1,2})\s*[-.\s]?\s*([A-Z]{3})\s*[-.\s]?\s*((?:19|20)\d{2})\b/gi;
  while ((m = alpha.exec(text))) {
    const mo = MONTHS[m[2].toUpperCase()];
    if (mo) add(m[3], +mo, +m[1], m.index, m[0].length);
  }

  // 13 07 1990 · 29/11/2019 · 11.02.2030 · 29-11-2019
  const numeric = /\b(\d{1,2})\s*[-./\s]\s*(\d{1,2})\s*[-./\s]\s*((?:19|20)\d{2})\b/g;
  while ((m = numeric.exec(text))) add(m[3], +m[2], +m[1], m.index, m[0].length);

  // 1990-07-13
  const iso = /\b((?:19|20)\d{2})[-./](\d{1,2})[-./](\d{1,2})\b/g;
  while ((m = iso.exec(text))) add(m[1], +m[2], +m[3], m.index, m[0].length);

  // Same date found by two patterns: keep the earliest sighting.
  const seen = new Map<string, DateHit>();
  for (const h of hits.sort((a, b) => a.index - b.index)) if (!seen.has(h.iso)) seen.set(h.iso, h);
  return [...seen.values()].sort((a, b) => a.index - b.index);
}

// Label spellings, longest first so "DATE OF EXPIRY" wins over bare "EXPIR".
// EN / FR / IT / ES, which covers the documents this agency handles.
const DATE_LABELS = {
  expiry: ["DATE OF EXPIRY", "DATE D'EXPIR", "DATE DEXPIR", "EXPIRY DATE", "VALABLE JUSQU",
           "FECHA DE CADUCIDAD", "VALID UNTIL", "SCADENZA", "CADUCIDAD", "EXPIRES", "EXPIRY", "EXPIR"],
  issue:  ["DATE OF ISSUE", "FECHA DE EXPEDICION", "DATE DE DELIV", "DATA DI RILASCIO",
           "ISSUE DATE", "EMISSIONE", "DELIVREE", "DELIVRE", "RILASCIO", "ISSUED", "ISSUE"],
  birth:  ["DATE OF BIRTH", "FECHA DE NACIMIENTO", "DATE DE NAISS", "DATA DI NASCITA",
           "GEBURTSDATUM", "NAISSANCE", "NACIMIENTO", "NASCITA", "BIRTH"],
};

const NUMBER_LABELS = [
  "PASSPORT CARD NO", "NUMERO DEL DOCUMENTO", "NUMERO DOCUMENTO", "PASSPORT NUMBER",
  "DOCUMENT NUMBER", "N° DU DOCUMENT", "N DU DOCUMENT", "DU DOCUMENT", "CONTROL NUMBER",
  "PASSPORT NO", "DOCUMENT NO", "NUMERO DE DOCUMENTO", "CARD NO", "PASAPORTE",
];

const NATIONALITY_LABELS = ["NATIONALITY", "NATIONALITE", "NAZIONALITA", "CITTADINANZA", "NACIONALIDAD"];

// Three- and four-letter words that sit next to these labels on real documents
// and would otherwise be read as a country code.
const NOT_A_COUNTRY = new Set([
  "DATE", "SEX", "SEXE", "NOM", "LIEU", "NAME", "CARD", "TYPE", "CODE", "BIRTH", "NAIS",
  "DOB", "PAYS", "ETAT", "VILLE", "DATA", "LUOGO", "NUM", "NO", "AND", "THE", "OF",
]);

/**
 * Blank out every date, preserving length so label positions stay valid.
 * Used before scanning for country codes — see the call site for why.
 */
function maskDates(upper: string, dates: DateHit[]): string {
  const chars = [...upper];
  for (const d of dates) for (let i = d.index; i < d.index + d.len && i < chars.length; i++) chars[i] = " ";
  return chars.join("");
}

/**
 * Find `labels` in the text and return the date that belongs to one of them.
 *
 * "The next date after the label" is not good enough. Travel documents print
 * their fields in COLUMNS, so a page reads as a row of labels followed by a row
 * of values:
 *
 *     Date of issue      Date of expiry
 *     02 MAR 2021        01 MAR 2026
 *
 * Taking the next date after "Date of expiry" yields 02 MAR 2021 — the issue
 * date — and quietly puts an expiry three years early on the record. So a value
 * on a following line is matched by COLUMN instead: the date whose horizontal
 * position is closest to where the label starts.
 */
function dateNearLabel(upper: string, dates: DateHit[], labels: string[]): string | undefined {
  const lineStarts = [0];
  for (let i = 0; i < upper.length; i++) if (upper[i] === "\n") lineStarts.push(i + 1);
  const posOf = (index: number) => {
    let line = 0;
    for (let i = 1; i < lineStarts.length && lineStarts[i] <= index; i++) line = i;
    return { line, col: index - lineStarts[line] };
  };

  for (const label of labels) {
    const i = upper.indexOf(label);
    if (i === -1) continue;
    const end = i + label.length;
    const at = posOf(i);

    // Same line, after the label — unambiguous, take it.
    const inline = dates.find((d) => d.index >= end && posOf(d.index).line === at.line);
    if (inline) return inline.iso;

    // Otherwise look below, within the field group, and match by column.
    const below = dates
      .filter((d) => {
        const p = posOf(d.index);
        return p.line > at.line && p.line <= at.line + 3;
      })
      .sort((a, b) =>
        Math.abs(posOf(a.index).col - at.col) - Math.abs(posOf(b.index).col - at.col) ||
        a.index - b.index
      );
    if (below.length) return below[0].iso;
  }
  return undefined;
}

/**
 * First capture of `pattern` in the window following any of `labels` that also
 * satisfies `accept`.
 *
 * The predicate has to be applied while scanning, not to the first match alone:
 * a label is usually followed by its own translation ("N° DU DOCUMENT /
 * Document No."), so the first thing matching a loose pattern is very often a
 * word from the label itself rather than the value.
 */
function afterLabel(
  upper: string,
  labels: string[],
  pattern: RegExp,
  window = 60,
  accept: (v: string) => boolean = () => true
): string | undefined {
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  for (const label of labels) {
    const i = upper.indexOf(label);
    if (i === -1) continue;
    const slice = upper.slice(i + label.length, i + label.length + window);
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(slice))) {
      const v = (m[1] || m[0]).trim();
      if (accept(v)) return v;
    }
  }
  return undefined;
}

/**
 * Work out which date is which.
 *
 * Labels first, because they're unambiguous when they survive OCR. When they
 * don't, fall back on the arithmetic that holds for every travel document: the
 * birth date is the earliest date on the page, the expiry the latest, and an
 * issue date — if there is one — sits between them and is in the past.
 */
function assignDates(upper: string, dates: DateHit[]): { birth?: string; issued?: string; expiry?: string } {
  const today = new Date().toISOString().slice(0, 10);
  let birth = dateNearLabel(upper, dates, DATE_LABELS.birth);
  let issued = dateNearLabel(upper, dates, DATE_LABELS.issue);
  let expiry = dateNearLabel(upper, dates, DATE_LABELS.expiry);

  const chronological = [...new Set(dates.map((d) => d.iso))].sort();
  const spare = chronological.filter((d) => d !== birth && d !== issued && d !== expiry);

  // Earliest unclaimed date is a birth date if it's implausibly old to be an
  // issue date — nobody holds a travel document issued 30 years ago.
  if (!birth && spare.length > 1 && spare[0] < `${new Date().getFullYear() - 25}-01-01`) {
    birth = spare.shift();
  }
  if (!expiry && spare.length) {
    const latest = spare[spare.length - 1];
    if (!birth || latest > birth) expiry = spare.pop();
  }
  if (!issued && spare.length) {
    const past = spare.filter((d) => d <= today && (!birth || d > birth));
    if (past.length) issued = past[past.length - 1];
  }

  // Discard anything that contradicts the others rather than filling a form
  // field with a date that cannot be right.
  if (expiry && birth && expiry <= birth) expiry = undefined;
  if (issued && expiry && issued >= expiry) issued = undefined;
  if (issued && birth && issued <= birth) issued = undefined;
  return { birth, issued, expiry };
}

/** Read the four form fields off the printed face of a document. */
function parsePrintedFields(text: string): Parsed | null {
  const upper = text.toUpperCase();
  const dates = findDates(upper);
  const { birth, issued, expiry } = assignDates(upper, dates);

  // Document numbers are 6–12 alphanumerics containing at least one digit — the
  // digit is what separates "X4RTBPFW4" from the words "DOCUMENT" and
  // "SIGNATURE" printed beside it.
  const documentNumber = afterLabel(upper, NUMBER_LABELS, /\b([A-Z0-9]{6,12})\b/, 60, (v) => /\d/.test(v));

  // Country codes are hunted for in text with the dates blanked out, because
  // month abbreviations collide with them outright — "14 SEP 1996" offers SEP,
  // and MAR in "02 MAR 2021" is a perfectly good code for Morocco.
  const masked = maskDates(upper, dates);
  let nationality =
    // A recognised code beside the label is the best evidence there is.
    afterLabel(masked, NATIONALITY_LABELS, /\b([A-Z]{3})\b/, 80, (v) => ISO3.has(v)) ??
    // Otherwise an unlisted code, as long as it isn't an ordinary document word.
    afterLabel(masked, NATIONALITY_LABELS, /\b([A-Z]{3})\b/, 80, (v) => !NOT_A_COUNTRY.has(v));
  if (!nationality) {
    // No usable label — some cards print the code far from it, or spell the
    // nationality out in words. Take the only recognised code on the page, if
    // there is exactly one; more than one and there's no way to tell which.
    const found = [...new Set((masked.match(/\b[A-Z]{3}\b/g) || []).filter((c) => ISO3.has(c)))];
    if (found.length === 1) nationality = found[0];
  }

  // Anything at all is worth handing back; the user checks it either way.
  if (!documentNumber && !nationality && !issued && !expiry) return null;

  return {
    valid: false,
    isoDates: true,
    fields: {
      documentNumber: documentNumber || null,
      nationality: nationality || null,
      issueDate: issued || null,
      expirationDate: expiry || null,
      birthDate: birth || null,
      firstName: null,
      lastName: null,
      sex: null,
    },
  };
}

// ---- Entry point ---------------------------------------------------------

export async function scanTravelDoc(file: File): Promise<ScanResult> {
  const fail = (message: string, rawText = ""): ScanResult => ({ ok: false, message, valid: false, fields: {}, rawText });

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return fail("Couldn't open that file. Use a JPG or PNG photo of the document.");
  }

  let rawText = "";
  let parsed: Parsed | null = null;
  let printedFallback = false;

  try {
    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker("eng");
    try {
      // The MRZ alphabet only — stops "0/O" and "1/I" drifting into letters.
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
        // 6 = one uniform block of text, which is exactly what an MRZ strip is.
        tessedit_pageseg_mode: "6" as unknown as never,
      });

      // Bottom 38% first — the MRZ sits at the foot of every passport data page
      // and MRZ visa. Then the whole image, for photos already cropped tight or
      // laid out unusually.
      for (const [top, bottom] of [[0.62, 1], [0, 1]] as [number, number][]) {
        const canvas = prepare(img, top, bottom);
        const { data } = await worker.recognize(canvas);
        const text = data.text || "";
        rawText = rawText ? `${rawText}\n---\n${text}` : text;
        parsed = decode(mrzCandidates(text));
        if (parsed) break;
      }

      // Still nothing: this side of the document has no MRZ (a passport card
      // and a French ID card both keep it on the back). Read the printed fields
      // instead — full charset this time, because the MRZ whitelist strips the
      // spaces and lowercase that ordinary labels need.
      //
      // Two segmentation modes, because ID cards defeat either one alone: 3
      // (auto) handles a document laid out as running text, 11 (sparse) handles
      // labels scattered across columns around a portrait, which is what a
      // national ID card is. The results are concatenated and parsed together —
      // every field is found by label or by date, so extra text is harmless
      // while a missing line is fatal.
      if (!parsed) {
        await worker.setParameters({ tessedit_char_whitelist: "" });
        const canvas = prepare(img, 0, 1, false);
        let printed = "";
        for (const psm of ["3", "11"]) {
          await worker.setParameters({ tessedit_pageseg_mode: psm as unknown as never });
          const { data } = await worker.recognize(canvas);
          printed += (printed ? "\n" : "") + (data.text || "");
        }
        rawText = `${rawText}\n---\n${printed}`;
        parsed = parsePrintedFields(printed);
        if (parsed) printedFallback = true;
      }
    } finally {
      await worker.terminate();
    }
  } catch {
    return fail("Couldn't read the image. Try a clearer, straight-on photo.", rawText);
  }

  if (!parsed) {
    const chars = rawText.replace(/\s/g, "").length;
    return fail(
      chars < 40
        ? "Almost nothing was readable in that image — try a sharper, straight-on photo in good light."
        : "Read the text but found no document number, nationality or dates on it. If this is an ID or passport card, photograph the side showing those fields.",
      rawText
    );
  }

  const f = parsed.fields;
  const nat = (f.nationality || "").toUpperCase();
  // The printed path resolves full years itself; only MRZ dates need decoding.
  const dateOf = (v: string | null | undefined, kind: "birth" | "expiry") =>
    !v ? undefined : parsed!.isoDates ? v : isoDate(v, kind);

  const fields: ScanFields = {
    documentNumber: f.documentNumber || undefined,
    nationality: nat ? COUNTRY[nat] || nat : undefined,
    issueDate: dateOf(f.issueDate, "birth"),
    expirationDate: dateOf(f.expirationDate, "expiry"),
    firstName: f.firstName || undefined,
    lastName: f.lastName || undefined,
    birthDate: dateOf(f.birthDate, "birth"),
    sex: f.sex || undefined,
  };

  // Name the fields that were actually filled. A partial read is a useful read,
  // and saying which parts landed is what tells the user where to look.
  const filled = [
    fields.documentNumber && "number",
    fields.nationality && "nationality",
    fields.issueDate && "issued",
    fields.expirationDate && `expiry ${fields.expirationDate}`,
  ].filter(Boolean) as string[];
  const summary = filled.length ? filled.join(" · ") : "no form fields";

  const message = printedFallback
    ? `No code found — read the printed text: ${summary}. Please check every field.`
    : parsed.valid
    ? `Read successfully · ${summary}`
    : `Read (some checks failed) · ${summary} — please verify`;

  return { ok: true, message, valid: parsed.valid, fields, rawText };
}
