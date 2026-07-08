"use server";

// Athletes — write operations (Server Actions / BFF). Callable directly from
// client components or from the app/api REST layer.

import { db, rid, patchById, removeById } from "@/services/db";
import type { Athlete } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

function normalizeAthlete(input: Partial<Athlete>): Athlete {
  return {
    id: input.id || rid("a"),
    first: input.first || "",
    last: input.last || "",
    initials: input.initials || ((input.first?.[0] || "") + (input.last?.[0] || "")).toUpperCase(),
    color: input.color || "#5b6ef5",
    nationality: input.nationality || "",
    dob: input.dob || "",
    age: input.age ?? (input.dob ? new Date().getFullYear() - parseInt(input.dob.slice(0, 4)) : 22),
    gender: input.gender || "F",
    specialty: input.specialty || "",
    category: input.category || "sprints",
    squad: input.squad || "Senior B",
    status: input.status || "active",
    joined: input.joined || today(),
    pb: input.pb || {},
    medals: input.medals || { gold: 0, silver: 0, bronze: 0 },
    nextEvent: input.nextEvent || "—",
    coach: input.coach || "M. Bekele",
    progress: input.progress ?? 50,
    bio: input.bio || "",
    contact: input.contact || { email: "", phone: "" },
    email: input.email || input.contact?.email || "",
  };
}

export async function createAthlete(input: Partial<Athlete>) {
  const athlete = normalizeAthlete(input);
  db.athletes.unshift(athlete);
  return athlete;
}

export async function updateAthlete(id: string, patch: Partial<Athlete>) {
  return patchById(db.athletes, id, patch, "Athlete");
}

export async function removeAthlete(id: string) {
  return removeById(db.athletes, id, "Athlete");
}
