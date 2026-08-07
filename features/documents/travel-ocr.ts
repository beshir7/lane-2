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
  visaType?: string;       // e.g. "B1/B2"   → visa "Type"
  issuingPost?: string;    // e.g. "BEIJING" → visa "Embassy"
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
/**
 * How far below its local mean a pixel must be to count as ink.
 *
 * This is the single most consequential number in the file, because it decides
 * whether 3, 6 and 9 stay themselves or collapse into 8. Each of those is an 8
 * with one side open, so ink that spreads by a pixel or two closes the gap and
 * the glyph becomes a different digit that is still perfectly plausible on a
 * form. A sweep against a card whose expiry is known to read "29 NOV 2019":
 *
 *   t=0.04  "29 NOV 20 RY"    ink floods, digits dissolve
 *   t=0.08  "29 NOV 2038"     1→3 and 9→8, both gaps closed
 *   t=0.14  "29 NOV 2018"     9→8
 *   t=0.22  "29 NOV 2018"     9→8
 *   t=0.30  "29 NOV 201"      last digit starts breaking up
 *   t=0.38  "29 NOV 2019"     correct — and the fastest of the sweep
 *
 * Higher is not simply better: past this the strokes thin until they break, so
 * a lighter threshold is kept alongside as its own pass rather than replaced.
 */
const INK_T = 0.38;
const HEAVY_INK_T = 0.14;

/**
 * Bradley–Roth adaptive threshold: each pixel is compared against the mean of
 * its own neighbourhood rather than one level for the whole image.
 *
 * An ID card is half dark portrait and half light text panel, so a single
 * global threshold is dragged toward the photo and washes the text out. A local
 * one judges the print against the paper immediately around it. The integral
 * image makes every window a constant-time lookup.
 */
function adaptiveThreshold(d: Uint8ClampedArray, w: number, h: number, t = INK_T) {
  const sum = new Uint32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += d[(y * w + x) * 4];
      sum[(y + 1) * (w + 1) + (x + 1)] = sum[y * (w + 1) + (x + 1)] + rowSum;
    }
  }
  const half = Math.max(4, Math.floor(w / 32));
  // `t` is how far below the local mean counts as ink. Raising it spreads the
  // ink, which is what closes the open side of a 3, 6 or 9 and turns it into an
  // 8; lowering it keeps those gaps open at the cost of breaking faint strokes.
  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - half);
    const y2 = Math.min(h - 1, y + half);
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - half);
      const x2 = Math.min(w - 1, x + half);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const area =
        sum[(y2 + 1) * (w + 1) + (x2 + 1)] - sum[y1 * (w + 1) + (x2 + 1)] -
        sum[(y2 + 1) * (w + 1) + x1] + sum[y1 * (w + 1) + x1];
      const i = (y * w + x) * 4;
      const v = d[i] * count <= area * (1 - t) ? 0 : 255;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  }
}

type PrepMode = "grey" | "stretch" | "adaptive";

function prepare(
  img: HTMLImageElement,
  topFraction: number,
  bottomFraction: number,
  mode: PrepMode = "stretch",
  targetWidth = 2000,
  /** Ink threshold for the adaptive modes; exposed so it can be swept. */
  inkT?: number
): HTMLCanvasElement {
  const sy = Math.floor(img.naturalHeight * topFraction);
  const sh = Math.max(1, Math.floor(img.naturalHeight * (bottomFraction - topFraction)));
  const sw = img.naturalWidth;

  // Tesseract reads best at roughly 2000–3000px across, needing ~30px of
  // character height. A 690px-wide card scan gives about 10px, so it has to be
  // upscaled hard — capping at 3x leaves that kind of image permanently
  // unreadable. A big phone photo is scaled DOWN into the same band, which
  // loses no legible detail and avoids a canvas large enough to stall the tab.
  const scale = Math.min(5, Math.max(0.4, targetWidth / sw));
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
  // "grey" leaves it alone — hardening the contrast on a printed face also
  // hardens the guilloche security pattern behind the text. "stretch" pulls the
  // histogram apart globally, which suits an MRZ strip. "adaptive" thresholds
  // against the local neighbourhood, which is what a card with a portrait on
  // one side and a text panel on the other needs.
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = px.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    d[i] = d[i + 1] = d[i + 2] = g;
    hist[g]++;
  }
  if (mode === "grey") {
    ctx.putImageData(px, 0, 0);
    return canvas;
  }
  if (mode === "adaptive") {
    adaptiveThreshold(d, canvas.width, canvas.height, inkT);
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
  const lines = text.split(/\r?\n/).map((l) => repairLine(l.trim()));
  const strong = lines.map(
    (l) => l.length >= 27 && (/<{2,}/.test(l) || (l.match(/\d/g) || []).length / l.length >= 0.35)
  );

  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length < 27) continue;
    // A line qualifies on its own evidence, or on its neighbour's. The zone is
    // always two or three lines TOGETHER, and the name line's "<<<<" tail is
    // exactly what OCR mangles worst — read as "KLKLKLKL" it has neither filler
    // runs nor digits and gets thrown out, which leaves the surviving number
    // line with no partner to be parsed against. The number line underneath is
    // unmistakable, and it vouches for the line above it.
    if (!strong[i] && !strong[i - 1] && !strong[i + 1]) continue;
    const snapped = snapLength(lines[i]);
    if (snapped) out.push(snapped);
  }
  return out;
}

// `isoDates` marks the printed path, which resolves full years from the page and
// so needs none of the YYMMDD century-guessing the MRZ path does.
type Parsed = {
  fields: Record<string, string | null>;
  valid: boolean;
  isoDates?: boolean;
  /** Fields where two OCR passes produced different answers — worth saying. */
  disputed?: string[];
};

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

  // The whole layout has to hold, not just one field of it. There are no check
  // digits on this path, so the fixed positions ARE the evidence that this is a
  // machine-readable zone and not a line of card art that survived OCR at the
  // right length. Accepting a partial match let a passport card with no MRZ at
  // all report a document number of "  CHR OL".
  if (!/^[A-Z0-9]{5,9}$/.test(documentNumber)) return null;
  if (!/^[A-Z]{3}$/.test(nationality)) return null;
  if (!/^\d{6}$/.test(birthDate) || !/^\d{6}$/.test(expirationDate)) return null;
  if (!/^[MFX<]$/.test(sexChar)) return null;
  // Check-digit columns: still digits even when we can't verify them.
  if (!/^[\d<]$/.test(l2[9]) || !/^[\d<]$/.test(l2[19]) || !/^[\d<]$/.test(l2[27])) return null;

  // Names need the "<<" separator to be split at all. Without it the line is one
  // run, and taking it as both names yields the same nonsense twice.
  const names = l1.includes("<<") ? l1.slice(5).split("<<") : [];
  const lastName = (names[0] || "").replace(/</g, " ").trim();
  const firstName = (names[1] || "").replace(/</g, " ").trim();

  return {
    valid: false, // no check digits verified on this path — flagged to the user
    fields: {
      documentNumber,
      nationality,
      firstName: firstName || null,
      lastName: lastName || null,
      birthDate,
      expirationDate,
      sex: sexChar === "M" || sexChar === "F" ? sexChar : null,
    },
  };
}

