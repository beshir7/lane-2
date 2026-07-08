"use client";

// Documents — Library with categories, upload (drag-drop), preview modal, search.

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Badge, Modal, Segmented } from "@/components/primitives";
import { InfoRow } from "@/components/shared";
import { DOC_CATEGORIES } from "@/lib/reference";
import { useLane } from "@/components/lane-provider";
import type { Athlete, LaneDocument } from "@/lib/types";

export function DocumentsScreen() {
  const { documents: docs, athletes, addDocuments } = useLane();
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [preview, setPreview] = useState<LaneDocument | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const filtered = docs.filter((d) => {
    if (category !== "all" && d.category !== category) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleUpload = (files: { name: string }[]) => {
    addDocuments(files);
    setShowUpload(false);
  };

  const catCounts = DOC_CATEGORIES.reduce<Record<string, number>>((acc, c) => {
    acc[c.id] = c.id === "all" ? docs.length : docs.filter((d) => d.category === c.id).length;
    return acc;
  }, {});

  const totalSize = docs.reduce((s, d) => s + parseFloat(d.size), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">{docs.length} files · {totalSize.toFixed(1)} MB used · 2 require attention</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary"><Icon name="folder" size={14} /> New folder</button>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}><Icon name="upload" size={14} /> Upload</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12 }}>
        <div className="card" style={{ padding: 8, height: "fit-content", display: "flex", flexDirection: "column", gap: 1 }}>
          {DOC_CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)} className="nav-item" aria-current={category === c.id ? "page" : undefined}>
              <span className="nav-item-icon"><Icon name={c.icon} size={15} /></span>
              <span className="nav-item-label">{c.label}</span>
              <span className="nav-item-badge">{catCounts[c.id]}</span>
            </button>
          ))}
          <div className="divider" style={{ margin: "8px 0" }} />
          <div className="card card-pad" style={{ background: "var(--bg-2)", padding: 12, border: "none" }}>
            <div className="text-xs muted mono fw-700" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Storage</div>
            <div className="display fw-700" style={{ fontSize: 22, marginTop: 4, letterSpacing: "-0.02em" }}>{totalSize.toFixed(1)} <span className="text-sm" style={{ color: "var(--fg-3)", fontWeight: 500 }}>/ 5 GB</span></div>
            <div className="progress" style={{ marginTop: 8 }}><div style={{ width: (totalSize / 5120) * 100 + "%" }} /></div>
            <div className="text-xs muted" style={{ marginTop: 6 }}>You&apos;re using 0.9% of plan</div>
          </div>
        </div>

        <div className="col" style={{ gap: 12 }}>
          <div className="card" style={{ padding: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <div className="input-group" style={{ flex: 1 }}>
              <Icon name="search" size={14} />
              <input className="input" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-secondary btn-sm"><Icon name="filter" size={13} /> Filter</button>
            <button className="btn btn-secondary btn-sm"><Icon name="sort" size={13} /> Date</button>
            <Segmented options={[{ value: "grid", icon: "grid", label: "Grid" }, { value: "list", icon: "list", label: "List" }]} value={view} onChange={setView} />
          </div>

          {filtered.length === 0 ? (
            <UploadDropzone onUpload={handleUpload} empty />
          ) : (
            <>
              {view === "grid" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                  {filtered.map((d) => <DocGridCard key={d.id} doc={d} athletes={athletes} onOpen={() => setPreview(d)} />)}
                </div>
              ) : (
                <div className="card">
                  <table className="table">
                    <thead>
                      <tr><th>Name</th><th>Athlete</th><th>Category</th><th>Size</th><th>Uploaded</th><th>Expires</th><th></th></tr>
                    </thead>
                    <tbody>
                      {filtered.map((d) => {
                        const athlete = athletes.find((a) => a.id === d.athleteId);
                        return (
                          <tr key={d.id} onClick={() => setPreview(d)}>
                            <td>
                              <div className="row" style={{ gap: 10 }}>
                                <DocIcon doc={d} small />
                                <div>
                                  <div className="fw-600">{d.name}</div>
                                  <div className="text-xs muted">{d.type.toUpperCase()}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              {athlete ? (
                                <div className="row" style={{ gap: 8 }}>
                                  <Avatar name={athlete.first + " " + athlete.last} color={athlete.color} size="xs" />
                                  <span className="text-sm">{athlete.first} {athlete.last}</span>
                                </div>
                              ) : (
                                <span className="muted text-sm">Team-wide</span>
                              )}
                            </td>
                            <td><Badge>{d.category}</Badge></td>
                            <td className="text-sm mono">{d.size}</td>
                            <td className="text-sm muted mono">{d.uploaded}</td>
                            <td>{d.expires ? <ExpiryBadge expires={d.expires} /> : <span className="muted text-sm">—</span>}</td>
                            <td onClick={(e) => e.stopPropagation()}><button className="icon-btn"><Icon name="moreV" size={14} /></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <UploadDropzone onUpload={handleUpload} />
            </>
          )}
        </div>
      </div>

      {preview && <DocumentPreviewModal doc={preview} athletes={athletes} onClose={() => setPreview(null)} />}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUpload={handleUpload} />}
    </div>
  );
}

function DocIcon({ doc, small }: { doc: LaneDocument; small?: boolean }) {
  const size = small ? 36 : 64;
  const colors: Record<string, { bg: string; fg: string }> = {
    pdf: { bg: "rgba(245, 91, 110, 0.12)", fg: "#f55b6e" },
    image: { bg: "rgba(34, 211, 160, 0.12)", fg: "#22d3a0" },
    doc: { bg: "rgba(107, 125, 255, 0.12)", fg: "#6b7dff" },
  };
  const c = colors[doc.type] || colors.doc;
  return (
    <div style={{ width: size, height: small ? 44 : 80, borderRadius: small ? 5 : 8, background: c.bg, color: c.fg, display: "grid", placeItems: "center", border: "1px solid " + c.fg + "33", position: "relative" }}>
      <Icon name={doc.icon} size={small ? 18 : 28} />
      {!small && <span className="mono text-xs fw-700" style={{ position: "absolute", bottom: 6, color: c.fg, textTransform: "uppercase", letterSpacing: "0.04em" }}>{doc.type}</span>}
    </div>
  );
}

function DocGridCard({ doc, athletes, onOpen }: { doc: LaneDocument; athletes: Athlete[]; onOpen: () => void }) {
  const athlete = athletes.find((a) => a.id === doc.athleteId);
  return (
    <button className="card" onClick={onOpen} style={{ padding: 14, textAlign: "left", display: "flex", flexDirection: "column", gap: 10, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
        <DocIcon doc={doc} />
      </div>
      <div>
        <div className="fw-600 text-sm" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={doc.name}>{doc.name}</div>
        <div className="text-xs muted">{doc.size} · {doc.uploaded}</div>
      </div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        {athlete ? <Avatar name={athlete.first + " " + athlete.last} color={athlete.color} size="xs" /> : <span className="text-xs muted">Team-wide</span>}
        {doc.expires && <ExpiryBadge expires={doc.expires} />}
      </div>
    </button>
  );
}

function ExpiryBadge({ expires }: { expires: string }) {
  const days = Math.round((+new Date(expires) - +new Date("2026-05-21")) / 86400000);
  if (days < 0) return <Badge variant="danger">Expired</Badge>;
  if (days < 60) return <Badge variant="warning">{days}d left</Badge>;
  return <Badge variant="success" dot>Valid</Badge>;
}

function UploadDropzone({ onUpload, empty }: { onUpload: (files: { name: string }[]) => void; empty?: boolean }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onUpload(files);
      }}
      className="card"
      style={{
        padding: empty ? 48 : 22,
        borderStyle: "dashed",
        background: over ? "var(--accent-soft)" : "var(--bg-1)",
        borderColor: over ? "var(--accent)" : "var(--border-1)",
        textAlign: "center",
        transition: "all 150ms",
        cursor: "pointer",
      }}
    >
      <Icon name="upload" size={empty ? 28 : 18} style={{ color: over ? "var(--accent)" : "var(--fg-3)" }} />
      <div style={{ marginTop: 8 }}>
        <span className="fw-600" style={{ fontSize: empty ? 16 : 13 }}>
          {empty ? "Drop files to upload" : "Drop more files here, or "}
          {!empty && <span style={{ color: "var(--accent)" }}>browse</span>}
        </span>
      </div>
      {empty && <div className="text-sm muted" style={{ marginTop: 4 }}>or click to browse — PDF, JPG, PNG up to 25 MB each</div>}
    </div>
  );
}

export function UploadModal({ onClose, onUpload }: { onClose: () => void; onUpload: (files: { name: string }[]) => void }) {
  const [files, setFiles] = useState([
    { name: "Passport — Reyes 2026.pdf", size: "1.8 MB", progress: 100, done: true },
    { name: "Visa Application — Mensah.pdf", size: "3.2 MB", progress: 68, done: false },
    { name: "Headshot — Whitaker.jpg", size: "2.4 MB", progress: 22, done: false },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFiles((fs) => fs.map((f) => (f.done ? f : { ...f, progress: Math.min(100, f.progress + 8), done: f.progress >= 92 })));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const allDone = files.every((f) => f.done);

  return (
    <Modal
      open={true}
      onClose={onClose}
      size="lg"
      title="Upload documents"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!allDone} onClick={() => onUpload(files.map((f) => ({ name: f.name })))}>
            {allDone ? "Finish" : `Uploading ${files.filter((f) => !f.done).length}…`}
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 14 }}>
        <UploadDropzone onUpload={(f) => setFiles((fs) => [...fs, ...f.map((x) => ({ name: x.name, size: "1 MB", progress: 0, done: false }))])} />

        <div>
          <div className="text-xs muted mono fw-700" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Queue · {files.length} files</div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {files.map((f, i) => (
              <div key={i} className="card card-pad row" style={{ padding: 12, gap: 12 }}>
                <Icon name={f.name.endsWith(".pdf") ? "filePdf" : "fileImage"} size={20} style={{ color: f.name.endsWith(".pdf") ? "var(--danger)" : "var(--success)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div className="fw-600 text-sm" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                    <div className="text-xs muted mono">{f.size}</div>
                  </div>
                  <div className="row" style={{ gap: 10, marginTop: 4 }}>
                    <div className="progress" style={{ flex: 1 }}><div style={{ width: f.progress + "%", background: f.done ? "var(--success)" : "var(--accent)" }} /></div>
                    {f.done ? <Icon name="success" size={14} style={{ color: "var(--success)" }} /> : <span className="text-xs muted mono">{f.progress}%</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad" style={{ padding: 12, background: "var(--bg-2)" }}>
          <div className="row" style={{ alignItems: "flex-start" }}>
            <Icon name="info" size={16} style={{ color: "var(--info)" }} />
            <div className="text-sm">
              <b>Files are encrypted at rest.</b> <span className="muted">Sensitive documents (passports, medical) require an extra access permission.</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DocumentPreviewModal({ doc, athletes, onClose }: { doc: LaneDocument; athletes: Athlete[]; onClose: () => void }) {
  const athlete = athletes.find((a) => a.id === doc.athleteId);
  return (
    <Modal
      open={true}
      onClose={onClose}
      size="xl"
      title={doc.name}
      footer={
        <>
          <button className="btn btn-secondary"><Icon name="external" size={13} /> Open</button>
          <button className="btn btn-secondary"><Icon name="share" size={13} /> Share</button>
          <button className="btn btn-secondary"><Icon name="download" size={13} /> Download</button>
          <button className="btn btn-primary">Replace file</button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, height: 460 }}>
        <div className="card" style={{ background: "var(--bg-2)", display: "grid", placeItems: "center", overflow: "hidden", position: "relative" }}>
          {doc.type === "image" ? (
            <div style={{ width: "80%", height: "80%", borderRadius: 8, background: "repeating-linear-gradient(45deg, #2a3245 0 8px, #232a3c 8px 16px)", display: "grid", placeItems: "center", color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
              [ image preview ]
            </div>
          ) : (
            <div style={{ width: 240, height: 320, background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: 8, padding: 20, display: "flex", flexDirection: "column", gap: 10, boxShadow: "var(--shadow-2)" }}>
              <div className="display fw-700" style={{ fontSize: 14, color: "var(--fg-1)" }}>{doc.name.replace(/\.[^.]+$/, "")}</div>
              <div style={{ height: 6 }} />
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} style={{ height: 6, background: "var(--bg-3)", borderRadius: 2, width: i % 3 === 0 ? "60%" : "100%" }} />
              ))}
            </div>
          )}
          <div className="row" style={{ position: "absolute", bottom: 12, padding: "4px 12px", background: "var(--bg-1)", borderRadius: 999, border: "1px solid var(--border-1)", gap: 4 }}>
            <button className="icon-btn btn-sm"><Icon name="chevronLeft" size={13} /></button>
            <span className="text-xs mono">Page 1 of 4</span>
            <button className="icon-btn btn-sm"><Icon name="chevronRight" size={13} /></button>
          </div>
        </div>
        <div className="col" style={{ gap: 14 }}>
          <div>
            <div className="text-xs mono fw-700 muted" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Details</div>
            <div className="col" style={{ marginTop: 8, gap: 10 }}>
              <InfoRow icon="folder" label="Category" value={<Badge>{doc.category}</Badge>} />
              <InfoRow icon="hash" label="Size" value={<span className="mono">{doc.size}</span>} />
              <InfoRow icon="calendar" label="Uploaded" value={doc.uploaded} />
              {doc.expires && <InfoRow icon="clock" label="Expires" value={<ExpiryBadge expires={doc.expires} />} />}
              {athlete && <InfoRow icon="user" label="Athlete" value={<><Avatar name={athlete.first + " " + athlete.last} color={athlete.color} size="xs" /> {athlete.first} {athlete.last}</>} />}
            </div>
          </div>

          <div className="divider" />
          <div>
            <div className="text-xs mono fw-700 muted" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Versions</div>
            <div className="col" style={{ marginTop: 8, gap: 6 }}>
              <div className="row">
                <Badge variant="success" dot>Current</Badge>
                <span className="text-sm fw-600">v3</span>
                <span className="spacer" />
                <span className="text-xs muted mono">{doc.uploaded}</span>
              </div>
              <div className="row">
                <span className="text-sm muted">v2</span>
                <span className="spacer" />
                <span className="text-xs muted mono">2024-09-22</span>
              </div>
              <div className="row">
                <span className="text-sm muted">v1</span>
                <span className="spacer" />
                <span className="text-xs muted mono">2023-06-05</span>
              </div>
            </div>
          </div>

          <div className="divider" />
          <div>
            <div className="text-xs mono fw-700 muted" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Access</div>
            <div className="row" style={{ marginTop: 8 }}>
              <Icon name="lock" size={14} style={{ color: "var(--fg-3)" }} />
              <span className="text-sm">Restricted — Admin, Coach</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
