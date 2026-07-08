"use server";

// Settings — team & session write operations.

import { db, rid, removeById } from "@/services/db";
import type { TeamUser } from "@/lib/types";

function normalizeUser(input: Partial<TeamUser>): TeamUser {
  const base = input.name || input.email || "?";
  return {
    id: input.id || rid("u"),
    name: input.name || (input.email ? input.email.split("@")[0] : "New member"),
    role: input.role || "r-coach",
    email: input.email || "",
    initials: input.initials || base.split(" ").map((s) => s[0]).join("").toUpperCase().slice(0, 2),
    color: input.color || "#5b6ef5",
    active: input.active ?? true,
    last: input.last || "Invited",
  };
}

export async function inviteUser(input: Partial<TeamUser>) {
  const user = normalizeUser(input);
  db.users.unshift(user);
  return user;
}

export async function removeUser(id: string) {
  return removeById(db.users, id, "User");
}

export async function revokeSession(id: string) {
  return removeById(db.sessions, id, "Session");
}
