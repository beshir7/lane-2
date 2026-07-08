"use client";

// CMS — Posts list + Editor.

import React, { useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Badge, Drawer, KPI, Tabs, Tag } from "@/components/primitives";
import { useLane } from "@/components/lane-provider";
import type { Post } from "@/lib/types";

export function CMSScreen() {
  const { posts, savePost } = useLane();
  const [active, setActive] = useState<Partial<Post> | null>(null);
  const [filter, setFilter] = useState("all");

  const filtered = posts.filter((p) => filter === "all" || p.status === filter);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Content</h1>
          <p className="page-subtitle">News articles, event posts and media publishing</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary"><Icon name="image" size={14} /> Media library</button>
          <button className="btn btn-primary" onClick={() => setActive({ id: "new", title: "", body: "", status: "draft", category: "News" })}><Icon name="plus" size={14} /> New post</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        <KPI label="Published" value={posts.filter((p) => p.status === "published").length} sparkData={[1, 2, 2, 3, 4, 4, 5]} sparkColor="var(--success)" />
        <KPI label="Drafts" value={posts.filter((p) => p.status === "draft").length} sparkData={[1, 1, 2, 2, 3, 2, 1]} sparkColor="var(--warning)" />
        <KPI label="Scheduled" value={posts.filter((p) => p.status === "scheduled").length} sparkData={[0, 0, 0, 1, 1, 1, 1]} sparkColor="var(--accent)" />
        <KPI label="Total views" value="11.4K" delta="+18% week" deltaDir="up" sparkData={[6, 7, 7, 8, 9, 11, 11.4]} sparkColor="var(--lane-5)" />
      </div>

      <Tabs
        tabs={[
          { value: "all", label: "All", count: posts.length },
          { value: "published", label: "Published", count: posts.filter((p) => p.status === "published").length },
          { value: "draft", label: "Drafts", count: posts.filter((p) => p.status === "draft").length },
          { value: "scheduled", label: "Scheduled", count: posts.filter((p) => p.status === "scheduled").length },
        ]}
        value={filter}
        onChange={setFilter}
      />

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Title</th><th>Category</th><th>Author</th><th>Status</th><th>Views</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} onClick={() => setActive(p)}>
                <td>
                  <div className="fw-600">{p.title}</div>
                  {p.status === "draft" && <div className="text-xs muted">Last edited 2 hours ago</div>}
                </td>
                <td><Tag>{p.category}</Tag></td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <Avatar name={p.author} color={p.color} size="xs" />
                    <span className="text-sm">{p.author}</span>
                  </div>
                </td>
                <td>
                  {p.status === "published" && <Badge variant="success" dot>Published</Badge>}
                  {p.status === "draft" && <Badge variant="warning" dot>Draft</Badge>}
                  {p.status === "scheduled" && <Badge variant="accent" dot>Scheduled</Badge>}
                </td>
                <td className="mono">{p.views.toLocaleString()}</td>
                <td className="text-sm muted mono">{p.date}</td>
                <td><Icon name="chevronRight" size={14} style={{ color: "var(--fg-3)" }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active && (
        <PostEditor
          post={active}
          onClose={() => setActive(null)}
          onSave={(d) => {
            const isNew = active.id === "new";
            savePost(isNew ? d : { ...d, id: active.id }, isNew);
            setActive(null);
          }}
        />
      )}
    </div>
  );
}

function PostEditor({ post, onClose, onSave }: { post: Partial<Post>; onClose: () => void; onSave: (d: Partial<Post>) => void }) {
  const [form, setForm] = useState({
    title: post.title || "",
    body: post.body || "Lane Athletics announced today...\n\nWith the indoor season now in full swing, our athletes have logged personal bests across three different disciplines...\n\nThe team will travel to Oslo for the Diamond League opener on June 4.",
    status: post.status || "draft",
    category: post.category || "News",
  });
  const [showSchedule, setShowSchedule] = useState(false);

  return (
    <Drawer
      open={true}
      onClose={onClose}
      size="lg"
      title={post.id === "new" ? "New post" : "Edit post"}
      footer={
        <>
          <div className="text-xs muted mono row" style={{ marginRight: "auto", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--success)" }} />
            Auto-saved 4s ago
          </div>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-secondary" onClick={() => onSave({ ...form, status: "draft" })}>Save draft</button>
          <button className="btn btn-secondary" onClick={() => setShowSchedule(!showSchedule)}><Icon name="calendar" size={13} /> Schedule</button>
          <button className="btn btn-primary" onClick={() => onSave({ ...form, status: "published" })}><Icon name="send" size={13} /> Publish</button>
        </>
      }
    >
      <div className="col" style={{ gap: 14 }}>
        <input
          className="input"
          placeholder="Title..."
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          style={{ height: "auto", padding: 14, fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", background: "transparent", border: "none" }}
        />
        <div className="row" style={{ gap: 8, padding: "0 14px" }}>
          <select className="input" style={{ width: 120, height: 30 }} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option>News</option>
            <option>Feature</option>
            <option>Inside</option>
            <option>Recap</option>
          </select>
          <button className="btn btn-secondary btn-sm"><Icon name="image" size={13} /> Cover image</button>
          <button className="btn btn-secondary btn-sm"><Icon name="link" size={13} /> Link athletes</button>
        </div>

        <div style={{ padding: 8, background: "var(--bg-2)", borderRadius: "var(--r-md)", border: "1px solid var(--border-1)", display: "flex", gap: 2, flexWrap: "wrap" }}>
          {[
            { i: "Bold", style: { fontWeight: 700 } },
            { i: "Italic", style: { fontStyle: "italic" } },
            { i: "Underline", style: { textDecoration: "underline" } },
          ].map((b) => (
            <button key={b.i} className="btn btn-ghost btn-sm" style={b.style as React.CSSProperties}>{b.i[0]}</button>
          ))}
          <div style={{ width: 1, background: "var(--border-1)", margin: "0 4px" }} />
          <button className="btn btn-ghost btn-sm">H1</button>
          <button className="btn btn-ghost btn-sm">H2</button>
          <button className="btn btn-ghost btn-sm">P</button>
          <button className="btn btn-ghost btn-sm">Quote</button>
          <div style={{ width: 1, background: "var(--border-1)", margin: "0 4px" }} />
          <button className="btn btn-ghost btn-sm"><Icon name="list" size={13} /></button>
          <button className="btn btn-ghost btn-sm"><Icon name="image" size={13} /></button>
          <button className="btn btn-ghost btn-sm"><Icon name="link" size={13} /></button>
          <button className="btn btn-ghost btn-sm"><Icon name="document" size={13} /></button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm muted">/ commands</button>
        </div>

        <textarea
          className="input"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          style={{ minHeight: 280, fontFamily: "var(--font-ui)", fontSize: 14.5, lineHeight: 1.65, border: "none", background: "transparent" }}
        />

        {showSchedule && (
          <div className="card card-pad row" style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
            <Icon name="calendar" size={18} style={{ color: "var(--accent)" }} />
            <div style={{ flex: 1 }}>
              <div className="fw-700">Schedule publish</div>
              <div className="text-sm muted">Pick a date and time. Lane will publish automatically.</div>
            </div>
            <input type="date" className="input" defaultValue="2026-05-28" style={{ width: 150 }} />
            <input type="time" className="input" defaultValue="09:00" style={{ width: 110 }} />
          </div>
        )}
      </div>
    </Drawer>
  );
}