/**
 * Could these fields have come from a real machine-readable zone?
 *
 * `mrz` will happily parse lines that merely have the right SHAPE and report
 * the check digits as failed — which is the correct answer for a genuine
 * passport photographed badly, and a useless one for a card that has no MRZ,
 * where it invents a document number of "  CHR OL" out of card art. Since a
 * failed-check parse still overrides the printed read, it has to look like an
 * MRZ before it is allowed to.
 */
function plausibleMrz(p: Parsed): boolean {
  const f = p.fields;
  return (
    /^[A-Z0-9]{5,9}$/.test(f.documentNumber || "") &&
    /^[A-Z]{3}$/.test(f.nationality || "") &&
    /^\d{6}$/.test(f.birthDate || "") &&
    /^\d{6}$/.test(f.expirationDate || "")
  );
}

/** Every plausible grouping of candidate lines, most-likely first. */
function decode(cands: string[]): Parsed | null {
  const groups: string[][] = [];
  for (let i = cands.length - 2; i >= 0; i--) groups.push([cands[i], cands[i + 1]]);       // pairs, bottom-up
  for (let i = cands.length - 3; i >= 0; i--) groups.push([cands[i], cands[i + 1], cands[i + 2]]); // TD1 triples
  // A verified parse is beyond question; an unverified one must look the part.
  for (const g of groups) { const p = tryParse(g); if (p && (p.valid || plausibleMrz(p))) return p; }
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

/**
 * A month name, tolerating ONE misread character.
 *
 * "12JUN2024" comes back off a real visa as "120UN2024" — the J read as a 0 —
 * and an exact lookup throws the whole date away, which is how an expiry ends
 * up blank on a card that prints it perfectly legibly. The surrounding shape is
 * already strong evidence: a 1–2 digit day, three characters, a four-digit year
 * starting 19 or 20. Against that, one wrong letter is worth forgiving.
 *
 * Only forgiving ONE character, and only when exactly one month fits, is what
 * keeps it honest — "JIN" sits one edit from both JAN and JUN, so it resolves to
 * neither. Exact matches are taken first, so no real month is ever second-guessed.
 */
const MONTH_NAMES = Object.keys(MONTHS);

function fuzzyMonth(raw: string): string | undefined {
  const s = raw.toUpperCase();
  if (MONTHS[s]) return MONTHS[s];
  let found: string | undefined;
  for (const name of MONTH_NAMES) {
    let diff = 0;
    for (let i = 0; i < 3; i++) if (name[i] !== s[i]) diff++;
    if (diff !== 1) continue;
    if (found) return undefined; // two months fit — no way to choose
    found = MONTHS[name];
  }
  return found;
}

/** A date found in the text, with where it was found — labels are matched by
 *  proximity, so the position matters as much as the value. */
type DateHit = { iso: string; index: number; len: number };

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Every date in the text, in the order it appears.
 *
 * Separators vary by issuing country and OCR rarely gets them right anyway:
 * French and Italian cards print "13 07 1990", passports print "29 NOV 2019",
 * US visas run them together as "28MAY2005", and a scanner turns any of "/",
 * "." and "-" into each other freely. So all of them are accepted, including a
 * plain space.
 *
 * `monthFirst` decides 03/04 in favour of the American reading. It only matters
 * when both halves could be a month — 08/21 is month-first whatever the caller
 * says, because there is no 21st month.
 */
function findDates(text: string, monthFirst = false): DateHit[] {
  const hits: DateHit[] = [];
  const add = (y: string, mo: number, d: number, index: number, len: number) => {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return;
    hits.push({ iso: `${y}-${pad(mo)}-${pad(d)}`, index, len });
  };
  // Resolve a two-number date whose order isn't fixed by the format.
  const addPair = (a: number, b: number, y: string, index: number, len: number) => {
    if (a > 12 && b <= 12) add(y, b, a, index, len);        // 21/08 — day first
    else if (b > 12 && a <= 12) add(y, a, b, index, len);   // 08/21 — month first
    else if (monthFirst) add(y, a, b, index, len);
    else add(y, b, a, index, len);
  };
  let m: RegExpExecArray | null;

  // 29 NOV 2019 · 12JUN2024 · 29-NOV-2019 · 120UN2024
  // The month slot admits digits because that is how OCR mangles it — see
  // fuzzyMonth. A three-character run that isn't a month is rejected there.
  const alpha = /\b(\d{1,2})\s*[-.\s]?\s*([A-Z0-9]{3})\s*[-.\s]?\s*((?:19|20)\d{2})\b/gi;
  while ((m = alpha.exec(text))) {
    const mo = fuzzyMonth(m[2]);
    if (mo) add(m[3], +mo, +m[1], m.index, m[0].length);
  }

  // 13 07 1990 · 29/11/2019 · 11.02.2030 · 29-11-2019
  const numeric = /\b(\d{1,2})\s*[-./\s]\s*(\d{1,2})\s*[-./\s]\s*((?:19|20)\d{2})\b/g;
  while ((m = numeric.exec(text))) addPair(+m[1], +m[2], m[3], m.index, m[0].length);

  // 08/21/07 — two-digit year, as US cards print it. A separator is required
  // (a bare "13 07 90" is too easily an ordinary run of numbers), and the
  // trailing guard stops this swallowing the first half of a four-digit year.
  const cur2 = new Date().getFullYear() % 100;
  const shortYear = /\b(\d{1,2})[-./](\d{1,2})[-./](\d{2})(?!\d)/g;
  while ((m = shortYear.exec(text))) {
    const yy = +m[3];
    addPair(+m[1], +m[2], String(yy <= cur2 + 20 ? 2000 + yy : 1900 + yy), m.index, m[0].length);
  }

  // 1990-07-13
  const iso = /\b((?:19|20)\d{2})[-./](\d{1,2})[-./](\d{1,2})\b/g;
  while ((m = iso.exec(text))) add(m[1], +m[2], +m[3], m.index, m[0].length);

  // Deduplicate by POSITION, not by value. A card often prints the same date
  // twice — small at the top and again under its label — and collapsing those
  // into one sighting throws away the labelled occurrence, leaving the label
  // with no date beneath it to claim. Only genuinely overlapping matches (the
  // same span picked up by two patterns) are dropped.
  const kept: DateHit[] = [];
  for (const h of hits.sort((a, b) => a.index - b.index || b.len - a.len)) {
    const overlaps = kept.some((k) => h.index < k.index + k.len && k.index < h.index + h.len);
    if (!overlaps) kept.push(h);
  }
  return kept;
}

// Label spellings, longest first so "DATE OF EXPIRY" wins over bare "EXPIR".
// EN / FR / IT / ES, which covers the documents this agency handles.
const DATE_LABELS = {
  expiry: ["DATE OF EXPIRATION", "DATE OF EXPIRY", "EXPIRATION DATE", "DATE D'EXPIR", "DATE DEXPIR",
           "EXPIRY DATE", "VALABLE JUSQU", "FECHA DE CADUCIDAD", "DATE OF EXPIR", "CARD EXPIRES",
           "VALID UNTIL", "VALID THRU", "VALID TO", "GOOD UNTIL", "EXPIRES ON", "EXPIRATION",
           "SCADENZA", "CADUCIDAD", "EXPIRES", "EXPIRY", "EXPIR", "GULTIG BIS"],
  issue:  ["DATE OF ISSUANCE", "FECHA DE EXPEDICION", "FECHA DE EMISION", "DATA DI EMISSIONE",
           "DATE OF ISSUE", "DATA DI RILASCIO", "DATE DE DELIVRANCE", "RESIDENT SINCE",
           "DATE DE DELIV", "ISSUANCE DATE", "DATE ISSUED", "ISSUE DATE", "VALID FROM",
           "ISSUED ON", "ISSUED AT", "EMISSIONE", "DELIVREE", "DELIVRE", "RILASCIO",
           "EXPEDIDO", "ISSUED", "ISSUE"],
  birth:  ["DATE OF BIRTH", "FECHA DE NACIMIENTO", "DATE DE NAISSANCE", "DATA DI NASCITA",
           "DATE DE NAISS", "GEBURTSDATUM", "BIRTH DATE", "NAISSANCE", "NACIMIENTO",
           "NASCITA", "BIRTH", "D.O.B", "DOB"],
};

// Ordered by how specifically each names THIS document. "Control number" comes
// before "passport number" because only a visa carries both, and there the
// control number is the visa's own — a passport has no control number for the
// earlier entry to steal.
const NUMBER_LABELS = [
  "CONTROL NUMBER", "CONTROL NO", "PASSPORT CARD NO", "PASSPORT CARD NUMBER",
  "NUMERO DEL DOCUMENTO", "NUMERO DE DOCUMENTO", "NUMERO DOCUMENTO", "DOCUMENT NUMBER",
  "IDENTIFICATION NO", "REGISTRATION NO", "N° DU DOCUMENT", "N DU DOCUMENT", "DU DOCUMENT",
  "PASSPORT NUMBER", "CERTIFICATE NO", "N. DOCUMENTO", "SERIAL NUMBER", "IDENTITY NO",
  "PASSPORT NO", "DOCUMENT NO", "SERIAL NO", "PERMIT NO", "CARD NUMBER", "PASSPORT #",
  "CARD NO", "PASAPORTE", "USCIS", "DOC NO", "ID NO", "CARD #",
  // Bare "Passport" last: on a passport card the number sits under a heading
  // that OCR often clips to just the word, and by this point every more
  // specific spelling has already been tried.
  "PASSPORT",
];

const NATIONALITY_LABELS = ["NATIONALITY", "NATIONALITE", "NAZIONALITA", "CITTADINANZA",
                            "NACIONALIDAD", "CITIZENSHIP", "STAATSANGEHORIGKEIT"];

// Visa-only fields. No MRZ format encodes either, so the printed side is the
// only place they exist — which is why a visa scan reads the print even when
// its machine-readable zone parsed cleanly.
const VISA_TYPE_LABELS = ["VISA TYPE /CLASS", "VISA TYPE/CLASS", "VISA TYPE", "TYPE / CLASS", "TYPE/CLASS", "CLASS"];
const POST_LABELS = ["ISSUING POST NAME", "ISSUING POST", "ISSUING AUTHORITY", "PLACE OF ISSUE",
                     "ISSUED AT", "CONSULATE", "EMBASSY"];

// Label words that would otherwise be read as an issuing post — the label row
// and the value row sit next to each other on a visa.
const NOT_A_POST = new Set([
  "CONTROL", "NUMBER", "SURNAME", "GIVEN", "NAME", "NAMES", "VISA", "TYPE", "CLASS", "SEX",
  "BIRTH", "DATE", "NATIONALITY", "ENTRIES", "ANNOTATION", "PASSPORT", "EXPIRATION", "ISSUE",
  "ISSUING", "POST", "UNITED", "STATES", "AMERICA", "THE", "AND", "OF",
]);

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

// "Place of birth" contains the word BIRTH, so a loose birth-date label matches
// it and anchors the date search on the wrong field — on a passport card that
// puts the issue date where the date of birth should be. Blanked out first,
// preserving length so every other label's position survives.
const PLACE_OF_BIRTH =
  /\b(?:PLACE|PIECE|PLAGE|LIEU|LUOGO|LUGAR|COUNTRY|PAYS|LOCAL)\b[^\n]{0,6}?\b(?:OF|DE|DI|DEL)?\b[^\n]{0,4}?\b(?:BIRTH|SIRTH|NAISSANCE|NASCITA|NACIMIENTO)\b/g;

function maskPlaceOfBirth(upper: string): string {
  return upper.replace(PLACE_OF_BIRTH, (m) => " ".repeat(m.length));
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
type Hit = { value: string; index: number };

/**
 * Line, column and content-row of every offset in the text.
 *
 * `row` counts only lines that have something on them. Tesseract's sparse-text
 * mode emits each fragment on its own line separated by blanks, so a label and
 * its value that look adjacent on the card can be six lines apart in the text:
 *
 *     Sex Date of Birth
 *                          <- blank
 *     +
 *                          <- blank
 *     F
 *                          <- blank
 *     1 JAN 1981
 *
 * Measuring the gap in raw lines puts the value out of reach of its own label.
 * Measuring it in content rows makes that a distance of three.
 */
function positionIndexer(upper: string) {
  const lineStarts = [0];
  for (let i = 0; i < upper.length; i++) if (upper[i] === "\n") lineStarts.push(i + 1);
  const rows: number[] = [];
  let content = 0;
  for (let i = 0; i < lineStarts.length; i++) {
    rows.push(content);
    const end = i + 1 < lineStarts.length ? lineStarts[i + 1] - 1 : upper.length;
    if (upper.slice(lineStarts[i], end).trim()) content++;
  }
  return (index: number) => {
    let line = 0;
    for (let i = 1; i < lineStarts.length && lineStarts[i] <= index; i++) line = i;
    return { line, row: rows[line], col: index - lineStarts[line] };
  };
}

/** The whole line containing `index`. */
function lineTextAt(upper: string, index: number): string {
  const start = upper.lastIndexOf("\n", Math.max(0, index - 1)) + 1;
  const end = upper.indexOf("\n", index);
  return upper.slice(start, end === -1 ? upper.length : end);
}

function nearLabel(
  upper: string,
  hits: Hit[],
  labels: string[],
  maxRows = 4
): (Hit & { labelIndex: number }) | undefined {
  const posOf = positionIndexer(upper);
  for (const label of labels) {
    const i = upper.indexOf(label);
    if (i === -1) continue;
    const end = i + label.length;
    const at = posOf(i);

    // Same line, after the label — unambiguous, take it.
    const inline = hits.find((h) => h.index >= end && posOf(h.index).line === at.line);
    if (inline) return { ...inline, labelIndex: i };

    // Otherwise look below, within the field group, and match by column.
    const below = hits
      .filter((h) => {
        const p = posOf(h.index);
        // Four content rows by default. Widening that to reach values OCR
        // pushed further down costs more than it gains: at six rows a label
        // starts claiming the NEXT field's value, which turned "1JAN19ET" into
        // a document number and "NOT" into an issuing post on real scans.
        return p.line > at.line && p.row <= at.row + maxRows;
      })
      .sort((a, b) =>
        Math.abs(posOf(a.index).col - at.col) - Math.abs(posOf(b.index).col - at.col) ||
        a.index - b.index
      );
    if (below.length) return { ...below[0], labelIndex: i };
  }
  return undefined;
}

const MONTH_NAME = /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/g;

/**
 * The date belonging to one of `labels`, or nothing when the row it sits on is
 * ambiguous.
 *
 * Passports print issue and expiry side by side, and when OCR reads only one of
 * the pair the survivor gets claimed by whichever label happens to be nearest —
 * filing an issue date as an expiry. A row that clearly holds more dates than
 * were legible ("30 NOV 2009 29 NOV i 01s" — two months, one parsable date)
 * cannot be assigned safely, so it isn't: a blank field the user fills in beats
 * a plausible wrong date they don't think to check.
 */
type DateClaim = {
  iso?: string;
  /** Offset of the claimed date, so two labels reaching for one can be caught. */
  index?: number;
  /** Offset of the label that claimed it. */
  labelIndex?: number;
  ambiguous: boolean;
  labelPresent: boolean;
};

/**
 * Dates reach one row further than other fields.
 *
 * Sparse-text mode drops stray fragments — "'S", "SHU", "HA" — between a label
 * and its value, and each one costs a content row. On a real passport card that
 * pushed "Issued On" to five rows above its own value while "Expires On" sat at
 * four, so only the expiry could reach the row and it took the issue date.
 * Loose text patterns can't afford this reach, but a date can: it has to look
 * like a date to be a candidate at all.
 */
const DATE_ROW_REACH = 5;

function dateNearLabel(upper: string, dates: DateHit[], labels: string[]): DateClaim {
  // Whether the document names this field at all, regardless of whether a date
  // could be attached to it.
  const labelPresent = labels.some((l) => upper.includes(l));
  const hit = nearLabel(
    upper,
    dates.map((d) => ({ value: d.iso, index: d.index })),
    labels,
    DATE_ROW_REACH
  );
  if (!hit) return { ambiguous: false, labelPresent };

  const posOf = positionIndexer(upper);
  const row = posOf(hit.index).line;
  const rowText = lineTextAt(upper, hit.index);
  const months = (rowText.match(MONTH_NAME) || []).length;
  const legible = dates.filter((d) => posOf(d.index).line === row).length;
  // Ambiguous, not merely unfound — the caller must not fall back to guessing
  // by chronological order either, because that lands on the same wrong date.
  if (months > legible) return { ambiguous: true, labelPresent };

  return { iso: hit.value, index: hit.index, labelIndex: hit.labelIndex, ambiguous: false, labelPresent };
}

/**
 * A run of digits beside a month name — a date SLOT, whether or not the date in
 * it could be read. "37NOV 2009" is a mangled 30 NOV 2009: worthless as a value,
 * but proof that a field sits there.
 */
const MONTH_SLOT = new RegExp(
  `\\d{1,2}\\s*(?:${Object.keys(MONTHS).join("|")})|(?:${Object.keys(MONTHS).join("|")})\\s*\\d{2,4}`,
  "g"
);

/**
 * Share out the dates on a row between the labels competing for them.
 *
 * Documents print their date fields as a row of headings above a row of values:
 *
 *     Issued On      Expires On
 *     30 NOV 2009    29 NOV 2019
 *
 * Matching each label to the nearest value by column handles that — until OCR
 * damages one of the values. Then both labels reach for the one date that
 * survived, and whichever is nearer wins it. On a real passport card the issue
 * date came through as "37NOV 2009", which fails the day check and vanishes; the
 * surviving "29 NOV 2019" then sat closer to "Issued On" than to "Expires On",
 * so the expiry was thrown away and the issue date was set to the expiry.
 *
 * Order is the reliable structure here, not distance: the first label owns the
 * first field on the row, the second the second. A slot whose value was mangled
 * still counts — skipping it shifts every later label one field to the left,
 * which is the very mistake this exists to prevent. A label that lands on an
 * unreadable slot gets nothing, which is the honest answer.
 */
function resolveRowCompetition(upper: string, dates: DateHit[], claims: DateClaim[]) {
  const posOf = positionIndexer(upper);

  const byLine = new Map<number, DateClaim[]>();
  for (const c of claims) {
    if (c.index == null) continue;
    const line = posOf(c.index).line;
    byLine.set(line, [...(byLine.get(line) || []), c]);
  }

  for (const [line, claimants] of byLine) {
    if (claimants.length < 2) continue; // uncontested — nothing to share out

    // A row belongs to the headings directly above it. On a sparse read the
    // card's fields stack up — "Date of Birth", "Place of Birth", "Issued On",
    // "Expires On", then one row of values — and the birth label is still
    // within reach of a row that is nothing to do with it. Left in, it takes
    // the first slot and pushes issue and expiry one field to the right, which
    // is how "Expires On" ended up with the issue date. Only the labels level
    // with the nearest one share the row out; anything further back was
    // reaching across two other fields and gets nothing.
    const rowOf = (c: DateClaim) => posOf(c.labelIndex!).row;
    const nearest = Math.max(...claimants.map(rowOf));
    const group = claimants.filter((c) => rowOf(c) >= nearest - 1);
    for (const c of claimants) {
      if (group.includes(c)) continue;
      c.iso = undefined;
      c.index = undefined;
      c.ambiguous = true;
    }
    if (group.length < 2) continue;

    const anchor = group[0].index!;
    const lineStart = anchor - posOf(anchor).col;
    const lineText = lineTextAt(upper, anchor);
    const parsed = dates.filter((d) => posOf(d.index).line === line);

    const slots: { index: number; iso?: string }[] = parsed.map((d) => ({ index: d.index, iso: d.iso }));
    MONTH_SLOT.lastIndex = 0;
    for (let m = MONTH_SLOT.exec(lineText); m; m = MONTH_SLOT.exec(lineText)) {
      const at = lineStart + m.index;
      const covered = parsed.some((d) => at < d.index + d.len && d.index < at + m[0].length);
      if (!covered) slots.push({ index: at });
    }
    slots.sort((a, b) => a.index - b.index);

    group.sort((a, b) => a.labelIndex! - b.labelIndex!);
    group.forEach((claim, i) => {
      const slot = slots[i];
      claim.iso = slot?.iso;
      claim.index = slot?.iso ? slot.index : undefined;
      // Not merely unfound: the row holds a field this label owns, so the
      // order-based fallbacks must not guess a neighbour's date back into it.
      if (!claim.iso) claim.ambiguous = true;
    });
  }
}

/** Every match of `pattern` passing `accept`, with where its value starts. */
function matchHits(text: string, pattern: RegExp, accept: (v: string) => boolean = () => true): Hit[] {
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  const out: Hit[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const value = (m[1] ?? m[0]).trim();
    if (accept(value)) out.push({ value, index: m.index + (m[1] ? m[0].indexOf(m[1]) : 0) });
    if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width matches
  }
  return out;
}

/**
 * A text value belonging to one of `labels`, matched by the same column logic
 * the dates use.
 *
 * `accept` has to filter while scanning rather than judging the first match:
 * a label is usually printed beside its own translation ("N° DU DOCUMENT /
 * Document No.") or beside the next field's label, so the first thing matching
 * a loose pattern is very often a word from a label rather than a value.
 */
const valueNearLabel = (
  upper: string,
  labels: string[],
  pattern: RegExp,
  accept?: (v: string) => boolean,
  maxRows?: number
) => nearLabel(upper, matchHits(upper, pattern, accept), labels, maxRows)?.value;

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
  const byBirth = dateNearLabel(upper, dates, DATE_LABELS.birth);
  const byIssue = dateNearLabel(upper, dates, DATE_LABELS.issue);
  const byExpiry = dateNearLabel(upper, dates, DATE_LABELS.expiry);
  resolveRowCompetition(upper, dates, [byBirth, byIssue, byExpiry]);
  let birth = byBirth.iso;
  let issued = byIssue.iso;
  let expiry = byExpiry.iso;

  const chronological = [...new Set(dates.map((d) => d.iso))].sort();
  const spare = chronological.filter((d) => d !== birth && d !== issued && d !== expiry);

  // The card says "date of birth" somewhere, even if OCR mangled the value's
  // position badly enough that the label couldn't claim a date.
  const mentionsBirth = DATE_LABELS.birth.some((l) => upper.includes(l));

  // Earliest unclaimed date is a birth date if it's implausibly old to be an
  // issue date — nobody holds a travel document issued 30 years ago.
  if (!birth && spare.length > 1 && spare[0] < `${new Date().getFullYear() - 25}-01-01`) {
    birth = spare.shift();
  }
  // A single unclaimed date on a document that prints a date of birth is that
  // birth date. Guessing "expiry" here is how a 1981 birthday ends up filed as
  // a passport expiry — a wrong date on the record is worse than a blank one.
  if (!birth && !expiry && mentionsBirth && spare.length === 1) {
    birth = spare.shift();
  }
  // Guess an expiry from date order ONLY when the document never names one. If
  // it prints "Expires On" and that label couldn't be tied to a date, the
  // honest answer is that the expiry wasn't read — handing over the only other
  // date on the card is how a date of birth ends up in the expiry box.
  if (!expiry && !byExpiry.ambiguous && !byExpiry.labelPresent && spare.length) {
    const latest = spare[spare.length - 1];
    if (!birth || latest > birth) expiry = spare.pop();
  }
  // Only infer an issue date once the birth date is pinned down. Without it
  // there is nothing to tell an issue date from a birthday, and the guess lands
  // a 1981 date of birth in the "Issued" box.
  if (!issued && !byIssue.ambiguous && birth && spare.length) {
    const past = spare.filter((d) => d <= today && d > birth);
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
  const upper = maskPlaceOfBirth(text.toUpperCase());
  // US documents write dates month-first. It only decides the genuinely
  // ambiguous ones — 08/21 resolves itself either way.
  const monthFirst = /UNITED STATES|\bU\.?S\.?A\.?\b/.test(upper);
  const dates = findDates(upper, monthFirst);
  const { birth, issued, expiry } = assignDates(upper, dates);

  // Country codes are hunted for in text with the dates blanked out, because
  // month abbreviations collide with them outright — "14 SEP 1996" offers SEP,
  // and MAR in "02 MAR 2021" is a perfectly good code for Morocco.
  const masked = maskDates(upper, dates);

  // Document numbers are 6–16 characters containing at least one digit. The
  // digit is what separates "X4RTBPFW4" from the words "DOCUMENT" and
  // "SIGNATURE" printed beside it; internal hyphens are allowed because a green
  // card's USCIS number is printed as "000-000-001".
  let documentNumber = valueNearLabel(
    masked, NUMBER_LABELS, /\b([A-Z0-9][A-Z0-9-]{4,14}[A-Z0-9])\b/,
    // A month name inside the candidate means it's a mangled date, not a number.
    (v) => /\d/.test(v) && !/JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC/.test(v)
  );

  // No label survived OCR — the field heading on a passport card is small print
  // and often the first thing lost. Fall back to shape: a letter or two
  // followed by a run of digits, appearing exactly ONCE on the document. The
  // other serials printed on a card ("5137821-07", "1-022810") carry hyphens
  // and no letter prefix, so they don't compete; more than one match means
  // there's no way to choose and nothing is filled.
  if (!documentNumber) {
    const shaped = [...new Set((masked.match(/\b[A-Z]{1,2}\d{6,9}\b/g) || []))];
    if (shaped.length === 1) documentNumber = shaped[0];
  }

  let nationality =
    // A recognised code beside the label is the best evidence there is.
    valueNearLabel(masked, NATIONALITY_LABELS, /\b([A-Z]{3})\b/, (v) => ISO3.has(v)) ??
    // Otherwise an unlisted code, as long as it isn't an ordinary document word.
    valueNearLabel(masked, NATIONALITY_LABELS, /\b([A-Z]{3})\b/, (v) => !NOT_A_COUNTRY.has(v));
  if (!nationality) {
    // No usable label — some cards print the code far from it, or spell the
    // nationality out in words. Take the only recognised code on the page, if
    // there is exactly one; more than one and there's no way to tell which.
    const found = [...new Set((masked.match(/\b[A-Z]{3}\b/g) || []).filter((c) => ISO3.has(c)))];
    if (found.length === 1) nationality = found[0];
  }

  // Visa class, e.g. "B1/B2". The slash is what distinguishes it from the
  // single-letter entry class printed beside it — and when the gap between the
  // two is lost ("R B1/B2" read as "RB1/B2") the leading class letter is
  // dropped, since the part around the slash is the type the form wants.
  const visaType = valueNearLabel(masked, VISA_TYPE_LABELS, /\b([A-Z]{1,3}\d{0,2}\/[A-Z]{1,2}\d{0,2})\b/)
    ?.replace(/^[A-Z](?=[A-Z]\d?\/)/, "");

  // Issuing post / embassy, e.g. "BEIJING". Kept to ONE row below its heading,
  // unlike the dates: a post name is always printed directly under the label,
  // and the pattern it has to match — any word of 3–20 letters — is loose enough
  // that a four-row reach picks up the surname two fields down instead. Reaching
  // further found "TRAVELER" and "JOI" on a card that plainly reads BEIJING.
  const issuingPost = valueNearLabel(masked, POST_LABELS, /\b([A-Z]{3,20})\b/, (v) => !NOT_A_POST.has(v), 1);

  // Anything at all is worth handing back; the user checks it either way.
  if (!documentNumber && !nationality && !issued && !expiry && !visaType && !issuingPost) return null;

  return {
    valid: false,
    isoDates: true,
    fields: {
      documentNumber: documentNumber || null,
      nationality: nationality || null,
      issueDate: issued || null,
      expirationDate: expiry || null,
      birthDate: birth || null,
      visaType: visaType || null,
      issuingPost: issuingPost || null,
      firstName: null,
      lastName: null,
      sex: null,
    },
  };
}

// ---- Worker pool ---------------------------------------------------------
// Five OCR passes read a document, and run one after another they took the best
// part of half a minute. They don't depend on each other, so they don't have to
// queue: each gets its own Tesseract worker and they all run at once, turning a
// sum into a maximum.
//
// The pool also OUTLIVES a scan. Creating a worker means instantiating the wasm
// and loading the language data, seconds of the old timing that bought nothing —
// and a user who scans a passport almost always scans a visa next. It is
// released once they've clearly stopped, since idle workers hold real memory.

type TWorker = Awaited<ReturnType<typeof import("tesseract.js").createWorker>>;

// The MRZ alphabet only — stops "0/O" and "1/I" drifting into letters.
// 6 = one uniform block of text, which is exactly what an MRZ strip is.
const MRZ_PARAMS = {
  tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
  tessedit_pageseg_mode: "6" as unknown as never,
};

// Restrict the alphabet. Security print, guilloche and portrait edges make
// Tesseract emit runs of "{Hy", "i!", "\\" and "~" that swamp the real text;
// none of those characters appear on a travel document, so barring them removes
// noise rather than signal. Accented letters are left out deliberately — every
// field is uppercased before matching.
const PRINT_PARAMS = {
  tessedit_char_whitelist:
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 /-.,:#'°",
  // Canvases carry no DPI metadata, so Tesseract guesses — and guesses badly on
  // an upscaled image, which changes how it segments.
  user_defined_dpi: "300",
};

// No single preprocessing/segmentation combination reads every document: 6
// (uniform block) suits a flat card scan, 3 (auto) a page of running text, 11
// (sparse) labels scattered in columns around a portrait. And hardening the
// contrast rescues faint print while hurting cards whose background pattern
// competes with the text. Every one of these has been the only pass to read
// some field on a real document, so all four run.
const PRINT_VARIANTS: { mode: PrepMode; width: number; psm: string; t?: number }[] = [
  { mode: "adaptive", width: 2600, psm: "6" },
  { mode: "adaptive", width: 3000, psm: "11" },
  // The heavier threshold kept as its own pass. It is the one that misreads 9 as
  // 8, but it is also the one that found a passport card number the lighter
  // passes lose entirely — thicker strokes survive being small. Two passes on
  // the light threshold outvote it where they disagree about a digit.
  { mode: "adaptive", width: 3000, psm: "11", t: HEAVY_INK_T },
  { mode: "stretch", width: 2600, psm: "6" },
  { mode: "grey", width: 2400, psm: "3" },
];

// Workers are pinned to one parameter set for life. Switching a worker between
// the MRZ alphabet and the printed one is the thing to avoid: a whitelist that
// silently survives into the wrong pass leaves the scanner unable to see
// lowercase or punctuation while reading ordinary labels, with nothing to show
// for it but worse results.
// Bottom 38% first — the MRZ sits at the foot of every passport data page and
// MRZ visa, and cropping to it keeps the rest of the card from competing. The
// whole image second, for photos that arrived already cropped, and because the
// crop and the full frame mangle the "<<<<" fillers differently: on a real visa
// the strip read them as "KLKLKL" and only the full frame kept them.
const MRZ_CROPS: [number, number][] = [[0.62, 1], [0, 1]];

type Pool = { mrz: TWorker[]; print: TWorker[] };
let poolPromise: Promise<Pool> | null = null;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;
const POOL_IDLE_MS = 90_000;

function getPool(): Promise<Pool> {
  if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null; }
  if (!poolPromise) {
    poolPromise = (async () => {
      const Tesseract = await import("tesseract.js");
      const make = async (params: Record<string, unknown>) => {
        const w = await Tesseract.createWorker("eng");
        await w.setParameters(params as never);
        return w;
      };
      // One worker per pass where the machine can afford it, leaving a core for
      // the page itself. Fewer workers than passes is fine — they simply queue,
      // so a two-core laptop is slower but never worse at reading.
      const cores = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4;
      const mrzCount = cores >= 6 ? MRZ_CROPS.length : 1;
      const printCount = Math.max(1, Math.min(PRINT_VARIANTS.length, cores - mrzCount - 1));
      const workers = await Promise.all([
        ...Array.from({ length: mrzCount }, () => make(MRZ_PARAMS)),
        ...Array.from({ length: printCount }, () => make(PRINT_PARAMS)),
      ]);
      return { mrz: workers.slice(0, mrzCount), print: workers.slice(mrzCount) };
    })();
    // Never cache a failed start-up — the next scan should get a fresh attempt
    // rather than the same rejected promise for the rest of the session.
    poolPromise.catch(() => { poolPromise = null; });
  }
  return poolPromise;
}

function releasePoolWhenIdle() {
  if (releaseTimer) clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    const pending = poolPromise;
    poolPromise = null;
    releaseTimer = null;
    pending
      ?.then(({ mrz, print }) => Promise.all([...mrz, ...print].map((w) => w.terminate())))
      .catch(() => {});
  }, POOL_IDLE_MS);
}

