"use client";

// Settings + RBAC: General, Members, Roles & permissions matrix, Security, Audit log.

import React, { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Badge, Modal } from "@/components/primitives";
import { FilterDropdown } from "@/components/shared";
import { ROLES, PERMISSIONS, DEFAULT_PERMISSIONS, INTEGRATIONS } from "@/lib/reference";
import { useLane } from "@/components/lane-provider";
import { downloadCsv } from "@/utils";
import type { TeamUser } from "@/lib/types";

export function SettingsScreen({ initialTab }: { initialTab?: string }) {
  const [tab, setTab] = useState(initialTab || "general");
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Organization-wide preferences, security and team access</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12 }}>
        <div className="card" style={{ padding: 8, height: "fit-content", display: "flex", flexDirection: "column", gap: 1 }}>
          {[
            { id: "general", label: "General", icon: "settings" },
            { id: "members", label: "Members", icon: "users" },
            { id: "rbac", label: "Roles & access", icon: "shield" },
            { id: "security", label: "Security", icon: "lock" },
            { id: "sessions", label: "Sessions & devices", icon: "desktop" },
            { id: "notifications", label: "Notifications", icon: "bell" },
            { id: "integrations", label: "Integrations", icon: "link" },
            { id: "audit", label: "Audit log", icon: "history" },
            { id: "billing", label: "Plan", icon: "star" },
          ].map((it) => (
            <button key={it.id} onClick={() => setTab(it.id)} className="nav-item" aria-current={tab === it.id ? "page" : undefined}>
              <span className="nav-item-icon"><Icon name={it.icon} size={15} /></span>
              <span className="nav-item-label">{it.label}</span>
            </button>
          ))}
        </div>
        <div>
          {tab === "general" && <GeneralSettings />}
          {tab === "members" && <MembersSettings />}
          {tab === "rbac" && <RBACSettings />}
          {tab === "security" && <SecuritySettings />}
          {tab === "sessions" && <SessionsSettings />}
          {tab === "notifications" && <NotifSettings />}
          {tab === "integrations" && <IntegrationsSettings />}
          {tab === "audit" && <AuditLog />}
          {tab === "billing" && <BillingSettings />}
        </div>
      </div>
    </div>
  );
}

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

function GeneralSettings() {
  return (
    <div className="col" style={{ gap: 12 }}>
      <SettingCard title="Organization profile" desc="Your team identity across Lane 2.">
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 64, height: 64, borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--border-1)", display: "grid", placeItems: "center", color: "var(--fg-3)" }}>
            <Icon name="image" size={20} />
          </div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="field"><label className="field-label">Organization name</label><input className="input" defaultValue="Lane Athletics" /></div>
            <div className="field"><label className="field-label">Slug</label><input className="input mono" defaultValue="lane-athletics" /></div>
            <div className="field"><label className="field-label">Discipline</label><select className="input"><option>Track &amp; Field</option></select></div>
            <div className="field"><label className="field-label">Country</label><select className="input"><option>Norway</option><option>USA</option><option>UK</option></select></div>
          </div>
        </div>
      </SettingCard>

      <SettingCard title="Regional" desc="Defaults applied to dates, times and units across the workspace.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div className="field"><label className="field-label">Time zone</label><select className="input"><option>Europe/Oslo (UTC+2)</option></select></div>
          <div className="field"><label className="field-label">Date format</label><select className="input"><option>YYYY-MM-DD</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select></div>
          <div className="field"><label className="field-label">Distance unit</label><select className="input"><option>Metric (m, km)</option><option>Imperial</option></select></div>
        </div>
      </SettingCard>

      <SettingCard title="Default season">
        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}><label className="field-label">Season starts</label><input type="date" className="input" defaultValue="2026-01-01" /></div>
          <div className="field" style={{ flex: 1 }}><label className="field-label">Season ends</label><input type="date" className="input" defaultValue="2026-09-30" /></div>
        </div>
      </SettingCard>

      <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-secondary">Discard</button>
        <button className="btn btn-primary">Save changes</button>
      </div>
    </div>
  );
}

