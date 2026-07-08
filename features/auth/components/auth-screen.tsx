"use client";

// Authentication screens: Login, Signup, Forgot password, 2FA.

import React, { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { Badge, BrandMark } from "@/components/primitives";

type AuthView = "login" | "signup" | "forgot" | "2fa";

function AuthShell({ children, kicker, title, subtitle }: { children: ReactNode; kicker?: string; title: string; subtitle?: string }) {
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div className="row" style={{ position: "relative", zIndex: 2 }}>
          <BrandMark />
          <div className="brand-text">Lane<sup>2</sup></div>
        </div>

        <div style={{ position: "relative", zIndex: 2, marginTop: "auto", display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 999,
              background: "var(--accent-soft)",
              color: "var(--accent)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              width: "fit-content",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor" }} />
            Athlete management system
          </div>

          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.035em", margin: 0 }}>
            Run a world-class<br />program from<br />one workspace.
          </h1>

          <p style={{ fontSize: 15, color: "var(--fg-2)", lineHeight: 1.55, margin: 0, maxWidth: 380 }}>
            Athletes, competitions, calendars, documents and analytics — synced across your coaching team in real time.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, marginTop: 4, borderTop: "1px solid var(--border-1)", paddingTop: 22 }}>
            <Stat n="200+" l="Athletes" />
            <Stat n="48" l="Federations" />
            <Stat n="99.99%" l="Uptime" />
          </div>
        </div>
      </aside>
      <section className="auth-form-side">
        <div className="auth-form">
          {kicker && <div className="mono text-xs" style={{ color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{kicker}</div>}
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: -4 }}>{title}</h2>
          {subtitle && <p style={{ color: "var(--fg-3)", fontSize: 14, marginTop: -10 }}>{subtitle}</p>}
          {children}
        </div>
      </section>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--fg-1)" }}>{n}</div>
      <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{l}</div>
    </div>
  );
}

function LoginScreen({ onLogin, onSwitch }: { onLogin: () => void; onSwitch: (v: AuthView) => void }) {
  const [email, setEmail] = useState("lena@lane.io");
  const [password, setPassword] = useState("••••••••••");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    if (!password) { setError("Password is required."); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin && onLogin(); }, 700);
  };

  return (
    <AuthShell kicker="Welcome back" title="Sign in to Lane 2" subtitle="Use your work email or single sign-on.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label className="field-label">Email</label>
          <div className="input-group">
            <Icon name="mail" size={15} />
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@team.io" autoComplete="email" />
          </div>
        </div>
        <div className="field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <label className="field-label">Password</label>
            <button type="button" className="text-xs" style={{ color: "var(--accent)", fontWeight: 600 }} onClick={() => onSwitch("forgot")}>Forgot?</button>
          </div>
          <div className="input-group">
            <Icon name="lock" size={15} />
            <input className="input" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" style={{ paddingRight: 38 }} />
            <button type="button" onClick={() => setShow(!show)} style={{ position: "absolute", right: 10, color: "var(--fg-3)", display: "grid", placeItems: "center" }}>
              <Icon name={show ? "eyeOff" : "eye"} size={15} />
            </button>
          </div>
          {error && <span className="field-error"><Icon name="alert" size={12} />{error}</span>}
        </div>

        <label className="checkbox">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember me on this device
        </label>

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
          {!loading && <Icon name="arrowRight" size={15} />}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--fg-4)", fontSize: 11, margin: "4px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border-1)" }} />
          OR
          <div style={{ flex: 1, height: 1, background: "var(--border-1)" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button type="button" className="btn btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Google
          </button>
          <button type="button" className="btn btn-secondary">
            <Icon name="apple" size={14} /> Apple SSO
          </button>
        </div>

        <p style={{ marginTop: 8, fontSize: 13, color: "var(--fg-3)", textAlign: "center" }}>
          No account yet? <button type="button" onClick={() => onSwitch("signup")} style={{ color: "var(--accent)", fontWeight: 600 }}>Create one</button>
        </p>
      </form>
    </AuthShell>
  );
}

