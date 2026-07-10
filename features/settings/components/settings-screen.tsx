"use client";

// Settings: Profile, General, Members, Roles & permissions, Security, Sessions,
// Notifications. Personal (single-tenant) model — every tab is backed by the
// signed-in user's own rows (workspace_settings / members / roles) via RLS, or
// by Supabase auth (profile, password, MFA, sessions). No hardcoded data.

import { Icon } from "@/components/icon";
import { useLane } from "@/components/lane-provider";
import { Avatar, Badge, Modal, useToast } from "@/components/primitives";
import { FilterDropdown } from "@/components/shared";
import { PERMISSIONS, SETTINGS_COUNTRIES, SETTINGS_TIMEZONES, ORG_DISCIPLINES } from "@/lib/reference";
import type { ReactNode } from "react";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSettingsData, NOTIF_EVENTS, NOTIF_CHANNELS, type RoleDef } from "../use-settings-data";

export function SettingsScreen({ initialTab }: { initialTab?: string }) {
  const [tab, setTab] = useState(initialTab || "general");
  const { isAdmin } = useLane();
  const data = useSettingsData();

  const tabs = [
    { id: "profile", label: "Your profile", icon: "user" },
    { id: "general", label: "General", icon: "settings" },
    { id: "members", label: "Members", icon: "users" },
    { id: "rbac", label: "Roles & access", icon: "shield" },
    { id: "security", label: "Security", icon: "lock" },
    { id: "sessions", label: "Sessions & devices", icon: "desktop", adminOnly: true },
    { id: "notifications", label: "Notifications", icon: "bell" },
  ].filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Your account, workspace preferences, security and team access</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12 }}>
        <div className="card" style={{ padding: 8, height: "fit-content", display: "flex", flexDirection: "column", gap: 1 }}>
          {tabs.map((it) => (
            <button key={it.id} onClick={() => setTab(it.id)} className="nav-item" aria-current={tab === it.id ? "page" : undefined}>
              <span className="nav-item-icon"><Icon name={it.icon} size={15} /></span>
              <span className="nav-item-label">{it.label}</span>
            </button>
          ))}
        </div>
        <div>
          {tab === "profile" && <ProfileSettings />}
          {tab === "general" && <GeneralSettings data={data} />}
          {tab === "members" && <MembersSettings data={data} />}
          {tab === "rbac" && <RBACSettings data={data} />}
          {tab === "security" && <SecuritySettings />}
          {tab === "sessions" && isAdmin && <SessionsSettings />}
          {tab === "notifications" && <NotifSettings data={data} />}
        </div>
      </div>
    </div>
  );
}

type SettingsData = ReturnType<typeof useSettingsData>;

function SettingCard({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="card">
      <div style={{ padding: 18, paddingBottom: 14, borderBottom: "1px solid var(--border-1)" }}>
        <div className="card-title">{title}</div>
        {desc && <div className="text-sm muted" style={{ marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

// The signed-in user's own profile (reached from the avatar in the topbar).
function ProfileSettings() {
  const push = useToast();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", title: "", color: "#5b6ef5", bio: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!active || !u) return;
      const m = (u.user_metadata || {}) as Record<string, string>;
      setForm((f) => ({
        ...f,
        email: u.email || "",
        firstName: m.first_name || "",
        lastName: m.last_name || "",
        phone: m.phone || "",
        title: m.title || "",
        color: m.color || f.color,
        bio: m.bio || "",
      }));
    })();
    return () => { active = false; };
  }, [supabase]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const COLORS = ["#5b6ef5", "#f55b6e", "#f5b14c", "#22d3a0", "#b96eff", "#4cc9f5"];

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { first_name: form.firstName, last_name: form.lastName, phone: form.phone, title: form.title, color: form.color, bio: form.bio },
    });
    setSaving(false);
    push({ title: error ? "Could not save" : "Profile saved", variant: error ? "danger" : "success" });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  };

  return (
    <div className="col" style={{ gap: 12 }}>
      <SettingCard title="Your profile" desc="Your name and email for this account.">
        <div className="row" style={{ gap: 16, alignItems: "flex-start" }}>
          <div className="col" style={{ gap: 8, alignItems: "center" }}>
            <Avatar name={`${form.firstName} ${form.lastName}`.trim() || form.email} color={form.color} size="xl" />
            <div style={{ display: "flex", gap: 4 }}>
              {COLORS.map((c) => (
                <button key={c} onClick={() => set("color", c)} style={{ width: 18, height: 18, borderRadius: 999, background: c, border: form.color === c ? "2px solid var(--fg-1)" : "2px solid transparent" }} />
              ))}
            </div>
          </div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="field"><label className="field-label">First name</label><input className="input" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} /></div>
            <div className="field"><label className="field-label">Last name</label><input className="input" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} /></div>
            <div className="field"><label className="field-label">Email</label><input className="input" type="email" value={form.email} disabled title="Email is managed by your login" /></div>
            <div className="field"><label className="field-label">Phone</label><input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div className="field"><label className="field-label">Title / role</label><input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
          </div>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label className="field-label">Bio</label>
          <textarea className="input" value={form.bio} onChange={(e) => set("bio", e.target.value)} />
        </div>
      </SettingCard>
      <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
        <button className="btn btn-ghost" style={{ color: "var(--danger)" }} onClick={signOut}><Icon name="logout" size={14} /> Sign out</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
      </div>
    </div>
  );
}

