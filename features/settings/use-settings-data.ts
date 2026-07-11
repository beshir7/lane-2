"use client";

// Settings data (personal / single-tenant model): workspace settings, invited
// members, and role definitions — each owned by and visible only to the signed-in
// user via RLS. Defaults are seeded into the DB on first use so the Roles matrix
// and General form are backed by real rows, not hardcoded reference data.

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ROLES as DEFAULT_ROLES, DEFAULT_PERMISSIONS } from "@/lib/reference";

export interface WorkspaceSettings {
  orgName: string;
  slug: string;
  discipline: string;
  country: string;
  timezone: string;
  dateFormat: string;
  distanceUnit: string;
  seasonStart: string;
  seasonEnd: string;
  notifPrefs: Record<string, boolean[]>;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  roleId: string;
  status: string;
  color: string;
  lastActive: string;
}

export interface RoleDef {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
  isSystem: boolean;
  sort: number;
}

// Notification preference matrix: event → [In-app, Email].
export const NOTIF_CHANNELS = ["In-app", "Email"] as const;
export const NOTIF_EVENTS: { key: string; label: string; default: boolean[] }[] = [
  { key: "comp_reminders", label: "Competition reminders", default: [true, true] },
  { key: "cal_conflicts", label: "Calendar conflicts", default: [true, true] },
  { key: "doc_expiry", label: "Document expiry alerts", default: [true, true] },
  { key: "pb_logged", label: "Personal best logged", default: [true, false] },
  { key: "invitations", label: "New team invitations", default: [true, true] },
  { key: "system", label: "System status updates", default: [true, true] },
];

const DEFAULT_SETTINGS: WorkspaceSettings = {
  orgName: "Lane Athletics",
  slug: "lane-athletics",
  discipline: "Track & Field",
  country: "Ethiopia",
  timezone: "Africa/Addis_Ababa",
  dateFormat: "YYYY-MM-DD",
  distanceUnit: "metric",
  seasonStart: "2026-01-01",
  seasonEnd: "2026-09-30",
  notifPrefs: Object.fromEntries(NOTIF_EVENTS.map((e) => [e.key, e.default])),
};

const rowToSettings = (r: any): WorkspaceSettings => ({
  orgName: r.org_name ?? DEFAULT_SETTINGS.orgName,
  slug: r.slug ?? DEFAULT_SETTINGS.slug,
  discipline: r.discipline ?? DEFAULT_SETTINGS.discipline,
  country: r.country ?? DEFAULT_SETTINGS.country,
  timezone: r.timezone ?? DEFAULT_SETTINGS.timezone,
  dateFormat: r.date_format ?? DEFAULT_SETTINGS.dateFormat,
  distanceUnit: r.distance_unit ?? DEFAULT_SETTINGS.distanceUnit,
  seasonStart: r.season_start ?? "",
  seasonEnd: r.season_end ?? "",
  notifPrefs: { ...DEFAULT_SETTINGS.notifPrefs, ...(r.notif_prefs || {}) },
});

const settingsToRow = (s: WorkspaceSettings, userId: string) => ({
  user_id: userId,
  org_name: s.orgName,
  slug: s.slug,
  discipline: s.discipline,
  country: s.country,
  timezone: s.timezone,
  date_format: s.dateFormat,
  distance_unit: s.distanceUnit,
  season_start: s.seasonStart,
  season_end: s.seasonEnd,
  notif_prefs: s.notifPrefs,
  updated_at: new Date().toISOString(),
});

const rowToMember = (r: any): Member => ({
  id: r.id, name: r.name || "", email: r.email || "", roleId: r.role_id || "r-coach",
  status: r.status || "invited", color: r.color || "#5b6ef5", lastActive: r.last_active || "Invited",
});

const rowToRole = (r: any): RoleDef => ({
  id: r.id, name: r.name || "", description: r.description || "", color: r.color || "var(--accent)",
  permissions: Array.isArray(r.permissions) ? r.permissions : [], isSystem: !!r.is_system, sort: r.sort ?? 0,
});

