"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { KeyRound, RefreshCw, UserPlus, UsersRound } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

type SalesmanProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "salesman" | "admin";
  created_at: string;
};

async function runWithTimeout<T>(task: () => Promise<T>, message: string, timeoutMs = 12000) {
  let timeoutId: number | undefined;

  try {
    return await Promise.race([
      task(),
      new Promise<never>((_resolve, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

export function AdminSalesmanManager() {
  const { accessToken } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profiles, setProfiles] = useState<SalesmanProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    setError(null);

    if (!supabase) {
      setProfiles([]);
      return;
    }

    setLoadingProfiles(true);
    try {
      if (!accessToken) {
        setProfiles([]);
        setError("Sign in as admin to load salesman accounts.");
        return;
      }

      const response = await runWithTimeout(
        () =>
          fetch("/api/admin/salesmen", {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }),
        "Salesman users request timed out.",
        12000
      );
      const payload = (await response.json()) as { profiles?: SalesmanProfile[]; error?: string };

      if (!response.ok) {
        setProfiles([]);
        setError(payload.error ?? "Unable to load salesman accounts.");
        return;
      }

      setProfiles(payload.profiles ?? []);
    } catch (cause) {
      setProfiles([]);
      setError(cause instanceof Error ? cause.message : "Unable to load salesman accounts.");
    } finally {
      setLoadingProfiles(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  async function handleCreateSalesman(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("Connect Supabase and add SUPABASE_SERVICE_ROLE_KEY before creating salesman accounts.");
      return;
    }

    if (!accessToken) {
      setError("Sign in as admin before creating salesman accounts.");
      return;
    }

    setSaving(true);
    try {
      const response = await runWithTimeout(
        () =>
          fetch("/api/admin/salesmen", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              full_name: fullName,
              email,
              password
            })
          }),
        "Create salesman request timed out.",
        12000
      );

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Unable to create salesman account.");
        return;
      }

      setMessage("Salesman account created.");
      setFullName("");
      setEmail("");
      setPassword("");
      await loadProfiles();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create salesman account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-panel salesman-panel">
      <div className="admin-panel-heading">
        <span className="eyebrow">Access Control</span>
        <h2>Create Salesman Accounts</h2>
      </div>

      <form className="salesman-form" onSubmit={handleCreateSalesman}>
        <label>
          <span>Full Name</span>
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Salesman name" />
        </label>
        <label>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="salesman@example.com"
            required
          />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            placeholder="Minimum 6 characters"
            required
          />
        </label>
        <button type="submit" className="button button-primary" disabled={saving}>
          <UserPlus size={17} aria-hidden="true" />
          {saving ? "Creating" : "Create Salesman"}
        </button>
      </form>

      {!supabase ? (
        <div className="admin-banner">
          Account creation will activate after Supabase URL, anon key, and service role key are added.
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <div className="salesman-list-heading">
        <span>
          <UsersRound size={17} aria-hidden="true" />
          Salesman Users
        </span>
        <button type="button" className="icon-button" onClick={() => void loadProfiles()} aria-label="Refresh salesmen">
          <RefreshCw size={17} aria-hidden="true" className={loadingProfiles ? "spin" : undefined} />
        </button>
      </div>

      <div className="salesman-list">
        {profiles.map((profile) => (
          <div key={profile.id} className="salesman-row">
            <span className="salesman-avatar">
              <KeyRound size={17} aria-hidden="true" />
            </span>
            <div>
              <strong>{profile.full_name || "Salesman"}</strong>
              <span>{profile.email}</span>
            </div>
            <em>Salesman</em>
          </div>
        ))}

        {profiles.length === 0 ? (
          <div className="empty-inline">No salesman accounts found yet.</div>
        ) : null}
      </div>
    </section>
  );
}