function GeneralSettings({ data }: { data: SettingsData }) {
  const push = useToast();
  const [draft, setDraft] = useState(data.settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(data.settings); }, [data.settings]);
  const set = (k: keyof typeof draft, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { error } = (await data.saveSettings(draft)) || {};
    setSaving(false);
    push({ title: error ? "Could not save" : "Settings saved", variant: error ? "danger" : "success" });
  };

  return (
    <div className="col" style={{ gap: 12 }}>
      <SettingCard title="Organization profile" desc="Your team identity across Lane 2.">
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 64, height: 64, borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--border-1)", display: "grid", placeItems: "center", color: "var(--fg-3)" }}>
            <Icon name="image" size={20} />
          </div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="field"><label className="field-label">Organization name</label><input className="input" value={draft.orgName} onChange={(e) => set("orgName", e.target.value)} /></div>
            <div className="field"><label className="field-label">Slug</label><input className="input mono" value={draft.slug} onChange={(e) => set("slug", e.target.value)} /></div>
            <div className="field"><label className="field-label">Discipline</label>
              <select className="input" value={draft.discipline} onChange={(e) => set("discipline", e.target.value)}>
                {ORG_DISCIPLINES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field"><label className="field-label">Country</label>
              <select className="input" value={draft.country} onChange={(e) => set("country", e.target.value)}>
                <option value="">Select country…</option>
                {SETTINGS_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </SettingCard>

      <SettingCard title="Regional" desc="Defaults applied to dates, times and units across the workspace.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div className="field"><label className="field-label">Time zone</label>
            <select className="input" value={draft.timezone} onChange={(e) => set("timezone", e.target.value)}>
              {SETTINGS_TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
            </select>
          </div>
          <div className="field"><label className="field-label">Date format</label>
            <select className="input" value={draft.dateFormat} onChange={(e) => set("dateFormat", e.target.value)}>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            </select>
          </div>
          <div className="field"><label className="field-label">Distance unit</label>
            <select className="input" value={draft.distanceUnit} onChange={(e) => set("distanceUnit", e.target.value)}>
              <option value="metric">Metric (m, km)</option>
              <option value="imperial">Imperial</option>
            </select>
          </div>
        </div>
      </SettingCard>

      <SettingCard title="Default season">
        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}><label className="field-label">Season starts</label><input type="date" className="input" value={draft.seasonStart} onChange={(e) => set("seasonStart", e.target.value)} /></div>
          <div className="field" style={{ flex: 1 }}><label className="field-label">Season ends</label><input type="date" className="input" value={draft.seasonEnd} onChange={(e) => set("seasonEnd", e.target.value)} /></div>
        </div>
      </SettingCard>

      <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-secondary" onClick={() => setDraft(data.settings)}>Discard</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
      </div>
    </div>
  );
}

