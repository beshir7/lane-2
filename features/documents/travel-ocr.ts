"use client";

// Free, fully in-browser travel-document OCR. The image never leaves the device:
// Tesseract.js reads the text locally, and we parse the Machine-Readable Zone
// (MRZ) — the "<<<<" lines on passports and MRZ visas — with the `mrz` library.
// The MRZ deterministically encodes the document number, names, nationality,
// date of birth and (crucially) the expiry date, so those come out reliably.

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

// Pull the most MRZ-looking lines out of noisy OCR text: uppercase A–Z, digits
// and '<', long, and containing at least one filler '<'.
function mrzCandidates(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, "").toUpperCase())
    .filter((l) => /^[A-Z0-9<]+$/.test(l) && l.length >= 28 && l.includes("<"));
}

function tryParse(lines: string[]) {
  try {
    const r = parse(lines);
    return r;
  } catch {
    return null;
  }
}

export async function scanTravelDoc(file: File): Promise<ScanResult> {
  const fail = (message: string, rawText = ""): ScanResult => ({ ok: false, message, valid: false, fields: {}, rawText });

  let rawText = "";
  try {
    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker("eng");
    // Bias the recognizer toward the MRZ alphabet for cleaner "<" and O/0 reads.
    await worker.setParameters({ tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<" });
    const { data } = await worker.recognize(file);
    await worker.terminate();
    rawText = data.text || "";
  } catch {
    return fail("Couldn't read the image. Try a clearer, straight-on photo.");
  }

  const cands = mrzCandidates(rawText);
  if (cands.length < 2) return fail("No machine-readable zone found — enter the fields manually.", rawText);

  // MRZ is at the bottom: try the last 2 lines (TD3 passport / TD2), then last 3 (TD1).
  const last2 = cands.slice(-2);
  const last3 = cands.slice(-3);
  const parsed = tryParse(last2) || (cands.length >= 3 ? tryParse(last3) : null);
  if (!parsed) return fail("Found a code but couldn't decode it — enter the fields manually.", rawText);

  const f = parsed.fields as Record<string, string | null>;
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
  const message = parsed.valid
    ? gotExpiry ? `Read successfully · expiry ${fields.expirationDate}` : "Read successfully."
    : gotExpiry ? `Read (some checks failed) · expiry ${fields.expirationDate} — please verify` : "Read, but please verify the fields.";

  return { ok: true, message, valid: !!parsed.valid, fields, rawText };
}
