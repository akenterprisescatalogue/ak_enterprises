"use client";

import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

import { AdminListingManager } from "@/components/AdminListingManager";
import { AdminSalesmanManager } from "@/components/AdminSalesmanManager";
import { AppHeader } from "@/components/AppHeader";
import { LoadingPanel } from "@/components/StatusPanels";
import { useAuth } from "@/components/AuthProvider";

export default function AdminListingsPage() {
  const { role, loading } = useAuth();

  if (loading && role === "public") return <LoadingPanel label="Checking access" />;

  return (
    <main className="app-shell">
      <AppHeader />

      <div className="admin-topbar">
        <Link href="/" className="back-link">
          <ArrowLeft size={17} aria-hidden="true" />
          Catalog
        </Link>
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Listing Management</h1>
        </div>
      </div>

      {role === "admin" ? (
        <>
          <AdminSalesmanManager />
          <AdminListingManager />
        </>
      ) : (
        <section className="access-panel">
          <ShieldAlert size={30} aria-hidden="true" />
          <h2>Admin access required</h2>
          <Link href="/login" className="button button-primary">
            Sign In
          </Link>
        </section>
      )}
    </main>
  );
}