function MembersSettings() {
  const { users, inviteUser, removeUser } = useLane();
  const [showInvite, setShowInvite] = useState(false);
  const handleInvite = (u: Partial<TeamUser>) => {
    inviteUser(u);
    setShowInvite(false);
  };
  return (
    <div className="col" style={{ gap: 12 }}>
      <SettingCard title="Members" desc={`${users.length} people have access to Lane Athletics workspace.`}>
        <div className="row" style={{ marginBottom: 12 }}>
          <div className="input-group" style={{ flex: 1, maxWidth: 320 }}>
            <Icon name="search" size={14} />
            <input className="input" placeholder="Search members..." />
          </div>
          <FilterDropdown label="Role" value="all" options={[{ v: "all", l: "All roles" }, ...ROLES.map((r) => ({ v: r.id, l: r.name }))]} onChange={() => {}} />
          <div className="spacer" />
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}><Icon name="plus" size={13} /> Invite member</button>
        </div>
        <table className="table" style={{ border: "1px solid var(--border-1)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last active</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const role = ROLES.find((r) => r.id === u.role);
              return (
                <tr key={u.id}>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <Avatar name={u.name} color={u.color} size="sm" dot={u.active ? "online" : "offline"} />
                      <div className="fw-600">{u.name}</div>
                    </div>
                  </td>
                  <td className="text-sm muted mono">{u.email}</td>
                  <td><Badge variant={role?.id === "r-admin" ? "accent" : role?.id === "r-coach" ? "success" : ""}>{role?.name}</Badge></td>
                  <td><Badge variant={u.active ? "success" : ""} dot>{u.active ? "Active" : "Inactive"}</Badge></td>
                  <td className="text-sm muted">{u.last}</td>
                  <td><button className="icon-btn" title="Remove member" onClick={() => removeUser(u.id)}><Icon name="trash" size={14} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SettingCard>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSave={handleInvite} />}
    </div>
  );
}

function InviteModal({ onClose, onSave }: { onClose: () => void; onSave: (u: Partial<TeamUser>) => void }) {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("r-coach");
  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Invite to Lane Athletics"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              emails.split(",").map((e) => e.trim()).filter(Boolean).forEach((email) => onSave({ name: email.split("@")[0], email, role, active: true }));
            }}
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
            {ROLES.map((r) => (
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

function RBACSettings() {
  const [perms, setPerms] = useState<Record<string, Set<string>>>(() => {
    const cloned: Record<string, Set<string>> = {};
    Object.entries(DEFAULT_PERMISSIONS).forEach(([role, ids]) => {
      cloned[role] = new Set(ids);
    });
    return cloned;
  });
  const [activeRole, setActiveRole] = useState("r-coach");

  const togglePerm = (roleId: string, permId: string) => {
    setPerms((p) => {
      const next = { ...p };
      next[roleId] = new Set(next[roleId]);
      next[roleId].has(permId) ? next[roleId].delete(permId) : next[roleId].add(permId);
      return next;
    });
  };

  return (
    <div className="col" style={{ gap: 12 }}>
      <SettingCard title="Roles" desc="Define roles and their feature-level permissions. Changes apply immediately to all members of the role.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          {ROLES.map((r) => (
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
                <span className="display fw-700" style={{ fontSize: 18, letterSpacing: "-0.02em" }}>{r.users}</span>
                <span className="text-xs muted">members · {perms[r.id].size} perms</span>
              </div>
            </button>
          ))}
          <button className="card card-pad" style={{ padding: 14, textAlign: "left", cursor: "pointer", borderStyle: "dashed", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--fg-3)", minHeight: 100 }}>
            <Icon name="plus" size={20} />
            <span className="fw-600 text-sm">Create custom role</span>
          </button>
        </div>

        <div className="card" style={{ background: "var(--bg-2)" }}>
          <div className="card-header" style={{ background: "transparent" }}>
            <div>
              <div className="card-title">Permissions · {ROLES.find((r) => r.id === activeRole)?.name}</div>
              <div className="text-sm muted">Toggle access for this role. Admin always has all permissions.</div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn btn-secondary btn-sm"><Icon name="copy" size={13} /> Duplicate</button>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }}><Icon name="trash" size={13} /> Delete role</button>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <table className="table" style={{ background: "transparent" }}>
              <thead>
                <tr>
                  <th style={{ width: "40%", background: "transparent" }}>Permission</th>
                  {ROLES.map((r) => (
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
                      <td colSpan={5} style={{ background: "var(--bg-3)", padding: "6px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-3)" }}>{group.group}</td>
                    </tr>
                    {group.items.map((p) => (
                      <tr key={p.id} style={{ cursor: "default" }}>
                        <td className="fw-500">{p.label}</td>
                        {ROLES.map((r) => {
                          const on = perms[r.id].has(p.id);
                          const disabled = r.id === "r-admin";
                          return (
                            <td key={r.id} style={{ textAlign: "center" }}>
                              <button onClick={() => !disabled && togglePerm(r.id, p.id)} disabled={disabled} className="switch" data-on={on ? "true" : "false"} style={{ verticalAlign: "middle" }} />
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

      <SettingCard title="Access denied preview" desc="What users see when they hit a restricted area.">
        <div className="card card-pad" style={{ padding: 30, background: "var(--bg-2)", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--danger-soft)", color: "var(--danger)", display: "grid", placeItems: "center", margin: "0 auto" }}>
            <Icon name="lock" size={24} />
          </div>
          <div className="display fw-700" style={{ fontSize: 18, marginTop: 14, letterSpacing: "-0.02em" }}>You don&apos;t have access</div>
          <div className="text-sm muted" style={{ marginTop: 4, maxWidth: 320, margin: "4px auto 14px" }}>
            This area requires the <b style={{ color: "var(--fg-1)" }}>admin.users</b> permission. Ask your admin to grant access.
          </div>
          <button className="btn btn-secondary btn-sm">Request access</button>
        </div>
      </SettingCard>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="col" style={{ gap: 12 }}>
      <SettingCard title="Two-factor authentication" desc="Add an extra layer of security to your account.">
        <div className="row">
          <Icon name="fingerprint" size={20} style={{ color: "var(--success)" }} />
          <div style={{ flex: 1 }}>
            <div className="fw-600">Authenticator app · enabled</div>
            <div className="text-sm muted">Last verified May 12 · Recovery codes generated</div>
          </div>
          <button className="btn btn-secondary btn-sm">Manage</button>
        </div>
      </SettingCard>

      <SettingCard title="Password">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div className="field"><label className="field-label">Current</label><input className="input" type="password" defaultValue="••••••••" /></div>
          <div className="field"><label className="field-label">New</label><input className="input" type="password" /></div>
          <div className="field"><label className="field-label">Confirm</label><input className="input" type="password" /></div>
        </div>
        <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
          <button className="btn btn-primary">Update password</button>
        </div>
      </SettingCard>

      <SettingCard title="Single Sign-On (SSO)">
        <div className="col" style={{ gap: 8 }}>
          <div className="row">
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            <div style={{ flex: 1 }}><div className="fw-600">Google Workspace</div><div className="text-sm muted">lane-athletics.io · connected</div></div>
            <Badge variant="success" dot>Active</Badge>
          </div>
          <div className="row" style={{ borderTop: "1px solid var(--border-1)", paddingTop: 10 }}>
            <Icon name="qr" size={18} style={{ color: "var(--fg-3)" }} />
            <div style={{ flex: 1 }}><div className="fw-600">SAML 2.0</div><div className="text-sm muted">Connect Okta, Azure AD, OneLogin</div></div>
            <button className="btn btn-secondary btn-sm">Connect</button>
          </div>
        </div>
      </SettingCard>

      <SettingCard title="API tokens">
        <div className="col" style={{ gap: 6 }}>
          {[
            { name: "Mobile app token", created: "2025-11-04", scope: "read-only" },
            { name: "CI integration", created: "2026-02-19", scope: "full" },
          ].map((t, i) => (
            <div key={i} className="row" style={{ padding: "10px 0", borderBottom: i === 0 ? "1px solid var(--border-1)" : "none" }}>
              <Icon name="key" size={16} style={{ color: "var(--fg-3)" }} />
              <div style={{ flex: 1 }}><div className="fw-600">{t.name}</div><div className="text-xs muted mono">sk_•••••••••••••sJh3 · {t.scope}</div></div>
              <div className="text-xs muted">{t.created}</div>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }}>Revoke</button>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, alignSelf: "flex-start" }}><Icon name="plus" size={13} /> Generate token</button>
        </div>
      </SettingCard>
    </div>
  );
}

function SessionsSettings() {
  const { sessions, revokeSession } = useLane();
  return (
    <SettingCard title="Active sessions" desc="Devices currently signed into your Lane account.">
      <div className="col" style={{ gap: 8 }}>
        {sessions.map((s) => (
          <div key={s.id} className="row" style={{ padding: 14, border: "1px solid var(--border-1)", borderRadius: "var(--r-md)", background: s.current ? "var(--accent-soft)" : "var(--bg-1)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-2)", display: "grid", placeItems: "center", color: "var(--fg-2)" }}>
              <Icon name={s.icon} size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="row" style={{ gap: 6 }}>
                <div className="fw-600">{s.device}</div>
                {s.current && <Badge variant="accent" dot>This device</Badge>}
              </div>
              <div className="text-xs muted">{s.loc}</div>
            </div>
            <div className="text-sm muted">{s.last}</div>
            {!s.current && <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => revokeSession(s.id)}>Revoke</button>}
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
        <button className="btn btn-secondary" onClick={() => sessions.filter((s) => !s.current).forEach((s) => revokeSession(s.id))}>Sign out everywhere</button>
      </div>
    </SettingCard>
  );
}

function NotifSettings() {
  return (
    <SettingCard title="Notification preferences" desc="Choose how you want to be alerted.">
      <table className="table" style={{ border: "1px solid var(--border-1)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
        <thead>
          <tr><th>Event</th><th style={{ textAlign: "center" }}>In-app</th><th style={{ textAlign: "center" }}>Email</th><th style={{ textAlign: "center" }}>Push</th><th style={{ textAlign: "center" }}>SMS</th></tr>
        </thead>
        <tbody>
          {[
            { e: "Competition reminders", v: [true, true, true, false] },
            { e: "Calendar conflicts", v: [true, true, false, false] },
            { e: "Document expiry alerts", v: [true, true, false, true] },
            { e: "Personal best logged", v: [true, false, true, false] },
            { e: "New team invitations", v: [true, true, false, false] },
            { e: "System status updates", v: [true, true, false, false] },
          ].map((row, i) => (
            <tr key={i} style={{ cursor: "default" }}>
              <td className="fw-500">{row.e}</td>
              {row.v.map((on, j) => (
                <td key={j} style={{ textAlign: "center" }}><button className="switch" data-on={on ? "true" : "false"} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </SettingCard>
  );
}

function IntegrationsSettings() {
  return (
    <div className="col" style={{ gap: 12 }}>
      <SettingCard title="Connected services">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {INTEGRATIONS.map((it, i) => (
            <div key={i} className="card card-pad row" style={{ padding: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 9, background: it.color + "22", color: it.color, display: "grid", placeItems: "center", fontWeight: 800, fontFamily: "var(--font-display)" }}>{it.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div className="fw-700">{it.name}</div>
                <div className="text-xs muted">{it.desc}</div>
              </div>
              {it.connected ? <Badge variant="success" dot>Connected</Badge> : <button className="btn btn-secondary btn-sm">Connect</button>}
            </div>
          ))}
        </div>
      </SettingCard>
    </div>
  );
}

function AuditLog() {
  const { audit } = useLane();
  const exportCsv = () =>
    downloadCsv(
      "lane-audit-log",
      audit.map((r) => ({ timestamp: r.ts, actor: r.who, action: r.action, target: r.target, ip: r.ip })),
    );
  return (
    <SettingCard title="Audit log" desc="Tamper-evident record of every action across Lane Athletics.">
      <div className="row" style={{ marginBottom: 12, gap: 8 }}>
        <div className="input-group" style={{ flex: 1, maxWidth: 280 }}>
          <Icon name="search" size={14} />
          <input className="input" placeholder="Filter by user, action, target..." />
        </div>
        <FilterDropdown label="Action" value="all" options={[{ v: "all", l: "All actions" }, { v: "create", l: "Create" }, { v: "update", l: "Update" }, { v: "delete", l: "Delete" }]} onChange={() => {}} />
        <FilterDropdown label="Range" value="7d" options={[{ v: "1d", l: "Last day" }, { v: "7d", l: "Last 7 days" }, { v: "30d", l: "Last 30 days" }]} onChange={() => {}} />
        <div className="spacer" />
        <button className="btn btn-secondary btn-sm" onClick={exportCsv}><Icon name="download" size={13} /> Export CSV</button>
      </div>
      <table className="table" style={{ border: "1px solid var(--border-1)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
        <thead>
          <tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>Origin IP</th></tr>
        </thead>
        <tbody>
          {audit.map((r) => (
            <tr key={r.id} style={{ cursor: "default" }}>
              <td className="text-sm muted mono" style={{ whiteSpace: "nowrap" }}>{r.ts}</td>
              <td>
                <div className="row" style={{ gap: 8 }}>
                  <Avatar name={r.who} color={r.whoColor} size="xs" />
                  <span className="fw-600 text-sm">{r.who}</span>
                </div>
              </td>
              <td><Badge variant={r.variant}>{r.action}</Badge></td>
              <td className="text-sm">{r.target}</td>
              <td className="text-sm muted mono">{r.ip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SettingCard>
  );
}

function BillingSettings() {
  return (
    <div className="col" style={{ gap: 12 }}>
      <SettingCard title="Current plan">
        <div className="row">
          <div style={{ flex: 1 }}>
            <Badge variant="accent">Pro · Annual</Badge>
            <div className="display fw-800" style={{ fontSize: 30, letterSpacing: "-0.03em", marginTop: 6 }}>$249<span className="text-md muted" style={{ fontWeight: 500 }}> /month</span></div>
            <div className="text-sm muted">Billed annually · renews January 2027 · 27 seats included</div>
          </div>
          <button className="btn btn-secondary">Change plan</button>
          <button className="btn btn-primary">Upgrade</button>
        </div>
      </SettingCard>
      <SettingCard title="Usage">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <UsageStat label="Athletes" used={12} max={50} />
          <UsageStat label="Members" used={6} max={27} />
          <UsageStat label="Storage" used={47} max={5120} unit="MB" />
        </div>
      </SettingCard>
    </div>
  );
}

function UsageStat({ label, used, max, unit }: { label: string; used: number; max: number; unit?: string }) {
  return (
    <div>
      <div className="text-sm muted fw-600">{label}</div>
      <div className="display fw-700" style={{ fontSize: 22, letterSpacing: "-0.02em", marginTop: 2 }}>
        {used} <span className="text-sm muted" style={{ fontWeight: 500 }}>/ {max}{unit ? ` ${unit}` : ""}</span>
      </div>
      <div className="progress" style={{ marginTop: 8 }}><div style={{ width: (used / max) * 100 + "%" }} /></div>
    </div>
  );
}
