"use client";

// Notifications Center.

import React, { useState } from "react";
import { Icon } from "@/components/icon";
import { EmptyState, Tabs } from "@/components/primitives";
import { useLane } from "@/components/lane-provider";

export function NotificationsScreen() {
  const { notifications, markAllRead } = useLane();
  const [filter, setFilter] = useState("all");
  const filtered = notifications.filter((n) => (filter === "all" ? true : filter === "unread" ? n.unread : n.category === filter));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{notifications.filter((n) => n.unread).length} unread · all caught up beyond</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={markAllRead}><Icon name="check" size={14} /> Mark all read</button>
          <button className="btn btn-secondary"><Icon name="settings" size={14} /> Preferences</button>
        </div>
      </div>

      <Tabs
        tabs={[
          { value: "all", label: "All", count: notifications.length },
          { value: "unread", label: "Unread", count: notifications.filter((n) => n.unread).length },
          { value: "doc", label: "Documents" },
          { value: "event", label: "Calendar" },
          { value: "result", label: "Results" },
          { value: "team", label: "Team" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="bell" title="No notifications" description="You're all caught up." />
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className="row"
              style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-1)", gap: 14, background: n.unread ? "var(--accent-soft)" : "transparent" }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: n.type === "alert" ? "var(--danger-soft)" : n.type === "warn" ? "var(--warning-soft)" : "var(--accent-soft)",
                  color: n.type === "alert" ? "var(--danger)" : n.type === "warn" ? "var(--warning)" : "var(--accent)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name={n.icon} size={17} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 6 }}>
                  <div className="fw-700">{n.title}</div>
                  {n.unread && <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--accent)" }} />}
                </div>
                <div className="text-sm muted">{n.body}</div>
              </div>
              <div className="text-xs muted mono" style={{ width: 90, textAlign: "right" }}>{n.time}</div>
              <button className="btn btn-secondary btn-sm">View</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
