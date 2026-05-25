"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/components/AuthProvider";
import { ErrorPanel, LoadingPanel } from "@/components/StatusPanels";
import { ProductSections } from "@/components/ProductSections";
import { SidebarNav } from "@/components/SidebarNav";
import { useCatalogData } from "@/hooks/useCatalogData";
import type { FilterSelection } from "@/lib/types";
import { filterProducts, getSelectionTitle } from "@/lib/utils";

export default function HomePage() {
  const { accessToken } = useAuth();
  const { data, loading, error } = useCatalogData(accessToken);
  const [selected, setSelected] = useState<FilterSelection>({ type: "all" });

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    return filterProducts(data.products, selected);
  }, [data, selected]);

  return (
    <main className="app-shell">
      <AppHeader />

      <section className="catalog-hero">
        <div>
          <span className="eyebrow">AK Enterprises Directory</span>
          <h1>Surgical and pharma catalog with role based pricing.</h1>
        </div>
        <div className="hero-stat-panel">
          <strong>{data?.products.length ?? 0}</strong>
          <span>Listed products</span>
        </div>
      </section>

      {loading ? <LoadingPanel /> : null}
      {error ? <ErrorPanel message={error} /> : null}

      {data && !loading ? (
        <>
          <details className="mobile-filter">
            <summary>
              <SlidersHorizontal size={18} aria-hidden="true" />
              Browse Directory
            </summary>
            <SidebarNav data={data} selected={selected} onSelect={setSelected} />
          </details>

          <section className="catalog-layout">
            <SidebarNav data={data} selected={selected} onSelect={setSelected} className="desktop-sidebar" />

            <div className="catalog-content">
              <div className="content-toolbar">
                <div>
                  <span className="eyebrow">Showing</span>
                  <h2>{getSelectionTitle(data, selected)}</h2>
                </div>
                <span className="count-pill">{filteredProducts.length} products</span>
              </div>

              <ProductSections data={data} products={filteredProducts} />
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