const newId = (p: string) => p + Math.random().toString(36).slice(2, 8);

export function useSettingsData() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<WorkspaceSettings>(DEFAULT_SETTINGS);
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<RoleDef[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) { setLoading(false); return; }
      const uid = user.id;
      setUserId(uid);

      // Workspace settings: fetch the single row, creating defaults if absent.
      const { data: sRow } = await supabase.from("workspace_settings").select("*").eq("user_id", uid).maybeSingle();
      if (!active) return;
      if (sRow) {
        setSettings(rowToSettings(sRow));
      } else {
        await supabase.from("workspace_settings").upsert(settingsToRow(DEFAULT_SETTINGS, uid));
        setSettings(DEFAULT_SETTINGS);
      }

      // Members.
      const { data: mRows } = await supabase.from("members").select("*").order("created_at");
      if (!active) return;
      setMembers((mRows || []).map(rowToMember));

      // Roles: seed the four defaults on first use, then load.
      let { data: rRows } = await supabase.from("roles").select("*").order("sort");
      if ((!rRows || rRows.length === 0)) {
        const seed = DEFAULT_ROLES.map((r, i) => ({
          id: r.id, user_id: uid, name: r.name, description: r.description, color: r.color,
          permissions: DEFAULT_PERMISSIONS[r.id] || [], is_system: true, sort: i,
        }));
        await supabase.from("roles").upsert(seed);
        rRows = seed as any[];
      }
      if (!active) return;
      setRoles((rRows || []).map(rowToRole));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [supabase]);

  const saveSettings = useCallback(async (patch: Partial<WorkspaceSettings>) => {
    if (!userId) return { error: { message: "Not signed in" } };
    const next = { ...settings, ...patch };
    setSettings(next);
    return supabase.from("workspace_settings").upsert(settingsToRow(next, userId));
  }, [settings, userId, supabase]);

  const inviteMember = useCallback(async (email: string, roleId: string) => {
    if (!userId) return;
    const m: Member = { id: newId("mem-"), name: email.split("@")[0], email, roleId, status: "invited", color: "#5b6ef5", lastActive: "Invited" };
    setMembers((prev) => [...prev, m]);
    await supabase.from("members").insert({ id: m.id, user_id: userId, name: m.name, email: m.email, role_id: m.roleId, status: m.status, color: m.color, last_active: m.lastActive });
  }, [userId, supabase]);

  const removeMember = useCallback(async (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    await supabase.from("members").delete().eq("id", id);
  }, [supabase]);

  const toggleRolePerm = useCallback(async (roleId: string, permId: string) => {
    let nextPerms: string[] = [];
    setRoles((prev) => prev.map((r) => {
      if (r.id !== roleId) return r;
      nextPerms = r.permissions.includes(permId) ? r.permissions.filter((p) => p !== permId) : [...r.permissions, permId];
      return { ...r, permissions: nextPerms };
    }));
    await supabase.from("roles").update({ permissions: nextPerms }).eq("id", roleId);
  }, [supabase]);

  const createRole = useCallback(async (name: string, description: string) => {
    if (!userId) return;
    const role: RoleDef = { id: newId("role-"), name, description, color: "var(--info)", permissions: [], isSystem: false, sort: roles.length };
    setRoles((prev) => [...prev, role]);
    await supabase.from("roles").insert({ id: role.id, user_id: userId, name: role.name, description: role.description, color: role.color, permissions: [], is_system: false, sort: role.sort });
    return role.id;
  }, [userId, roles.length, supabase]);

  const deleteRole = useCallback(async (id: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== id));
    await supabase.from("roles").delete().eq("id", id);
  }, [supabase]);

  return { loading, userId, settings, members, roles, saveSettings, inviteMember, removeMember, toggleRolePerm, createRole, deleteRole };
}