function SignupScreen({ onSwitch }: { onSwitch: (v: AuthView) => void }) {
  const [step, setStep] = useState(1);
  return (
    <AuthShell kicker="Get started" title="Create your Lane workspace" subtitle={`Step ${step} of 3 — let's set up your organization.`}>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: s <= step ? "var(--accent)" : "var(--bg-3)", transition: "background 200ms" }} />
        ))}
      </div>
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="field"><label className="field-label">First name</label><input className="input" defaultValue="Lena" /></div>
            <div className="field"><label className="field-label">Last name</label><input className="input" defaultValue="Andersen" /></div>
          </div>
          <div className="field">
            <label className="field-label">Work email</label>
            <div className="input-group">
              <Icon name="mail" size={15} />
              <input className="input" type="email" defaultValue="lena@lane.io" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Password</label>
            <div className="input-group">
              <Icon name="lock" size={15} />
              <input className="input" type="password" defaultValue="••••••••••" />
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= 3 ? "var(--success)" : "var(--bg-3)" }} />
              ))}
            </div>
            <span className="field-hint">Strong — uppercase, lowercase and a number.</span>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => setStep(2)}>Continue<Icon name="arrowRight" size={15} /></button>
        </div>
      )}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label className="field-label">Organization name</label>
            <input className="input" defaultValue="Lane Athletics" />
          </div>
          <div className="field">
            <label className="field-label">Discipline</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {["Track & Field", "Swimming", "Cycling", "Multi-sport"].map((d, i) => (
                <label key={d} className="card" style={{ padding: 12, cursor: "pointer", border: i === 0 ? "1px solid var(--accent)" : "1px solid var(--border-1)", background: i === 0 ? "var(--accent-soft)" : "var(--bg-1)" }}>
                  <input type="radio" name="discipline" defaultChecked={i === 0} style={{ display: "none" }} />
                  <div className="fw-600 text-md">{d}</div>
                </label>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="field-label">Team size</label>
            <select className="input">
              <option>1–10 athletes</option>
              <option>11–50 athletes</option>
              <option>51–200 athletes</option>
              <option>200+ athletes</option>
            </select>
          </div>
          <div className="row">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(3)}>Continue<Icon name="arrowRight" size={15} /></button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card card-pad" style={{ background: "var(--accent-soft)", borderColor: "var(--accent)", display: "flex", gap: 10 }}>
            <Icon name="success" size={20} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <div className="fw-700">Workspace ready</div>
              <div className="text-sm muted">Now let&apos;s verify your email and turn on 2FA.</div>
            </div>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <li className="card card-pad row" style={{ padding: 14 }}>
              <Icon name="mail" size={18} style={{ color: "var(--success)" }} />
              <div style={{ flex: 1 }}>
                <div className="fw-600">Verify email</div>
                <div className="text-sm muted">We sent a link to lena@lane.io</div>
              </div>
              <Badge variant="success" dot>SENT</Badge>
            </li>
            <li className="card card-pad row" style={{ padding: 14 }}>
              <Icon name="fingerprint" size={18} style={{ color: "var(--fg-3)" }} />
              <div style={{ flex: 1 }}>
                <div className="fw-600">Enable 2FA</div>
                <div className="text-sm muted">Recommended — use an authenticator app</div>
              </div>
              <button className="btn btn-secondary btn-sm">Set up</button>
            </li>
            <li className="card card-pad row" style={{ padding: 14 }}>
              <Icon name="users" size={18} style={{ color: "var(--fg-3)" }} />
              <div style={{ flex: 1 }}>
                <div className="fw-600">Invite teammates</div>
                <div className="text-sm muted">Add coaches and managers</div>
              </div>
              <button className="btn btn-secondary btn-sm">Invite</button>
            </li>
          </ul>
          <button className="btn btn-primary btn-lg" onClick={() => onSwitch("login")}>Enter workspace<Icon name="arrowRight" size={15} /></button>
        </div>
      )}
      <p style={{ marginTop: 8, fontSize: 13, color: "var(--fg-3)", textAlign: "center" }}>
        Already a member? <button type="button" onClick={() => onSwitch("login")} style={{ color: "var(--accent)", fontWeight: 600 }}>Sign in</button>
      </p>
    </AuthShell>
  );
}

function ForgotScreen({ onSwitch }: { onSwitch: (v: AuthView) => void }) {
  const [sent, setSent] = useState(false);
  return (
    <AuthShell
      kicker="Reset password"
      title={sent ? "Check your inbox" : "Forgot your password?"}
      subtitle={sent ? "We sent a recovery link to lena@lane.io. It expires in 15 minutes." : "Enter your email — we'll send you a recovery link."}
    >
      {!sent ? (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label className="field-label">Email</label>
            <div className="input-group">
              <Icon name="mail" size={15} />
              <input className="input" type="email" defaultValue="lena@lane.io" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg">Send reset link</button>
          <button type="button" className="btn btn-ghost" onClick={() => onSwitch("login")}>
            <Icon name="chevronLeft" size={14} /> Back to sign in
          </button>
        </form>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card card-pad row" style={{ padding: 16, background: "var(--success-soft)", borderColor: "var(--success)" }}>
            <Icon name="success" size={20} style={{ color: "var(--success)" }} />
            <div>
              <div className="fw-700">Recovery email sent</div>
              <div className="text-sm muted">Check your inbox at lena@lane.io</div>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={() => onSwitch("login")}>Back to sign in</button>
          <p className="text-sm muted" style={{ textAlign: "center" }}>
            Didn&apos;t get it? <button onClick={() => setSent(false)} style={{ color: "var(--accent)", fontWeight: 600 }}>Resend</button>
          </p>
        </div>
      )}
    </AuthShell>
  );
}

function TwoFactorScreen({ onSwitch }: { onSwitch: (v: AuthView) => void }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = d;
    setCode(next);
    if (d && i < 5) inputsRef.current[i + 1]?.focus();
  };
  return (
    <AuthShell kicker="Two-factor" title="Enter your 6-digit code" subtitle="Open your authenticator app — code refreshes every 30 seconds.">
      <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "8px 0" }}>
        {code.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el; }}
            className="input"
            style={{ width: 48, height: 56, textAlign: "center", fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)" }}
            value={d}
            maxLength={1}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !code[i] && i > 0) inputsRef.current[i - 1]?.focus();
            }}
          />
        ))}
      </div>
      <button className="btn btn-primary btn-lg">Verify and continue</button>
      <div className="text-sm muted" style={{ textAlign: "center" }}>
        Lost your device? <button style={{ color: "var(--accent)", fontWeight: 600 }}>Use a recovery code</button>
      </div>
      <button type="button" className="btn btn-ghost" onClick={() => onSwitch("login")}>
        <Icon name="chevronLeft" size={14} /> Back to sign in
      </button>
    </AuthShell>
  );
}

export function AuthRouter({ initialView = "login", onLogin }: { initialView?: AuthView; onLogin: () => void }) {
  const [view, setView] = useState<AuthView>(initialView);
  if (view === "signup") return <SignupScreen onSwitch={setView} />;
  if (view === "forgot") return <ForgotScreen onSwitch={setView} />;
  if (view === "2fa") return <TwoFactorScreen onSwitch={setView} />;
  return <LoginScreen onLogin={onLogin} onSwitch={setView} />;
}
