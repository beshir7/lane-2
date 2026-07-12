"use client";

// Command palette — ⌘K global search across nav, actions, athletes, competitions.

import { useEffect, useState } from "react";
import { Icon } from "./icon";
import { useLane } from "./lane-provider";

interface Item {
  name: string;
  icon: string;
  group: string;
  run: () => void;
  sub?: string;
}

export function CommandPalette() {
  const { cmdOpen, setCmdOpen, athletes, competitions, navigate } = useLane();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  const close = () => setCmdOpen(false);

  const navItems: Item[] = [
    { name: "Dashboard", icon: "dashboard", group: "Navigate", run: () => { navigate("dashboard"); close(); }},
    { name: "Athletes", icon: "athletes", group: "Navigate", run: () => { navigate("athletes"); close(); }},
    { name: "Competitions", icon: "trophy", group: "Navigate", run: () => { navigate("competitions"); close(); }},
    { name: "Calendar", icon: "calendar", group: "Navigate", run: () => { navigate("calendar"); close(); }},
    { name: "Documents", icon: "document", group: "Navigate", run: () => { navigate("documents"); close(); }},
    { name: "Settings", icon: "settings", group: "Navigate", run: () => { navigate("settings"); close(); }},
    { name: "Roles & access", icon: "shield", group: "Navigate", run: () => { navigate("role"); close(); }},
  ];
  const actionItems: Item[] = [
    { name: "Add athlete...", icon: "plus", group: "Actions", run: () => { navigate("athletes"); close(); } },
    { name: "Create competition...", icon: "plus", group: "Actions", run: () => { navigate("competitions"); close(); } },
    { name: "New event...", icon: "calendar", group: "Actions", run: () => { navigate("calendar"); close(); } },
    { name: "Upload document...", icon: "upload", group: "Actions", run: () => { navigate("documents"); close(); } },
    { name: "Invite member...", icon: "users", group: "Actions", run: () => { navigate("settings", "members"); close(); } },
  ];
  const athleteItems: Item[] = athletes.map((a) => ({
    name: `${a.first} ${a.last}`,
    sub: a.specialty,
    icon: "user",
    group: "Athletes",
    run: () => { navigate("athlete-detail", a.id); close(); },
  }));
  const compItems: Item[] = competitions.map((c) => ({
    name: c.name,
    sub: c.date,
    icon: "trophy",
    group: "Competitions",
    run: () => { navigate("competition-detail", c.id); close(); },
  }));

  const all = [...navItems, ...actionItems, ...athleteItems, ...compItems];
  const results = query ? all.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())) : all.slice(0, 12);

  useEffect(() => {
    if (!cmdOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
      if (e.key === "Enter") { const r = results[activeIdx]; if (r) r.run(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmdOpen, activeIdx, results.length]);

  useEffect(() => {
    setActiveIdx(0);
    setQuery("");
  }, [cmdOpen]);

  if (!cmdOpen) return null;

  const grouped: Record<string, (Item & { idx: number })[]> = {};
  results.forEach((r, i) => {
    grouped[r.group] = grouped[r.group] || [];
    grouped[r.group].push({ ...r, idx: i });
  });

  return (
    <div className="cmd-overlay" onClick={close}>
      <div className="cmd-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input">
          <Icon name="search" size={18} />
          <input
            autoFocus
            placeholder="Search athletes, events, documents — or type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="text-xs mono muted">ESC</span>
        </div>
        <div className="cmd-list">
          {results.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>No results for &quot;{query}&quot;</div>
          )}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="cmd-group-label">{group}</div>
              {items.map((r) => (
                <button
                  key={r.idx + r.name}
                  className={`cmd-item ${r.idx === activeIdx ? "is-active" : ""}`}
                  onClick={r.run}
                  onMouseEnter={() => setActiveIdx(r.idx)}
                >
                  <Icon name={r.icon} size={15} className="cmd-item-icon" />
                  <span>{r.name}</span>
                  {r.sub && <span className="cmd-item-sub">{r.sub}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
