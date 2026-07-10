"use client";

// Shared UI primitives: Avatar, Badge, Modal, Drawer, Toast container, KPI, Sparkline, EmptyState.

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./icon";
import type { BadgeVariant, Toast } from "@/lib/types";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

export function Avatar({
  name,
  initials,
  color,
  size = "md",
  src,
  dot,
  className = "",
  style,
}: {
  name?: string;
  initials?: string;
  color?: string;
  size?: Size;
  src?: string;
  dot?: "online" | "away" | "offline" | string;
  className?: string;
  style?: CSSProperties;
}) {
  const init =
    initials ||
    (name
      ? name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()
      : "?");
  const bg = color || "#39424f";
  return (
    <span className={`avatar avatar-${size} ${className}`} style={{ background: bg, color: "#fff", ...style }}>
      {src ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : init}
      {dot && (
        <span
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 8,
            height: 8,
            borderRadius: 999,
            background: dot === "online" ? "var(--success)" : dot === "away" ? "var(--warning)" : "var(--fg-4)",
            border: "2px solid var(--bg-1)",
          }}
        />
      )}
    </span>
  );
}

export function Badge({
  children,
  variant,
  dot,
  className = "",
  style,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={`badge ${variant ? `is-${variant}` : ""} ${className}`} style={style}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}

export function Tag({
  children,
  onRemove,
  className = "",
  style,
  onClick,
}: {
  children: ReactNode;
  onRemove?: () => void;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  return (
    <span className={`tag ${className}`} style={style} onClick={onClick}>
      {children}
      {onRemove && (
        <button onClick={onRemove} style={{ marginLeft: 2, display: "grid", placeItems: "center", color: "var(--fg-3)" }}>
          <Icon name="close" size={11} />
        </button>
      )}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${size === "lg" ? "modal-lg" : size === "xl" ? "modal-xl" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// A small in-app confirmation dialog (replaces window.confirm). Each choice is a
// button; picking one runs its onClick. The X / backdrop / Escape cancels.
export function ConfirmModal({
  title,
  message,
  choices,
  onCancel,
}: {
  title: ReactNode;
  message: ReactNode;
  choices: { label: string; variant?: "primary" | "secondary" | "ghost"; onClick: () => void }[];
  onCancel: () => void;
}) {
  return (
    <Modal
      open
      onClose={onCancel}
      title={title}
      footer={choices.map((c, i) => (
        <button key={i} className={`btn btn-${c.variant || "secondary"}`} onClick={c.onClick}>
          {c.label}
        </button>
      ))}
    >
      <div className="text-sm" style={{ lineHeight: 1.6 }}>{message}</div>
    </Modal>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  size,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`drawer ${size === "lg" ? "drawer-lg" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// Toasts ----------------------------------------------------------
type ToastFn = (t: Toast) => void;
const ToastCtx = createContext<ToastFn | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback<ToastFn>((toast) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { ...toast, id }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), toast.duration || 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast is-${t.variant || "info"}`}>
            <Icon name={t.variant === "success" ? "success" : "info"} size={16} className="toast-icon" />
            <div style={{ flex: 1 }}>
              <b>{t.title}</b>
              {t.body && <span>{t.body}</span>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = (): ToastFn => useContext(ToastCtx) || (() => {});

// KPI -------------------------------------------------------------
export function KPI({
  label,
  value,
  delta,
  deltaDir = "up",
  sparkData,
  sparkColor = "var(--accent)",
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaDir?: "up" | "down";
  sparkData?: number[];
  sparkColor?: string;
}) {
  return (
    <div className="card kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {delta && (
        <div className={`kpi-delta is-${deltaDir}`}>
          <Icon name={deltaDir === "up" ? "trendingUp" : "trendingDown"} size={12} />
          {delta}
        </div>
      )}
      {sparkData && <Sparkline data={sparkData} color={sparkColor} className="kpi-sparkline" />}
    </div>
  );
}

// Sparkline -------------------------------------------------------
export function Sparkline({
  data,
  color = "var(--accent)",
  className,
  height = 50,
  width = 110,
  filled = true,
}: {
  data: number[];
  color?: string;
  className?: string;
  height?: number;
  width?: number;
  filled?: boolean;
}) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = width;
  const h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - 4 - ((v - min) / range) * (h - 12);
    return [x, y] as [number, number];
  });
  const linePath = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");
  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;
  const gid = `g-${className || "spark"}`;
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {filled && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gid})`} />
        </>
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Empty state -----------------------------------------------------
export function EmptyState({
  icon = "folder",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name={icon} size={26} />
      </div>
      <h4>{title}</h4>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

// Skeleton --------------------------------------------------------
export function Skel({ w = "100%", h = 12, r = 4, style }: { w?: number | string; h?: number; r?: number; style?: CSSProperties }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// Segmented control ----------------------------------------------
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.value} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={13} style={{ marginRight: 4, verticalAlign: -2 }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Tabs ------------------------------------------------------------
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}>
          {t.label}
          {t.count != null && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                padding: "2px 5px",
                background: "var(--bg-3)",
                borderRadius: 999,
                fontFamily: "var(--font-mono)",
                color: "var(--fg-3)",
              }}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// Brand mark — lanes-of-a-track wordmark device -------------------
export function BrandMark() {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        background: "var(--fg-1)",
        color: "var(--bg-0)",
        display: "grid",
        placeItems: "center",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="0" y="0" width="24" height="24" rx="6" fill="var(--fg-1)" />
        <line x1="0" y1="6" x2="24" y2="6" stroke="var(--bg-1)" strokeWidth="1" opacity="0.4" />
        <line x1="0" y1="11" x2="24" y2="11" stroke="var(--bg-1)" strokeWidth="1" opacity="0.4" />
        <line x1="0" y1="16" x2="24" y2="16" stroke="var(--bg-1)" strokeWidth="1" opacity="0.4" />
        <rect x="0" y="6" width="24" height="5" fill="var(--accent)" opacity="0.95" />
        <text
          x="12"
          y="22"
          textAnchor="middle"
          fill="var(--bg-0)"
          style={{ font: "800 9px var(--font-display), system-ui", letterSpacing: "-0.05em" }}
        >
          L²
        </text>
      </svg>
    </div>
  );
}
