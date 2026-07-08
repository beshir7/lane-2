"use client";

// App chrome — auth gating + loading gate + sidebar/topbar shell + command
// palette + tweaks. Lives in the root layout, so every page renders inside it.

import React, { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";
import { TweaksPanel } from "./tweaks-panel";
import { AuthRouter } from "@/features/auth/components/auth-screen";
import { useLane } from "./lane-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { authenticated, setAuthenticated, tweaks, setCmdOpen, loading } = useLane();

  // Global ⌘K / Ctrl+K to open the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCmdOpen]);

  if (!authenticated) {
    return <AuthRouter onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <div className="app-shell" data-sidebar={tweaks.sidebar}>
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <div className="app-content">{loading ? <ShellLoader /> : children}</div>
      </div>
      <CommandPalette />
      <TweaksPanel />
    </div>
  );
}

function ShellLoader() {
  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--fg-3)" }}>
      <div className="row" style={{ gap: 10 }}>
        <span className="skeleton" style={{ width: 18, height: 18, borderRadius: 999 }} />
        <span className="text-sm">Loading workspace…</span>
      </div>
    </div>
  );
}
