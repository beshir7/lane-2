"use server";

// Documents — write operations.

import { db, rid, removeById } from "@/services/db";
import type { LaneDocument } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

function normalizeDocument(input: Partial<LaneDocument>): LaneDocument {
  const isPdf = (input.name || "").toLowerCase().endsWith(".pdf");
  return {
    id: input.id || rid("d"),
    name: input.name || "Untitled",
    type: input.type || (isPdf ? "pdf" : "image"),
    icon: input.icon || (isPdf ? "filePdf" : "fileImage"),
    category: input.category || "media",
    size: input.size || (Math.random() * 5 + 0.5).toFixed(1) + " MB",
    athleteId: input.athleteId ?? null,
    uploaded: input.uploaded || today(),
    expires: input.expires ?? null,
  };
}

export async function createDocument(input: Partial<LaneDocument>) {
  const doc = normalizeDocument(input);
  db.documents.unshift(doc);
  return doc;
}

export async function removeDocument(id: string) {
  return removeById(db.documents, id, "Document");
}
