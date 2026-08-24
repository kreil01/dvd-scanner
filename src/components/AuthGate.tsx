import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import { homeStore } from "../lib/home-store";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
      if (data.session) void homeStore.initialize(data.session.user.id);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) void homeStore.initialize(next.user.id);
      else homeStore.clear();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup" && !result.data.session) setMessage("Konto angelegt. Bitte bestätige die E-Mail und melde dich anschließend an.");
  }

  if (!isSupabaseConfigured) {
    return <div className="auth-page"><div className="auth-card"><h1>Heimwerk</h1><h2>Supabase noch nicht konfiguriert</h2><p>Lege <code>VITE_SUPABASE_URL</code> und <code>VITE_SUPABASE_ANON_KEY</code> als Umgebungsvariablen fest.</p></div></div>;
  }
  if (checking) return <div className="auth-page"><div className="auth-card"><p>Heimwerk wird geladen …</p></div></div>;
  if (!session) return <div className="auth-page"><form className="auth-card" onSubmit={submit}>
    <h1>⌂ Heimwerk</h1><h2>{mode === "login" ? "Anmelden" : "Konto anlegen"}</h2>
    <label>E-Mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
    <label>Passwort<input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
    {message && <p className="auth-message">{message}</p>}
    <button className="button primary" disabled={busy}>{busy ? "Bitte warten …" : mode === "login" ? "Anmelden" : "Registrieren"}</button>
    <button className="button ghost" type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Noch kein Konto? Registrieren" : "Bereits registriert? Anmelden"}</button>
  </form></div>;

  return <>{children}<button className="logout-fab" title="Abmelden" onClick={() => supabase?.auth.signOut()}><LogOut /></button></>;
}
