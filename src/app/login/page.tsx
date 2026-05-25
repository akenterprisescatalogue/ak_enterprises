"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogIn } from "lucide-react";
import { FormEvent, useState } from "react";

import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isConfigured, setPreviewRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(email, password);
      router.push("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <Link href="/" className="back-link">
          <ArrowLeft size={17} aria-hidden="true" />
          Catalog
        </Link>

        <div className="login-logo-frame">
          <img src="/ak-enterprises-logo-transparent.png" alt="AK Enterprises logo" />
        </div>

        <div className="login-heading">
          <span className="eyebrow">Secure Access</span>
          <h1>Sign in to view offered pricing and manage listings.</h1>
        </div>

        {!isConfigured ? (
          <div className="demo-login-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                setPreviewRole("admin");
                router.push("/");
              }}
            >
              Preview Admin
            </button>
            <button
              type="button"
              className="button button-soft"
              onClick={() => {
                setPreviewRole("salesman");
                router.push("/");
              }}
            >
              Preview Salesman
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="button button-primary" disabled={loading}>
              <LogIn size={17} aria-hidden="true" />
              {loading ? "Signing in" : "Sign In"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