function MembersSettings({ data }: { data: SettingsData }) {
  const { currentUser } = useLane();
  const [showInvite, setShowInvite] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const roleName = (id: string) => data.roles.find((r) => r.id === id)?.name || id;
  const roleColor = (id: string) => data.roles.find((r) => r.id === id)?.color || "var(--fg-3)";

  const filtered = data.members.filter((m) => {
    if (roleFilter !== "all" && m.roleId !== roleFilter) return false;
    if (query && !(`${m.name} ${m.email}`.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  });

  return (
    <div className="col" style={{ gap: 12 }}>
      <SettingCard title="Members" desc={`${data.members.length + 1} ${data.members.length === 0 ? "person has" : "people have"} access to this workspace.`}>
        <div className="row" style={{ marginBottom: 12 }}>
          <div className="input-group" style={{ flex: 1, maxWidth: 320 }}>
            <Icon name="search" size={14} />
            <input className="input" placeholder="Search members..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <FilterDropdown label="Role" value={roleFilter} options={[{ v: "all", l: "All roles" }, ...data.roles.map((r) => ({ v: r.id, l: r.name }))]} onChange={setRoleFilter} />
          <div className="spacer" />
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}><Icon name="plus" size={13} /> Invite member</button>
        </div>
        <table className="table" style={{ border: "1px solid var(--border-1)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last active</th><th></th></tr>
          </thead>
          <tbody>
            {/* The account owner (you) — always an active admin, cannot be removed. */}
            {(roleFilter === "all" || roleFilter === "r-admin") && (
              <tr>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={currentUser?.name || "You"} color={currentUser?.color || "#5b6ef5"} size="sm" dot="online" />
                    <div className="fw-600">{currentUser?.name || "You"} <span className="text-xs muted">· You</span></div>
                  </div>
                </td>
                <td className="text-sm muted mono">{currentUser?.email || ""}</td>
                <td><Badge variant="accent">Admin</Badge></td>
                <td><Badge variant="success" dot>Active</Badge></td>
                <td className="text-sm muted">Now</td>
                <td></td>
              </tr>
            )}
            {filtered.map((m) => (
              <tr key={m.id}>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={m.name} color={m.color} size="sm" dot={m.status === "active" ? "online" : "offline"} />
                    <div className="fw-600">{m.name}</div>
                  </div>
                </td>
                <td className="text-sm muted mono">{m.email}</td>
                <td><Badge><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: 999, background: roleColor(m.roleId) }} />{roleName(m.roleId)}</span></Badge></td>
                <td><Badge variant={m.status === "active" ? "success" : m.status === "invited" ? "warning" : ""} dot>{m.status === "active" ? "Active" : m.status === "invited" ? "Invited" : "Inactive"}</Badge></td>
                <td className="text-sm muted">{m.lastActive}</td>
                <td><button className="icon-btn" title="Remove member" onClick={() => data.removeMember(m.id)}><Icon name="trash" size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SettingCard>
      {showInvite && <InviteModal roles={data.roles} onClose={() => setShowInvite(false)} onInvite={(email, role) => { data.inviteMember(email, role); setShowInvite(false); }} />}
    </div>
  );
}

function InviteModal({ roles, onClose, onInvite }: { roles: RoleDef[]; onClose: () => void; onInvite: (email: string, role: string) => void }) {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState(roles.find((r) => r.id !== "r-admin")?.id || roles[0]?.id || "r-coach");
  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Invite to your workspace"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => emails.split(",").map((e) => e.trim()).filter(Boolean).forEach((email) => onInvite(email, role))}
          >
            <Icon name="send" size={13} /> Send invitations
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 14 }}>
        <div className="field">
          <label className="field-label">Email addresses</label>
          <textarea className="input" placeholder="alice@team.io, bob@team.io" value={emails} onChange={(e) => setEmails(e.target.value)} />
          <span className="field-hint">Separate multiple emails with commas.</span>
        </div>
        <div className="field">
          <label className="field-label">Role</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {roles.filter((r) => r.id !== "r-admin").map((r) => (
              <label key={r.id} className="card card-pad" style={{ padding: 12, cursor: "pointer", border: role === r.id ? "1px solid var(--accent)" : "1px solid var(--border-1)", background: role === r.id ? "var(--accent-soft)" : "var(--bg-1)" }}>
                <input type="radio" checked={role === r.id} onChange={() => setRole(r.id)} style={{ display: "none" }} />
                <div className="fw-600 row" style={{ gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: r.color }} />
                  {r.name}
                </div>
                <div className="text-xs muted" style={{ marginTop: 4 }}>{r.description}</div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function RBACSettings({ data }: { data: SettingsData }) {
  const { isAdmin } = useLane();
  const push = useToast();
  const [activeRole, setActiveRole] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);

  const roles = data.roles;
  useEffect(() => {
    if (roles.length && !roles.some((r) => r.id === activeRole)) setActiveRole(roles.find((r) => r.id !== "r-admin")?.id || roles[0].id);
  }, [roles, activeRole]);

  // Member counts per role (owner counts as admin).
  const countFor = (roleId: string) => data.members.filter((m) => m.roleId === roleId).length + (roleId === "r-admin" ? 1 : 0);
  const active = roles.find((r) => r.id === activeRole);

  const removeRole = async () => {
    if (!active || active.isSystem) return;
    await data.deleteRole(active.id);
    push({ title: "Role deleted", variant: "info" });
  };

  return (
    <div className="col" style={{ gap: 12 }}>
      <SettingCard title="Roles" desc="Define roles and their feature-level permissions. Changes save immediately.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRole(r.id)}
              className="card card-pad"
              style={{ padding: 14, textAlign: "left", cursor: "pointer", border: activeRole === r.id ? "1px solid var(--accent)" : "1px solid var(--border-1)", background: activeRole === r.id ? "var(--accent-soft)" : "var(--bg-1)" }}
            >
              <div className="row" style={{ gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: r.color }} />
                <div className="fw-700">{r.name}</div>
              </div>
              <div className="text-xs muted" style={{ marginTop: 6, height: 32 }}>{r.description}</div>
              <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
                <span className="display fw-700" style={{ fontSize: 18, letterSpacing: "-0.02em" }}>{countFor(r.id)}</span>
                <span className="text-xs muted">members · {r.permissions.length} perms</span>
              </div>
            </button>
          ))}
          {/* Create custom role — admins only. */}
          {isAdmin && (
            <button onClick={() => setShowCreate(true)} className="card card-pad" style={{ padding: 14, textAlign: "left", cursor: "pointer", borderStyle: "dashed", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--fg-3)", minHeight: 100 }}>
              <Icon name="plus" size={20} />
              <span className="fw-600 text-sm">Create custom role</span>
            </button>
          )}
        </div>

        <div className="card" style={{ background: "var(--bg-2)" }}>
          <div className="card-header" style={{ background: "transparent" }}>
            <div>
              <div className="card-title">Permissions · {active?.name || "—"}</div>
              <div className="text-sm muted">Toggle access for this role. Admin always has all permissions.</div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              {active && !active.isSystem && isAdmin && (
                <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={removeRole}><Icon name="trash" size={13} /> Delete role</button>
              )}
            </div>
          </div>
          <div style={{ padding: 16, overflowX: "auto" }}>
            <table className="table" style={{ background: "transparent" }}>
              <thead>
                <tr>
                  <th style={{ width: "40%", background: "transparent" }}>Permission</th>
                  {roles.map((r) => (
                    <th key={r.id} style={{ background: "transparent", textAlign: "center" }}>
                      <div className="row" style={{ justifyContent: "center", gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: r.color }} />
                        {r.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((group) => (
                  <React.Fragment key={group.group}>
                    <tr>
                      <td colSpan={roles.length + 1} style={{ background: "var(--bg-3)", padding: "6px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-3)" }}>{group.group}</td>
                    </tr>
                    {group.items.map((p) => (
                      <tr key={p.id} style={{ cursor: "default" }}>
                        <td className="fw-500">{p.label}</td>
                        {roles.map((r) => {
                          const on = r.id === "r-admin" ? true : r.permissions.includes(p.id);
                          const disabled = r.id === "r-admin" || !isAdmin;
                          return (
                            <td key={r.id} style={{ textAlign: "center" }}>
                              <button onClick={() => !disabled && data.toggleRolePerm(r.id, p.id)} disabled={disabled} className="switch" data-on={on ? "true" : "false"} style={{ verticalAlign: "middle" }} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SettingCard>
      {showCreate && <CreateRoleModal onClose={() => setShowCreate(false)} onCreate={async (name, desc) => { const id = await data.createRole(name, desc); if (id) setActiveRole(id); setShowCreate(false); }} />}
    </div>
  );
}

function CreateRoleModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, desc: string) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Create custom role"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!name.trim()} onClick={() => onCreate(name.trim(), desc.trim())}>Create role</button>
        </>
      }
    >
      <div className="col" style={{ gap: 14 }}>
        <div className="field"><label className="field-label">Role name</label><input className="input" placeholder="e.g. Physio" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div className="field"><label className="field-label">Description</label><textarea className="input" placeholder="What can this role do?" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        <div className="text-xs muted">You can toggle this role&apos;s permissions in the matrix after creating it.</div>
      </div>
    </Modal>
  );
}

function SecuritySettings() {
  return (
    <div className="col" style={{ gap: 12 }}>
      <MfaCard />
      <PasswordCard />
    </div>
  );
}

// Real TOTP two-factor via Supabase MFA: enroll → scan QR → verify code.
function MfaCard() {
  const push = useToast();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null); // verified factor
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = (data?.totp || []).find((f: { id: string; status: string }) => f.status === "verified");
    setFactorId(verified?.id || null);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startEnroll = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error || !data) { push({ title: error?.message || "Could not start 2FA", variant: "danger" }); return; }
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verify = async () => {
    if (!enroll) return;
    setBusy(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enroll.id });
    if (chErr || !ch) { setBusy(false); push({ title: chErr?.message || "Verification failed", variant: "danger" }); return; }
    const { error } = await supabase.auth.mfa.verify({ factorId: enroll.id, challengeId: ch.id, code });
    setBusy(false);
    if (error) { push({ title: error.message || "Invalid code", variant: "danger" }); return; }
    push({ title: "Two-factor enabled", variant: "success" });
    setEnroll(null); setCode("");
    refresh();
  };

  const disable = async () => {
    if (!factorId) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) { push({ title: error.message, variant: "danger" }); return; }
    push({ title: "Two-factor disabled", variant: "info" });
    refresh();
  };

  return (
    <SettingCard title="Two-factor authentication" desc="Add an extra layer of security with an authenticator app (TOTP).">
      {loading ? (
        <div className="text-sm muted">Loading…</div>
      ) : factorId ? (
        <div className="row">
          <Icon name="fingerprint" size={20} style={{ color: "var(--success)" }} />
          <div style={{ flex: 1 }}>
            <div className="fw-600">Authenticator app · enabled</div>
            <div className="text-sm muted">Your account is protected by a one-time code.</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={disable} disabled={busy}>Disable</button>
        </div>
      ) : enroll ? (
        <div className="col" style={{ gap: 12 }}>
          <div className="text-sm muted">Scan this QR code with Google Authenticator, 1Password or Authy, then enter the 6-digit code.</div>
          <div className="row" style={{ gap: 16, alignItems: "flex-start" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enroll.qr} alt="2FA QR code" width={160} height={160} style={{ background: "#fff", borderRadius: 8, padding: 6 }} />
            <div className="col" style={{ gap: 8, flex: 1 }}>
              <div className="text-xs muted">Or enter this secret manually:</div>
              <div className="mono text-sm" style={{ wordBreak: "break-all", background: "var(--bg-2)", padding: "8px 10px", borderRadius: 6 }}>{enroll.secret}</div>
              <div className="field"><label className="field-label">Verification code</label><input className="input mono" inputMode="numeric" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} /></div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setEnroll(null); setCode(""); }}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={verify} disabled={busy || code.length !== 6}>Verify &amp; enable</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="row">
          <Icon name="fingerprint" size={20} style={{ color: "var(--fg-3)" }} />
          <div style={{ flex: 1 }}>
            <div className="fw-600">Authenticator app · disabled</div>
            <div className="text-sm muted">Protect your account with a rotating one-time code.</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={startEnroll} disabled={busy}>Enable</button>
        </div>
      )}
    </SettingCard>
  );
}

function PasswordCard() {
  const push = useToast();
  const { currentUser } = useLane();
  const [supabase] = useState(() => createClient());
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const update = async () => {
    if (next.length < 8) { push({ title: "New password must be at least 8 characters", variant: "danger" }); return; }
    if (next !== confirm) { push({ title: "Passwords don't match", variant: "danger" }); return; }
    if (!currentUser?.email) { push({ title: "No account email found", variant: "danger" }); return; }
    setBusy(true);
    // Verify the current password by re-authenticating before changing it.
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: currentUser.email, password: cur });
    if (authErr) { setBusy(false); push({ title: "Current password is incorrect", variant: "danger" }); return; }
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) { push({ title: error.message, variant: "danger" }); return; }
    push({ title: "Password updated", variant: "success" });
    setCur(""); setNext(""); setConfirm("");
  };

  return (
    <SettingCard title="Password" desc="Enter your current password, then choose a new one.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div className="field"><label className="field-label">Current</label><input className="input" type="password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
        <div className="field"><label className="field-label">New</label><input className="input" type="password" value={next} onChange={(e) => setNext(e.target.value)} /></div>
        <div className="field"><label className="field-label">Confirm</label><input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
      </div>
      <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
        <button className="btn btn-primary" onClick={update} disabled={busy || !cur || !next || !confirm}>{busy ? "Updating…" : "Update password"}</button>
      </div>
    </SettingCard>
  );
}

function SessionsSettings() {
  const router = useRouter();
  const push = useToast();
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<{ signedInAt: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // last sign-in time from the JWT issued-at claim
        const iat = (data.session as any).user?.last_sign_in_at || null;
        setSession({ signedInAt: iat ? new Date(iat).toLocaleString() : "This session" });
      }
    })();
  }, [supabase]);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const browser = /Edg/.test(ua) ? "Microsoft Edge" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "This browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";

  const signOutEverywhere = async () => {
    setBusy(true);
    await supabase.auth.signOut({ scope: "global" });
    push({ title: "Signed out on all devices", variant: "info" });
    router.push("/signin");
    router.refresh();
  };

  return (
    <SettingCard title="Active sessions" desc="Your current sign-in. Signing out everywhere ends every session on all devices.">
      <div className="col" style={{ gap: 8 }}>
        <div className="row" style={{ padding: 14, border: "1px solid var(--border-1)", borderRadius: "var(--r-md)", background: "var(--accent-soft)" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-2)", display: "grid", placeItems: "center", color: "var(--fg-2)" }}>
            <Icon name="desktop" size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="row" style={{ gap: 6 }}>
              <div className="fw-600">{browser}{os ? ` · ${os}` : ""}</div>
              <Badge variant="accent" dot>This device</Badge>
            </div>
            <div className="text-xs muted">Signed in {session?.signedInAt || "—"}</div>
          </div>
        </div>
        <div className="text-xs muted" style={{ padding: "0 2px" }}>
          Only your current session is shown — listing other devices isn&apos;t available from the browser. Use &ldquo;Sign out everywhere&rdquo; to revoke all sessions.
        </div>
      </div>
      <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
        <button className="btn btn-secondary" onClick={signOutEverywhere} disabled={busy}>Sign out everywhere</button>
      </div>
    </SettingCard>
  );
}

