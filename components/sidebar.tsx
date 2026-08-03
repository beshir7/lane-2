"use client";

// Sidebar — navigation for Lane 2 AMS.
// Variants: expanded (default), rail (icons only), floating (detached card).

import { LANGS } from "@/lib/i18n";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "./icon";
import { useLane } from "./lane-provider";
import { Avatar, BrandMark } from "./primitives";

function LanguageSwitch() {
  const { lang, setLang, t } = useLane();
  return (
    <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: "var(--r-md)", background: "var(--bg-2)", border: "1px solid var(--border-1)" }}>
      <div className="row" style={{ gap: 6, marginBottom: 6, color: "var(--fg-3)", fontSize: 11 }}>
        <Icon name="globe" size={13} /> <span>{t("sidebar.language")}</span>
      </div>
      <div className="row" style={{ gap: 4 }}>
        {LANGS.map((l) => (
          <button
            key={l.v}
            onClick={() => setLang(l.v)}
            className="btn btn-sm"
            style={{
              flex: 1,
              justifyContent: "center",
              background: lang === l.v ? "var(--accent)" : "transparent",
              color: lang === l.v ? "#fff" : "var(--fg-2)",
              border: "1px solid " + (lang === l.v ? "var(--accent)" : "var(--border-1)"),
            }}
          >
            {l.v.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

// Every destination in the sidebar. Warmed once when the browser is idle so the
// first click on any of them is a cache hit rather than a round-trip.
const NAV_IDS = ["dashboard", "athletes", "competitions", "organizers", "calendar", "documents", "settings", "role"];

function pageFromPath(pathname: string): string {
  if (pathname.startsWith("/athletes")) return "athletes";
  if (pathname.startsWith("/competitions")) return "competitions";
  if (pathname.startsWith("/organizers")) return "organizers";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/documents")) return "documents";
  if (pathname.startsWith("/cms")) return "cms";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/notifications")) return "notifications";
  if (pathname.startsWith("/role")) return "role";
  if (pathname.startsWith("/settings")) return "settings";
  return "dashboard";
}

export function Sidebar() {
  const { athletes, tweaks, setTweak, navigate, prefetch, setCmdOpen, unreadCount, t, currentUser } = useLane();
  const pathname = usePathname();
  const currentPage = pageFromPath(pathname);
  const variant = tweaks.sidebar;
  const collapsed = variant === "rail";
  const toggleCollapsed = () => setTweak("sidebar", collapsed ? "expanded" : "rail");

  useEffect(() => {
    const warm = () => NAV_IDS.forEach((id) => prefetch(id));
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (ric) { ric(warm); return; }
    const id = window.setTimeout(warm, 1200);
    return () => window.clearTimeout(id);
  }, [prefetch]);

  const navGroups = [
    {
      label: t("section.workspace"),
      items: [
        { id: "dashboard", label: t("nav.dashboard"), icon: "dashboard" },
        { id: "athletes", label: t("nav.athletes"), icon: "athletes", badge: athletes?.length },
        { id: "competitions", label: t("nav.competitions"), icon: "trophy" },
        { id: "organizers", label: t("nav.organizers"), icon: "users" },
        { id: "calendar", label: t("nav.calendar"), icon: "calendar" },
        { id: "documents", label: t("nav.documents"), icon: "document" },
      ],
    },
    {
      label: t("section.administration"),
      items: [
        { id: "settings", label: t("nav.settings"), icon: "settings" },
        { id: "role", label: t("nav.roles"), icon: "shield" },
      ],
    },
  ];

  return (
    <aside className="sidebar" data-variant={variant}>
      <div className="sidebar-brand">
        <BrandMark />
        <div className="brand-text">
          Lane<sup>2</sup>
        </div>
        <button
          className="icon-btn sidebar-collapse"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ marginLeft: "auto" }}
        >
          <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={16} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {navGroups.map((g, gi) => (
          <div key={gi} className="nav-section">
            {variant !== "rail" && <div className="sidebar-section-label">{g.label}</div>}
            {g.items.map((item) => (
              <button
                key={item.id}
                className="nav-item"
                aria-current={currentPage === item.id ? "page" : undefined}
                onClick={() => navigate(item.id)}
                onMouseEnter={() => prefetch(item.id)}
                onFocus={() => prefetch(item.id)}
                title={variant === "rail" ? item.label : undefined}
              >
                <span className="nav-item-icon">
                  <Icon name={item.icon} size={17} />
                </span>
                <span className="nav-item-label">{item.label}</span>
                {"badge" in item && item.badge != null && (
                  <span className={`nav-item-badge ${"badgeAccent" in item && item.badgeAccent ? "is-accent" : ""}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}

        {variant !== "rail" && <LanguageSwitch />}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-user" onClick={() => navigate("settings", "profile")} role="button" tabIndex={0} title="Your profile">
          <Avatar name={currentUser?.name || "Account"} color={currentUser?.color || "#5b6ef5"} size="sm" dot="online" />
          <div className="org-text">
            <b>{currentUser?.name || "Account"}</b>
            <span>{currentUser?.title || currentUser?.email || ""}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
