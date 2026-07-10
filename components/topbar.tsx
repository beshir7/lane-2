"use client";

// Topbar — breadcrumbs, search, sync indicator, notifications, profile.

import React from "react";
import { usePathname, useParams } from "next/navigation";
import { Icon } from "./icon";
import { Avatar } from "./primitives";
import { useLane } from "./lane-provider";
import { PrintMenu } from "./print-menu";

// URL segment → i18n nav key.
const SEG_KEY: Record<string, string> = {
  dashboard: "nav.dashboard",
  athletes: "nav.athletes",
  races: "nav.races",
  organizers: "nav.organizers",
  calendar: "nav.calendar",
  documents: "nav.documents",
  cms: "nav.content",
  reports: "nav.reports",
  notifications: "nav.notifications",
  settings: "nav.settings",
  role: "nav.roles",
};

export function Topbar() {
  const { athletes, competitions, unreadCount, tweaks, setTweak, setCmdOpen, navigate, t } = useLane();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();

  const seg = pathname.split("/").filter(Boolean)[0] || "dashboard";
  const crumbs: string[] = ["Lane Athletics", SEG_KEY[seg] ? t(SEG_KEY[seg]) : seg];

  if (seg === "athletes" && params?.id) {
    const a = athletes.find((x) => x.id === params.id);
    if (a) crumbs.push(`${a.first} ${a.last}`);
  }
  if (seg === "races" && params?.id) {
    const c = competitions.find((x) => x.id === params.id);
    if (c) crumbs.push(c.short || c.name);
  }

  return (
    <header className="topbar">
      <div className="topbar-breadcrumbs">
        {crumbs.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="chevronRight" size={13} />}
            {i === crumbs.length - 1 ? <b>{b}</b> : <span>{b}</span>}
          </React.Fragment>
        ))}
      </div>

      <button className="topbar-search" onClick={() => setCmdOpen(true)}>
        <Icon name="search" size={14} />
        <span style={{ color: "var(--fg-3)", fontSize: 13 }}>Search athletes, events, documents…</span>
        <span style={{ flex: 1 }} />
        <kbd>⌘K</kbd>
      </button>

      <div className="topbar-actions">
        <PrintMenu />

        <div className="sync-pill" title="Real-time sync active">
          <span>SYNCED</span>
        </div>

        <button className="icon-btn" onClick={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")} title="Toggle theme">
          <Icon name={tweaks.theme === "dark" ? "sun" : "moon"} size={16} />
        </button>

        <button className="icon-btn" title="Help">
          <Icon name="helpCircle" size={16} />
        </button>

        <button className="icon-btn" onClick={() => navigate("notifications")} title="Notifications">
          <Icon name="bell" size={16} />
          {unreadCount > 0 && <span className="icon-btn-dot" />}
        </button>

        <button className="avatar-btn" title="Account">
          <Avatar name="Lena Andersen" color="#5b6ef5" size="sm" dot="online" />
        </button>
      </div>
    </header>
  );
}