function NotifSettings({ data }: { data: SettingsData }) {
  const push = useToast();
  const prefs = data.settings.notifPrefs;

  const toggle = async (key: string, col: number) => {
    const cur = (prefs[key] || [false, false]).slice(0, NOTIF_CHANNELS.length);
    const nextRow = NOTIF_CHANNELS.map((_, i) => (i === col ? !cur[i] : !!cur[i]));
    const nextPrefs = { ...prefs, [key]: nextRow };
    const { error } = (await data.saveSettings({ notifPrefs: nextPrefs })) || {};
    if (error) push({ title: "Could not save preference", variant: "danger" });
  };

  return (
    <SettingCard title="Notification preferences" desc="Choose how you want to be alerted. Changes save automatically.">
      <table className="table" style={{ border: "1px solid var(--border-1)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
        <thead>
          <tr><th>Event</th>{NOTIF_CHANNELS.map((c) => <th key={c} style={{ textAlign: "center" }}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {NOTIF_EVENTS.map((row) => {
            const vals = (prefs[row.key] || row.default).slice(0, NOTIF_CHANNELS.length);
            return (
              <tr key={row.key} style={{ cursor: "default" }}>
                <td className="fw-500">{row.label}</td>
                {NOTIF_CHANNELS.map((_, j) => (
                  <td key={j} style={{ textAlign: "center" }}><button className="switch" data-on={vals[j] ? "true" : "false"} onClick={() => toggle(row.key, j)} /></td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </SettingCard>
  );
}
