"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/components/AuthProvider";
import { ErrorPanel, LoadingPanel } from "@/components/StatusPanels";
import { ProductSections } from "@/components/ProductSections";
import { SidebarNav } from "@/components/SidebarNav";
import { useCatalogData } from "@/hooks/useCatalogData";
import type { FilterSelection } from "@/lib/types";
import { filterProducts, getSelectionTitle, searchProducts } from "@/lib/utils";

export default function HomePage() {
  const { accessToken } = useAuth();
  const { data, loading, error } = useCatalogData(accessToken);
  const [selected, setSelected] = useState<FilterSelection>({ type: "all" });
  const [searchQuery, setSearchQuery] = useState("");
  const hasSearch = searchQuery.trim().length > 0;

  const selectedProducts = useMemo(() => {
    if (!data) return [];
    return filterProducts(data.products, selected);
  }, [data, selected]);

  const searchedProducts = useMemo(() => {
    if (!data) return [];
    return searchProducts(data.products, searchQuery);
  }, [data, searchQuery]);

  const visibleProducts = hasSearch ? searchedProducts : selectedProducts;

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
          <section className="catalog-search-panel" role="search" aria-label="Search catalog products">
            <label className="catalog-search-field">
              <Search size={19} aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search products, brands, SKU, categories..."
                aria-label="Search products"
              />
              {hasSearch ? (
                <button type="button" className="catalog-search-clear" onClick={() => setSearchQuery("")} aria-label="Clear search">
                  <X size={16} aria-hidden="true" />
                </button>
              ) : null}
            </label>
            <span className="catalog-search-meta">
              {hasSearch ? `${visibleProducts.length} matches across catalog` : "Search all products"}
            </span>
          </section>

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
                  <h2>{hasSearch ? "Search Results" : getSelectionTitle(data, selected)}</h2>
                </div>
                <span className="count-pill">{visibleProducts.length} products</span>
              </div>

              <ProductSections
                data={data}
                products={visibleProducts}
                emptyDescription={
                  hasSearch
                    ? "Try another product name, brand, SKU, category, or tag."
                    : "Try another category, brand, or subcategory from the directory."
                }
              />
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
