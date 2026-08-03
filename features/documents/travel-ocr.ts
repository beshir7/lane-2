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

export interface ScanFields {
  documentNumber?: string;
  nationality?: string;   // display name if known, else ISO-3 code
  firstName?: string;
  lastName?: string;
  birthDate?: string;      // ISO yyyy-mm-dd
  expirationDate?: string; // ISO yyyy-mm-dd
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
};

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

type Parsed = { fields: Record<string, string | null>; valid: boolean };

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
// passport card keeps its MRZ on the back, and plenty of older visas have none
// at all. The printed fields are right there though, so when no MRZ turns up we
// read those instead — flagged as unverified, because unlike an MRZ they carry
// no check digits.

const MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

/** Every "29 NOV 2019" / "12JUN2024" / "29-NOV-2019" in the text, as ISO. */
function findPrintedDates(text: string): string[] {
  const out: string[] = [];
  const re = /\b(\d{1,2})\s*[-.\s]?\s*([A-Z]{3})\s*[-.\s]?\s*((?:19|20)\d{2})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const mm = MONTHS[m[2].toUpperCase()];
    const dd = parseInt(m[1], 10);
    if (!mm || dd < 1 || dd > 31) continue;
    out.push(`${m[3]}-${mm}-${String(dd).padStart(2, "0")}`);
  }
  // Numeric forms too: 29/11/2019, 29.11.2019
  const re2 = /\b(\d{1,2})[/.](\d{1,2})[/.]((?:19|20)\d{2})\b/g;
  while ((m = re2.exec(text))) {
    const dd = parseInt(m[1], 10), mo = parseInt(m[2], 10);
    if (dd < 1 || dd > 31 || mo < 1 || mo > 12) continue;
    out.push(`${m[3]}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`);
  }
  return [...new Set(out)].sort();
}

/**
 * Read a document from its printed labels.
 *
 * Dates are assigned by ORDER rather than by matching a label, because OCR
 * mangles labels far more often than it mangles digits: on every passport,
 * card and visa the birth date is the earliest date printed and the expiry the
 * latest, with issue in between. That holds for both sample documents and
 * survives the label text being unreadable.
 */
function parsePrintedFields(text: string): Parsed | null {
  const upper = text.toUpperCase();
  const dates = findPrintedDates(upper);
  if (dates.length < 2) return null;

  const birth = dates[0];
  const expiry = dates[dates.length - 1];
  // An expiry that already passed is possible, but one before the birth date
  // means we've misread something badly enough not to guess.
  if (expiry <= birth) return null;

  const after = (labels: string[], pattern: RegExp): string | undefined => {
    for (const label of labels) {
      const i = upper.indexOf(label);
      if (i === -1) continue;
      const m = upper.slice(i + label.length, i + label.length + 40).match(pattern);
      if (m) return (m[1] || m[0]).trim();
    }
    return undefined;
  };

  const documentNumber = after(
    ["PASSPORT CARD NO", "PASSPORT NUMBER", "PASSPORT NO", "CONTROL NUMBER", "DOCUMENT NO"],
    /\b([A-Z0-9]{6,12})\b/
  );
  const lastName = after(["SURNAME", "COGNOME"], /\b([A-Z][A-Z'-]{1,})\b/);
  const firstName = after(["GIVEN NAMES", "GIVEN NAME", "NOME"], /\b([A-Z][A-Z'-]{1,})\b/);
  const nationality = after(["NATIONALITY", "NAZIONALITA"], /\b([A-Z]{3,4})\b/);
  const sexRaw = after(["SEX", "SESSO"], /\b([MF])\b/);

  // ISO-formatted here; isoDate() below only understands YYMMDD, so hand back
  // the 6-digit form it expects.
  const toYymmdd = (iso: string) => iso.slice(2).replace(/-/g, "");

  return {
    valid: false,
    fields: {
      documentNumber: documentNumber || null,
      nationality: nationality || null,
      firstName: firstName || null,
      lastName: lastName || null,
      birthDate: toYymmdd(birth),
      expirationDate: toYymmdd(expiry),
      sex: sexRaw || null,
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
      // keeps it on the back). Read the printed fields instead — full charset
      // this time, because the MRZ whitelist strips the spaces and lowercase
      // that ordinary labels need.
      if (!parsed) {
        await worker.setParameters({
          tessedit_char_whitelist: "",
          tessedit_pageseg_mode: "3" as unknown as never,
        });
        const { data } = await worker.recognize(prepare(img, 0, 1, false));
        const text = data.text || "";
        rawText = `${rawText}\n---\n${text}`;
        parsed = parsePrintedFields(text);
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
        : "Couldn't find a machine-readable zone or readable dates. If this is a passport card, photograph the BACK — that's where its code is.",
      rawText
    );
  }

  const f = parsed.fields;
  const nat = (f.nationality || "").toUpperCase();
  const fields: ScanFields = {
    documentNumber: f.documentNumber || undefined,
    nationality: nat ? COUNTRY[nat] || nat : undefined,
    firstName: f.firstName || undefined,
    lastName: f.lastName || undefined,
    birthDate: isoDate(f.birthDate || undefined, "birth"),
    expirationDate: isoDate(f.expirationDate || undefined, "expiry"),
    sex: f.sex || undefined,
  };

  const gotExpiry = !!fields.expirationDate;
  const message = printedFallback
    ? gotExpiry
      ? `No code found — read the printed text · expiry ${fields.expirationDate}. Please check every field.`
      : "No code found — read the printed text. Please check every field."
    : parsed.valid
    ? gotExpiry ? `Read successfully · expiry ${fields.expirationDate}` : "Read successfully."
    : gotExpiry ? `Read (some checks failed) · expiry ${fields.expirationDate} — please verify` : "Read, but please verify the fields.";

  return { ok: true, message, valid: parsed.valid, fields, rawText };
}
