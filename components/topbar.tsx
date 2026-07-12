"use client";

// Topbar — breadcrumbs, search, sync indicator, live notifications, profile.

import React, { useEffect, useRef, useState } from "react";
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
  const { athletes, competitions, notifications, unreadCount, markAllRead, tweaks, setTweak, setCmdOpen, navigate, t, currentUser } = useLane();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close the notifications panel on outside click / Escape.
  useEffect(() => {
    if (!notifOpen) return;
    const onDown = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setNotifOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [notifOpen]);

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

  const dotColor = (type: string) => (type === "alert" ? "var(--danger)" : type === "warn" ? "var(--warning)" : "var(--accent)");

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
        <span style={{ color: "var(--fg-3)", fontSize: 13 }}>{t("topbar.searchPlaceholder")}</span>
        <span style={{ flex: 1 }} />
        <kbd>⌘K</kbd>
      </button>

      <div className="topbar-actions">
        <PrintMenu />

        <div className="sync-pill" title="Real-time sync active">
          <span>{t("topbar.synced")}</span>
        </div>

        <button className="icon-btn" onClick={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")} title={t("topbar.toggleTheme")}>
          <Icon name={tweaks.theme === "dark" ? "sun" : "moon"} size={16} />
        </button>

        <div ref={notifRef} style={{ position: "relative" }}>
          <button className="icon-btn" onClick={() => setNotifOpen((o) => !o)} title={t("topbar.notifications")} aria-expanded={notifOpen}>
            <Icon name="bell" size={16} />
            {unreadCount > 0 && <span className="icon-btn-dot" />}
          </button>
          {notifOpen && (
            <div
              className="card"
              style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340, maxHeight: 460, display: "flex", flexDirection: "column", boxShadow: "var(--shadow-3)", zIndex: 50, overflow: "hidden" }}
            >
              <div className="card-header" style={{ padding: "12px 14px" }}>
                <div className="card-title">{t("notif.title")}{unreadCount > 0 ? ` · ${unreadCount}` : ""}</div>
                {unreadCount > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={markAllRead}>{t("notif.markAll")}</button>
                )}
              </div>
              <div style={{ overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div className="text-sm muted" style={{ padding: 18, textAlign: "center" }}>{t("notif.empty")}</div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      className="row"
                      style={{ width: "100%", padding: "11px 14px", gap: 11, textAlign: "left", borderTop: "1px solid var(--border-1)", background: n.unread ? "var(--accent-soft)" : "transparent" }}
                      onClick={() => { if (n.page) navigate(n.page, n.arg); setNotifOpen(false); }}
                    >
                      <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-2)", color: dotColor(n.type), display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <Icon name={n.icon} size={15} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="fw-600 text-sm" style={{ color: "var(--fg-1)" }}>{n.title}</div>
                        <div className="text-xs muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</div>
                      </div>
                      {n.unread && <span style={{ width: 7, height: 7, borderRadius: 999, background: dotColor(n.type), flexShrink: 0 }} />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button className="avatar-btn" onClick={() => navigate("settings", "profile")} title={t("topbar.yourProfile")}>
          <Avatar name={currentUser?.name || "Account"} color={currentUser?.color || "#5b6ef5"} size="sm" dot="online" />
        </button>
      </div>
    </header>
  );
}
