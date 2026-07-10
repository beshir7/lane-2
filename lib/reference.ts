// =========================================================================
// Reference data — static configuration shared by client and server.
// This is NOT sample/user data: it's the fixed vocabulary of the domain
// (disciplines, document categories, roles, permission catalogue).
// Safe to import anywhere.
// =========================================================================

import type { EventCategory, EventCategoryKey, DocCategory, Role, PermissionGroup } from "./types";

export const EVENT_CATEGORIES: Record<EventCategoryKey, EventCategory> = {
  sprints: { label: "Sprints", color: "#f55b6e", events: ["100m", "200m", "400m"] },
  middle: { label: "Middle Distance", color: "#f5b14c", events: ["800m", "1500m", "Mile"] },
  long: { label: "Long Distance", color: "#22d3a0", events: ["3000m", "5000m", "10000m"] },
  hurdles: { label: "Hurdles", color: "#b96eff", events: ["100mH", "110mH", "400mH"] },
  jumps: { label: "Jumps", color: "#5b6ef5", events: ["Long Jump", "High Jump", "Triple Jump", "Pole Vault"] },
  throws: { label: "Throws", color: "#4cc9f5", events: ["Shot Put", "Discus", "Javelin", "Hammer"] },
  relays: { label: "Relays", color: "#f55b6e", events: ["4x100m", "4x400m"] },
};

export const ALL_EVENTS: string[] = Object.values(EVENT_CATEGORIES).flatMap((c) => c.events);

// Full discipline vocabulary for the "Seleziona discipline" picker (photo_32).
// The agency runs distance/road athletes, so the list is track + road ordered
// from shortest to longest, matching what the old Dema DB offered.
export const ALL_DISCIPLINES: string[] = [
  "60 m", "100 m", "200 m", "300 m", "400 m", "800 m", "1000 m", "1500 m",
  "1 Mile", "2000 m", "3000 m", "2 Miles", "3000 m SC", "5000 m", "10000 m",
  "5 Km", "8 Km", "10 Km", "12 Km", "15 Km", "10 Miles", "20 Km", "Half Marathon",
  "25 Km", "30 Km", "Marathon", "Ekiden", "Cross",
];

export const DOC_CATEGORIES: DocCategory[] = [
  { id: "all", label: "All documents", icon: "folder" },
  { id: "passport", label: "Passports", icon: "globe" },
  { id: "visa", label: "Visas", icon: "flag" },
  { id: "medical", label: "Medical records", icon: "shield" },
  { id: "contract", label: "Contracts", icon: "fileText" },
  { id: "media", label: "Media", icon: "image" },
];

export const ROLES: Role[] = [
  { id: "r-admin", name: "Admin", description: "Full access to all features and settings", users: 3, color: "var(--accent)" },
  { id: "r-coach", name: "Coach", description: "Manage assigned athletes, schedules and competition entries", users: 8, color: "var(--success)" },
  { id: "r-manager", name: "Manager", description: "Manage operations, travel, documents and CMS", users: 4, color: "var(--warning)" },
  { id: "r-readonly", name: "Read-only", description: "View-only access to dashboards and reports", users: 12, color: "var(--info)" },
];

export const PERMISSIONS: PermissionGroup[] = [
  { group: "Athletes", items: [
    { id: "athletes.view", label: "View athletes" },
    { id: "athletes.create", label: "Create athletes" },
    { id: "athletes.edit", label: "Edit athlete profiles" },
    { id: "athletes.delete", label: "Delete athletes" },
  ]},
  { group: "Competitions", items: [
    { id: "comp.view", label: "View competitions" },
    { id: "comp.create", label: "Create competitions" },
    { id: "comp.results", label: "Enter & edit results" },
    { id: "comp.delete", label: "Delete competitions" },
  ]},
  { group: "Calendar", items: [
    { id: "cal.view", label: "View calendar" },
    { id: "cal.edit", label: "Create & edit events" },
    { id: "cal.others", label: "Edit other coaches' events" },
  ]},
  { group: "Documents", items: [
    { id: "docs.view", label: "View documents" },
    { id: "docs.upload", label: "Upload documents" },
    { id: "docs.sensitive", label: "Access sensitive (medical/legal)" },
    { id: "docs.delete", label: "Delete documents" },
  ]},
  { group: "Administration", items: [
    { id: "admin.users", label: "Manage users" },
    { id: "admin.roles", label: "Manage roles" },
    { id: "admin.audit", label: "View audit logs" },
    { id: "admin.org", label: "Organization settings" },
  ]},
];

// Which roles get which permissions by default (stored as string arrays).
export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  "r-admin": PERMISSIONS.flatMap((g) => g.items.map((i) => i.id)),
  "r-coach": ["athletes.view", "athletes.edit", "comp.view", "comp.results", "cal.view", "cal.edit", "docs.view", "docs.upload"],
  "r-manager": ["athletes.view", "athletes.create", "athletes.edit", "comp.view", "comp.create", "cal.view", "cal.edit", "cal.others", "docs.view", "docs.upload", "docs.delete"],
  "r-readonly": ["athletes.view", "comp.view", "cal.view", "docs.view"],
};

// Third-party integrations shown on the settings screen (configuration).
export const INTEGRATIONS = [
  { name: "Google Calendar", desc: "Two-way sync events", connected: true, color: "#4285F4" },
  { name: "Outlook 365", desc: "Two-way sync events", connected: false, color: "#0078D4" },
  { name: "Slack", desc: "Post updates to channel", connected: true, color: "#4A154B" },
  { name: "Zapier", desc: "5,000+ app integrations", connected: false, color: "#FF4A00" },
  { name: "Stripe", desc: "Federation registration fees", connected: false, color: "#635bff" },
  { name: "World Athletics", desc: "Result data feed", connected: true, color: "#f55b6e" },
];

// "Today" anchor for the demo dataset.
export const TODAY_ISO = "2026-05-21";
