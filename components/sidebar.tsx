"use client";

// Sidebar — navigation for Lane 2 AMS.
// Variants: expanded (default), rail (icons only), floating (detached card).

import { LANGS } from "@/lib/i18n";
import { usePathname } from "next/navigation";
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

function pageFromPath(pathname: string): string {
  if (pathname.startsWith("/athletes")) return "athletes";
  if (pathname.startsWith("/races")) return "competitions";
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
  const { athletes, tweaks, setTweak, navigate, setCmdOpen, unreadCount, t, currentUser } = useLane();
  const pathname = usePathname();
  const currentPage = pageFromPath(pathname);
  const variant = tweaks.sidebar;
  const collapsed = variant === "rail";
  const toggleCollapsed = () => setTweak("sidebar", collapsed ? "expanded" : "rail");

  const navGroups = [
    {
      label: t("section.workspace"),
      items: [
        { id: "dashboard", label: t("nav.dashboard"), icon: "dashboard" },
        { id: "athletes", label: t("nav.athletes"), icon: "athletes", badge: athletes?.length },
        { id: "competitions", label: t("nav.races"), icon: "trophy" },
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