/** Hand each item to a free worker; more items than workers simply queue. */
async function runPooled<T, R>(
  items: T[],
  workers: TWorker[],
  fn: (worker: TWorker, item: T) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    workers.map(async (w) => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(w, items[i]);
      }
    })
  );
  return out;
}

// ---- Entry point ---------------------------------------------------------

export async function scanTravelDoc(file: File): Promise<ScanResult> {
  const fail = (message: string, rawText = ""): ScanResult => ({ ok: false, message, valid: false, fields: {}, rawText });

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    // Overwhelmingly this is an iPhone HEIC, which the file picker offers but no
    // browser can decode — worth naming rather than blaming the photo.
    return fail("Couldn't open that file — try a JPG or PNG.");
  }

  let rawText = "";
  let mrz: Parsed | null = null;
  let printed: Parsed | null = null;

  // How much of the form a printed read managed to fill — used to keep the best
  // attempt across several passes rather than the last one.
  const score = (p: Parsed | null) =>
    !p ? -1 : [p.fields.documentNumber, p.fields.nationality, p.fields.issueDate,
               p.fields.expirationDate, p.fields.visaType, p.fields.issuingPost]
      .filter(Boolean).length;

  try {
    const pool = await getPool();

    // Each variant is parsed ON ITS OWN, never on the concatenation. Joining
    // them would let one pass's "Expires On" claim another pass's date purely
    // because the two landed near each other in the combined text — the
    // positions come from different images and mean nothing together.
    // Combine per FIELD by AGREEMENT, rather than taking everything from
    // whichever pass scored best overall. A high-scoring pass can still be the
    // only one that misread a particular field: on a real visa the leading
    // pass read the issuing post as "EEUNG" while two others read "BEIJING"
    // plainly, and ranking by pass handed over the garbage. Votes are counted
    // per field and ties broken by how much of the form that pass filled.
    const consensus = (list: Parsed[]): Parsed | null => {
      if (!list.length) return null;
      const fields: Record<string, string | null> = {};
      const disputed: string[] = [];
      for (const key of Object.keys(list[0].fields)) {
        const votes = new Map<string, { n: number; best: number }>();
        for (const a of list) {
          const v = a.fields[key];
          if (!v) continue;
          const cur = votes.get(v) || { n: 0, best: -1 };
          votes.set(v, { n: cur.n + 1, best: Math.max(cur.best, score(a)) });
        }
        const ranked = [...votes].sort((a, b) => b[1].n - a[1].n || b[1].best - a[1].best);
        fields[key] = ranked.length ? ranked[0][0] : null;
        // Two passes reading the same field differently means a character was
        // guessed — "29 NOV 2018" against "29 NOV 2019" is one bad digit, and
        // the result looks entirely plausible either way. Worth naming.
        if (ranked.length > 1) disputed.push(key);
      }

      // A document cannot expire before it was issued, so if the winning
      // expiry isn't later than the winning issue date, one of the two came
      // from a pass that lost the expiry's own value and let the expiry label
      // reach across to the issue date instead. Sparse-text mode does this:
      // it strings every fragment onto its own line, and "Expiration Date"
      // ends up nearer the issue date than "Issue Date" is.
      //
      // Another pass has usually read the real one — take the earliest expiry
      // that is actually possible. If none is, the field goes back to blank
      // rather than keeping a date that is provably wrong.
      const issued = fields.issueDate;
      if (issued && fields.expirationDate && fields.expirationDate <= issued) {
        const possible = [...new Set(list.map((a) => a.fields.expirationDate))]
          .filter((d): d is string => !!d && d > issued)
          .sort();
        fields.expirationDate = possible[0] ?? null;
        if (!disputed.includes("expirationDate")) disputed.push("expirationDate");
      }

      return { valid: false, isoDates: true, fields, disputed };
    };

    // Every pass goes out together. They share no state, so waiting for one
    // before starting the next only ever cost time — and every pass now runs,
    // which is what the consensus wants anyway. The old sequential version
    // stopped as soon as the form looked full, which is how a pass reading
    // "EEUNG" survived a later one reading "BEIJING".
    const mrzPasses = runPooled(MRZ_CROPS, pool.mrz, async (w, [top, bottom]) => {
      const { data } = await w.recognize(prepare(img, top, bottom, "stretch", 2000));
      return data.text || "";
    });

    const printPasses = runPooled(PRINT_VARIANTS, pool.print, async (w, v) => {
      await w.setParameters({ tessedit_pageseg_mode: v.psm as unknown as never });
      const { data } = await w.recognize(prepare(img, 0, 1, v.mode, v.width, v.t));
      return data.text || "";
    });

    const [mrzTexts, printTexts] = await Promise.all([mrzPasses, printPasses]);

    // The dedicated passes first — their restricted alphabet is what keeps "0"
    // and "O" apart in a zone where the difference changes a date. The printed
    // passes are a last resort: the code lines land in their text too, just read
    // with an alphabet wide enough to get them wrong.
    for (const t of [...mrzTexts, ...printTexts]) {
      mrz = decode(mrzCandidates(t));
      if (mrz) break;
    }

    // Read the printed side ALWAYS, not only when the MRZ pass came up empty. No
    // MRZ format encodes an issue date, a visa class or an issuing post, so on a
    // visa the machine-readable zone can parse perfectly and still leave "Valid
    // from", "Type" and "Embassy" blank. The print is the only place those exist.
    printed = consensus(printTexts.map(parsePrintedFields).filter((p): p is Parsed => !!p));

    rawText = [...mrzTexts, ...printTexts.map((t, i) =>
      `[psm ${PRINT_VARIANTS[i].psm} ${PRINT_VARIANTS[i].mode}]\n${t}`)].join("\n---\n");
  } catch {
    return fail("Couldn't read that photo.", rawText);
  } finally {
    releasePoolWhenIdle();
  }

  if (!mrz && !printed) {
    const chars = rawText.replace(/\s/g, "").length;
    return fail(chars < 40 ? "Nothing readable — try a sharper photo." : "No fields found on that side.", rawText);
  }

  // Normalise either source into form fields. `isoDates` marks the printed path,
  // which already resolved full years; MRZ dates arrive as YYMMDD.
  const toFields = (p: Parsed | null): ScanFields => {
    if (!p) return {};
    const f = p.fields;
    const nat = (f.nationality || "").toUpperCase();
    const dateOf = (v: string | null | undefined, kind: "birth" | "expiry") =>
      !v ? undefined : p.isoDates ? v : isoDate(v, kind);
    return {
      documentNumber: f.documentNumber || undefined,
      nationality: nat ? COUNTRY[nat] || nat : undefined,
      issueDate: dateOf(f.issueDate, "birth"),
      expirationDate: dateOf(f.expirationDate, "expiry"),
      visaType: f.visaType || undefined,
      issuingPost: f.issuingPost || undefined,
      firstName: f.firstName || undefined,
      lastName: f.lastName || undefined,
      birthDate: dateOf(f.birthDate, "birth"),
      sex: f.sex || undefined,
    };
  };

  // The MRZ wins where it has an answer: it is check-digit protected, while the
  // printed face is whatever the scanner thought it saw. The printed read fills
  // the rest — which on a visa is the issue date, class and issuing post, none
  // of which any MRZ encodes.
  const m = toFields(mrz);
  const p = toFields(printed);

  // ...unless the code's expiry cannot be true. A document that expires before
  // it was issued does not exist, so when the machine-readable zone says one
  // thing and the issue date printed on the face rules it out, the code is what
  // is wrong. A real US visa specimen reads "Issue Date 18JUN2019 · Expiration
  // Date 12JUN2024" while its MRZ encodes 04-12-23, and preferring the code
  // outright put an expiry twenty years in the past on the record.
  //
  // Two-digit MRZ years are the usual cause: an expiry is decoded as 20xx by
  // definition, so a misread digit lands it in the past with nothing to flag it.
  const issuedRef = p.issueDate ?? m.issueDate;
  const mrzExpiryImpossible = !!(m.expirationDate && issuedRef && m.expirationDate <= issuedRef);
  const expirationDate = mrzExpiryImpossible ? p.expirationDate : m.expirationDate ?? p.expirationDate;

  const fields: ScanFields = {
    documentNumber: m.documentNumber ?? p.documentNumber,
    nationality: m.nationality ?? p.nationality,
    issueDate: m.issueDate ?? p.issueDate,
    expirationDate,
    visaType: m.visaType ?? p.visaType,
    issuingPost: m.issuingPost ?? p.issuingPost,
    firstName: m.firstName ?? p.firstName,
    lastName: m.lastName ?? p.lastName,
    birthDate: m.birthDate ?? p.birthDate,
    sex: m.sex ?? p.sex,
  };

  // One short line. The user is looking at the filled-in form directly below
  // this, so listing what landed only repeats what they can already see — the
  // count says the scan worked, and the rest of the line is reserved for the
  // one thing the form itself cannot show them: which values not to trust.
  const LABEL: Record<string, string> = {
    documentNumber: "number", issueDate: "issued", expirationDate: "expiry",
    visaType: "type", issuingPost: "embassy", nationality: "nationality",
  };
  const filled = (Object.keys(LABEL) as (keyof ScanFields)[]).filter((k) => fields[k]);

  // Fields worth a second look: ones the passes read differently, plus an expiry
  // whose two halves of the document disagreed. Both mean a character was
  // guessed somewhere, and the guess looks perfectly plausible on the form.
  const shaky = new Set(
    (printed?.disputed || []).filter((k) => LABEL[k] && fields[k as keyof ScanFields]).map((k) => LABEL[k])
  );
  if (mrzExpiryImpossible || (m.expirationDate && p.expirationDate && m.expirationDate !== p.expirationDate)) {
    if (fields.expirationDate) shaky.add("expiry");
  }

  const valid = !!mrz?.valid;
  const check = shaky.size ? ` · check ${[...shaky].join(", ")}` : "";
  const message = filled.length
    ? `Filled ${filled.length} field${filled.length === 1 ? "" : "s"}${valid ? "" : " · verify"}${check}`
    : "Nothing filled — check the photo";

  return { ok: true, message, valid, fields, rawText };
}
