"use client";

// Authentication screens (Supabase-backed): Login, Signup, Forgot, Reset.
// Email + password only — no SSO.

import React, { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { BrandMark } from "@/components/primitives";
import { createClient } from "@/lib/supabase/client";

type AuthView = "login" | "signup" | "forgot";

export function AuthShell({ children, kicker, title, subtitle }: { children: ReactNode; kicker?: string; title: string; subtitle?: string }) {
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div className="row" style={{ position: "relative", zIndex: 2 }}>
          <BrandMark />
          <div className="brand-text">Lane<sup>2</sup></div>
        </div>
        <div style={{ position: "relative", zIndex: 2, marginTop: "auto", display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", width: "fit-content", fontFamily: "var(--font-mono)" }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor" }} />
            Athlete management system
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.035em", margin: 0 }}>
            Run a world-class<br />program from<br />one workspace.
          </h1>
          <p style={{ fontSize: 15, color: "var(--fg-2)", lineHeight: 1.55, margin: 0, maxWidth: 380 }}>
            Athletes, competitions, calendars, documents and analytics — all in one place.
          </p>
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

function PasswordInput({ value, onChange, placeholder = "••••••••", autoComplete }: { value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-group">
      <Icon name="lock" size={15} />
      <input className="input" type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} style={{ paddingRight: 38 }} />
      <button type="button" onClick={() => setShow(!show)} style={{ position: "absolute", right: 10, color: "var(--fg-3)", display: "grid", placeItems: "center" }}>
        <Icon name={show ? "eyeOff" : "eye"} size={15} />
      </button>
    </div>
  );
}

function ErrorNote({ error }: { error: string }) {
  if (!error) return null;
  return <span className="field-error"><Icon name="alert" size={12} /> {error}</span>;
}

function LoginScreen({ onLogin, onSwitch }: { onLogin: () => void; onSwitch: (v: AuthView) => void }) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    if (!password) { setError("Password is required."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onLogin();
  };

  return (
    <AuthShell kicker="Welcome back" title="Sign in to Lane 2" subtitle="Use your email and password.">
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
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
          <ErrorNote error={error} />
        </div>
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
          {!loading && <Icon name="arrowRight" size={15} />}
        </button>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--fg-3)", textAlign: "center" }}>
          No account yet? <button type="button" onClick={() => onSwitch("signup")} style={{ color: "var(--accent)", fontWeight: 600 }}>Create one</button>
        </p>
      </form>
    </AuthShell>
  );
}

function SignupScreen({ onLogin, onSwitch }: { onLogin: () => void; onSwitch: (v: AuthView) => void }) {
  const supabase = createClient();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!first.trim()) { setError("First name is required."); return; }
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: first.trim(), last_name: last.trim() } },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.session) onLogin();       // email confirmation off → straight in
    else setSent(true);                // confirmation on → verify email first
  };

  if (sent) {
    return (
      <AuthShell kicker="Almost there" title="Confirm your email" subtitle={`We sent a confirmation link to ${email}.`}>
        <div className="card card-pad row" style={{ padding: 16, background: "var(--success-soft)", borderColor: "var(--success)", gap: 10 }}>
          <Icon name="mail" size={20} style={{ color: "var(--success)" }} />
          <div className="text-sm">Click the link in that email, then sign in.</div>
        </div>
        <button className="btn btn-secondary" style={{ marginTop: 14 }} onClick={() => onSwitch("login")}>Back to sign in</button>
      </AuthShell>
    );
  }

  return (
    <AuthShell kicker="Get started" title="Create your account" subtitle="Just your name, email and a password.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field"><label className="field-label">First name</label><input className="input" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" /></div>
          <div className="field"><label className="field-label">Last name <span className="text-xs muted" style={{ fontWeight: 400 }}>· optional</span></label><input className="input" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" /></div>
        </div>
        <div className="field">
          <label className="field-label">Email</label>
          <div className="input-group">
            <Icon name="mail" size={15} />
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@team.io" autoComplete="email" />
          </div>
        </div>
        <div className="field"><label className="field-label">Password</label><PasswordInput value={password} onChange={setPassword} autoComplete="new-password" /></div>
        <div className="field">
          <label className="field-label">Confirm password</label>
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
          <ErrorNote error={error} />
        </div>
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
          {!loading && <Icon name="arrowRight" size={15} />}
        </button>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--fg-3)", textAlign: "center" }}>
          Already a member? <button type="button" onClick={() => onSwitch("login")} style={{ color: "var(--accent)", fontWeight: 600 }}>Sign in</button>
        </p>
      </form>
    </AuthShell>
  );
}

function ForgotScreen({ onSwitch }: { onSwitch: (v: AuthView) => void }) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  };

  return (
    <AuthShell
      kicker="Reset password"
      title={sent ? "Check your inbox" : "Forgot your password?"}
      subtitle={sent ? `We sent a recovery link to ${email}. Open it to set a new password.` : "Enter your email — we'll send you a recovery link."}
    >
      {!sent ? (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label className="field-label">Email</label>
            <div className="input-group">
              <Icon name="mail" size={15} />
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@team.io" autoComplete="email" />
            </div>
            <ErrorNote error={error} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</button>
          <button type="button" className="btn btn-ghost" onClick={() => onSwitch("login")}><Icon name="chevronLeft" size={14} /> Back to sign in</button>
        </form>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card card-pad row" style={{ padding: 16, background: "var(--success-soft)", borderColor: "var(--success)", gap: 10 }}>
            <Icon name="success" size={20} style={{ color: "var(--success)" }} />
            <div className="text-sm">Recovery email sent. The link opens a page to choose a new password.</div>
          </div>
          <button className="btn btn-secondary" onClick={() => onSwitch("login")}>Back to sign in</button>
        </div>
      )}
    </AuthShell>
  );
}

