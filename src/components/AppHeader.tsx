"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn, LogOut, Plus, ShieldCheck, UserRound } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import type { UserRole } from "@/lib/types";

const roleLabels: Record<UserRole, string> = {
  public: "Public",
  salesman: "Salesman",
  admin: "Admin"
};

export function AppHeader() {
  const router = useRouter();
  const { user, role, loading, isConfigured, signOut, setPreviewRole } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="app-header">
      <Link href="/" className="brand-lockup" aria-label="AK Enterprises catalog home">
        <span className="brand-logo-frame">
          <img src="/ak-enterprises-logo-transparent.png" alt="AK Enterprises logo" className="brand-logo" />
        </span>
        <span className="brand-copy">
          <strong>AK Enterprises</strong>
          <span>Medical Catalog</span>
        </span>
      </Link>

      <div className="header-actions">
        {!isConfigured ? (
          <label className="preview-role">
            <span>Preview</span>
            <select value={role} onChange={(event) => setPreviewRole(event.target.value as UserRole)}>
              <option value="public">Public</option>
              <option value="salesman">Salesman</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        ) : null}

        <span className={`role-chip role-${role}`}>
          {role === "admin" ? <ShieldCheck size={15} aria-hidden="true" /> : <UserRound size={15} aria-hidden="true" />}
          {loading ? "Checking" : roleLabels[role]}
        </span>

        {role === "admin" ? (
          <Link href="/admin/listings" className="button button-primary">
            <Plus size={17} aria-hidden="true" />
            <span>Add Listing</span>
          </Link>
        ) : null}

        {user || (!isConfigured && role !== "public") ? (
          <button className="button button-logout" type="button" onClick={() => void handleSignOut()} disabled={signingOut}>
            <LogOut size={19} aria-hidden="true" />
            <span>{signingOut ? "Logging out" : "Logout"}</span>
          </button>
        ) : (
          <Link href="/login" className="button button-login" aria-label="Login">
            <LogIn size={19} aria-hidden="true" />
            <span>Login</span>
          </Link>
        )}
      </div>
    </header>
  );
}