// Turn a Supabase recovery-link error code into a friendly explanation.
function prettyLinkError(code?: string | null, desc?: string | null): string {
  if (code === "otp_expired") return "This reset link has expired or was already used. Request a fresh one below.";
  if (code === "access_denied") return "This reset link is no longer valid. Request a fresh one below.";
  return (desc && decodeURIComponent(desc.replace(/\+/g, " "))) || "This reset link is invalid or has expired. Request a fresh one below.";
}

// Reached from the password-recovery email link (/reset). Supabase attaches a
// recovery session (via ?code= or a URL hash), then the user picks a new
// password. If the link is invalid/expired/consumed, we say so clearly and let
// the user request a new link inline instead of showing a form that can't work.
export function ResetScreen() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  // Gate the form on a real recovery session.
  const [phase, setPhase] = useState<"checking" | "ready" | "invalid">("checking");
  const [linkError, setLinkError] = useState("");
  // Inline resend so a dead link isn't a dead end.
  const [resendEmail, setResendEmail] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    let active = true;
    let settled = false;
    const ready = () => { if (active && !settled) { settled = true; setPhase("ready"); } };
    const invalid = (code?: string | null, desc?: string | null) => {
      if (active && !settled) { settled = true; setLinkError(prettyLinkError(code, desc)); setPhase("invalid"); }
    };

    // A recovery session can arrive asynchronously as the client parses the URL.
    const { data: sub } = supabase.auth.onAuthStateChange((event: string, session: unknown) => {
      if (event === "PASSWORD_RECOVERY" || session) ready();
    });

    const qs = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errCode = qs.get("error_code") || hash.get("error_code");
    const errDesc = qs.get("error_description") || hash.get("error_description");
    const code = qs.get("code");

    (async () => {
      if (errCode) { invalid(errCode, errDesc); return; }
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) invalid("otp_expired", error.message); else ready();
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) ready();
    })();

    // Fallback: if no session or error resolved the link, treat it as invalid.
    const timer = setTimeout(() => invalid("otp_expired"), 2500);
    return () => { active = false; clearTimeout(timer); sub.subscription.unsubscribe(); };
  }, [supabase]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setLoading(false); setError(error.message); return; }
    await supabase.auth.signOut();
    setDone(true);
    setLoading(false);
    setTimeout(() => router.push("/signin"), 1200);
  };

  const resend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.includes("@")) return;
    setResendBusy(true);
    await supabase.auth.resetPasswordForEmail(resendEmail, { redirectTo: `${window.location.origin}/reset` });
    setResendBusy(false);
    setResent(true);
  };

  if (done) {
    return (
      <AuthShell kicker="Reset password" title="Password updated" subtitle="Redirecting you to sign in…">
        <div className="card card-pad row" style={{ padding: 16, background: "var(--success-soft)", borderColor: "var(--success)", gap: 10 }}>
          <Icon name="success" size={20} style={{ color: "var(--success)" }} />
          <div className="text-sm">You can now sign in with your new password.</div>
        </div>
      </AuthShell>
    );
  }

  if (phase === "checking") {
    return (
      <AuthShell kicker="Reset password" title="Verifying your link" subtitle="One moment…">
        <div className="text-sm muted">Checking your recovery link…</div>
      </AuthShell>
    );
  }

  if (phase === "invalid") {
    return (
      <AuthShell kicker="Reset password" title="Link expired or invalid" subtitle="Password reset links can only be used once and expire quickly.">
        {resent ? (
          <div className="card card-pad row" style={{ padding: 16, background: "var(--success-soft)", borderColor: "var(--success)", gap: 10 }}>
            <Icon name="success" size={20} style={{ color: "var(--success)" }} />
            <div className="text-sm">New link sent to {resendEmail}. Open it right away — and avoid link previews / scanners that can use it up.</div>
          </div>
        ) : (
          <form onSubmit={resend} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card card-pad row" style={{ padding: 14, background: "var(--danger-soft)", borderColor: "var(--danger)", gap: 10 }}>
              <Icon name="alert" size={18} style={{ color: "var(--danger)", flexShrink: 0 }} />
              <div className="text-sm">{linkError}</div>
            </div>
            <div className="field">
              <label className="field-label">Email</label>
              <div className="input-group">
                <Icon name="mail" size={15} />
                <input className="input" type="email" value={resendEmail} onChange={(e) => setResendEmail(e.target.value)} placeholder="you@team.io" autoComplete="email" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={resendBusy || !resendEmail.includes("@")}>{resendBusy ? "Sending…" : "Send a new reset link"}</button>
            <button type="button" className="btn btn-ghost" onClick={() => router.push("/signin")}><Icon name="chevronLeft" size={14} /> Back to sign in</button>
          </form>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell kicker="Reset password" title="Choose a new password" subtitle="Enter and confirm your new password below.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field"><label className="field-label">New password</label><PasswordInput value={password} onChange={setPassword} autoComplete="new-password" /></div>
        <div className="field">
          <label className="field-label">Confirm new password</label>
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
          <ErrorNote error={error} />
        </div>
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>{loading ? "Updating…" : "Update password"}</button>
      </form>
    </AuthShell>
  );
}

export function AuthRouter({ initialView = "login", onLogin }: { initialView?: AuthView; onLogin: () => void }) {
  const [view, setView] = useState<AuthView>(initialView);
  if (view === "signup") return <SignupScreen onLogin={onLogin} onSwitch={setView} />;
  if (view === "forgot") return <ForgotScreen onSwitch={setView} />;
  return <LoginScreen onLogin={onLogin} onSwitch={setView} />;
}
