"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Printer, X } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import { ErrorPanel } from "@/components/StatusPanels";
import { useCatalogData } from "@/hooks/useCatalogData";
import type {
  Brand,
  CatalogData,
  MainCategory,
  ProductWithRelations,
  SecondSubcategory,
  Subcategory
} from "@/lib/types";
import { buildGroupedProducts, formatCurrency } from "@/lib/utils";

type PrintScope = "all" | "main" | "brand" | "sub" | "second_sub" | "product";

type PrintSelection = {
  scope: PrintScope;
  categoryId: string;
  brandId: string;
  subcategoryId: string;
  secondSubcategoryId: string;
  productId: string;
};

const scopeLabels: Record<PrintScope, string> = {
  all: "All Products",
  main: "Main Category",
  brand: "Brand",
  sub: "Subcategory",
  second_sub: "Second Subcategory",
  product: "Single Product"
};

const emptySelection: PrintSelection = {
  scope: "all",
  categoryId: "",
  brandId: "",
  subcategoryId: "",
  secondSubcategoryId: "",
  productId: ""
};

function sortProducts(data: CatalogData, products: ProductWithRelations[]) {
  const categoryOrder = new Map(data.categories.map((item, index) => [item.id, item.sort_order * 1000 + index]));
  const brandOrder = new Map(data.brands.map((item, index) => [item.id, item.sort_order * 1000 + index]));
  const subcategoryOrder = new Map(data.subcategories.map((item, index) => [item.id, item.sort_order * 1000 + index]));
  const secondSubcategoryOrder = new Map(
    data.secondSubcategories.map((item, index) => [item.id, item.sort_order * 1000 + index])
  );

  return [...products].sort((first, second) => {
    const hierarchy =
      (categoryOrder.get(first.main_category_id) ?? 0) - (categoryOrder.get(second.main_category_id) ?? 0) ||
      (brandOrder.get(first.brand_id) ?? 0) - (brandOrder.get(second.brand_id) ?? 0) ||
      (subcategoryOrder.get(first.subcategory_id) ?? 0) - (subcategoryOrder.get(second.subcategory_id) ?? 0) ||
      (secondSubcategoryOrder.get(first.second_subcategory_id ?? "") ?? 0) -
        (secondSubcategoryOrder.get(second.second_subcategory_id ?? "") ?? 0);

    return hierarchy || first.name.localeCompare(second.name);
  });
}

function getSelectedProducts(data: CatalogData, selection: PrintSelection) {
  if (selection.scope === "all") return sortProducts(data, data.products);
  if (selection.scope === "main" && selection.categoryId) {
    return sortProducts(
      data,
      data.products.filter((product) => product.main_category_id === selection.categoryId)
    );
  }
  if (selection.scope === "brand" && selection.brandId) {
    return sortProducts(
      data,
      data.products.filter((product) => product.brand_id === selection.brandId)
    );
  }
  if (selection.scope === "sub" && selection.subcategoryId) {
    return sortProducts(
      data,
      data.products.filter((product) => product.subcategory_id === selection.subcategoryId)
    );
  }
  if (selection.scope === "second_sub" && selection.secondSubcategoryId) {
    return sortProducts(
      data,
      data.products.filter((product) => product.second_subcategory_id === selection.secondSubcategoryId)
    );
  }
  if (selection.scope === "product" && selection.productId) {
    return sortProducts(
      data,
      data.products.filter((product) => product.id === selection.productId)
    );
  }

  return [];
}

function brandLabel(data: CatalogData, brand: Brand) {
  const category = data.categories.find((item) => item.id === brand.main_category_id);
  return `${category?.name ?? "Category"} / ${brand.name}`;
}

function subcategoryLabel(data: CatalogData, subcategory: Subcategory) {
  const brand = data.brands.find((item) => item.id === subcategory.brand_id);
  return `${brand ? brandLabel(data, brand) : "Brand"} / ${subcategory.name}`;
}

function secondSubcategoryLabel(data: CatalogData, secondSubcategory: SecondSubcategory) {
  const subcategory = data.subcategories.find((item) => item.id === secondSubcategory.subcategory_id);
  return `${subcategory ? subcategoryLabel(data, subcategory) : "Subcategory"} / ${secondSubcategory.name}`;
}

function productLabel(product: ProductWithRelations) {
  return [
    product.main_category?.name,
    product.brand?.name,
    product.subcategory?.name,
    product.second_subcategory?.name,
    product.name
  ]
    .filter(Boolean)
    .join(" / ");
}

function printTitle(data: CatalogData, selection: PrintSelection) {
  if (selection.scope === "all") return "All Products";
  if (selection.scope === "main") {
    return data.categories.find((item) => item.id === selection.categoryId)?.name ?? "Main Category";
  }
  if (selection.scope === "brand") {
    const brand = data.brands.find((item) => item.id === selection.brandId);
    return brand ? brandLabel(data, brand) : "Brand";
  }
  if (selection.scope === "sub") {
    const subcategory = data.subcategories.find((item) => item.id === selection.subcategoryId);
    return subcategory ? subcategoryLabel(data, subcategory) : "Subcategory";
  }
  if (selection.scope === "second_sub") {
    const secondSubcategory = data.secondSubcategories.find((item) => item.id === selection.secondSubcategoryId);
    return secondSubcategory ? secondSubcategoryLabel(data, secondSubcategory) : "Second Subcategory";
  }

  return data.products.find((item) => item.id === selection.productId)?.name ?? "Single Product";
}

function SelectionField({
  label,
  value,
  disabled,
  children,
  onChange
}: {
  label: string;
  value: string;
  disabled?: boolean;
  children: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function PrintDocument({
  data,
  products,
  title,
  canSeeOffer
}: {
  data: CatalogData;
  products: ProductWithRelations[];
  title: string;
  canSeeOffer: boolean;
}) {
  const groups = buildGroupedProducts(data, products);
  const printedAt = new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date());

  return (
    <section className="print-root" aria-hidden="true">
      <div className="print-cover">
        <div className="print-brand">
          <img src="/ak-enterprises-logo-transparent.png" alt="" />
          <div>
            <strong>AK Enterprises</strong>
            <span>Medical Catalog</span>
          </div>
        </div>
        <div className="print-cover-meta">
          <span>{printedAt}</span>
          <strong>{products.length} Products</strong>
        </div>
      </div>

      <div className="print-title-block">
        <span>Catalog Print</span>
        <h1>{title}</h1>
        <p>{canSeeOffer ? "MRP and offered pricing" : "MRP pricing"}</p>
      </div>

      {groups.map((categoryGroup) => (
        <section key={categoryGroup.category.id} className="print-category">
          <h2>{categoryGroup.category.name}</h2>
          {categoryGroup.brands.map((brandGroup) => (
            <section key={brandGroup.brand.id} className="print-brand-section">
              <h3>{brandGroup.brand.name}</h3>
              {brandGroup.subcategories.map((subcategoryGroup) => (
                <section key={subcategoryGroup.subcategory.id} className="print-subcategory">
                  <h4>{subcategoryGroup.subcategory.name}</h4>
                  {subcategoryGroup.secondSubcategories.map((secondSubcategoryGroup) => (
                    <section key={secondSubcategoryGroup.secondSubcategory.id} className="print-second-subcategory">
                      <h5>{secondSubcategoryGroup.secondSubcategory.name}</h5>
                      <div className="print-product-grid">
                        {secondSubcategoryGroup.products.map((product) => (
                          <PrintProductCard key={product.id} product={product} canSeeOffer={canSeeOffer} />
                        ))}
                      </div>
                    </section>
                  ))}
                  {subcategoryGroup.products.length > 0 ? (
                    <div className="print-product-grid">
                      {subcategoryGroup.products.map((product) => (
                        <PrintProductCard key={product.id} product={product} canSeeOffer={canSeeOffer} />
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
            </section>
          ))}
        </section>
      ))}
    </section>
  );
}

function PrintProductCard({
  product,
  canSeeOffer
}: {
  product: ProductWithRelations;
  canSeeOffer: boolean;
}) {
  return (
    <article className="print-product-card">
      <div className="print-product-media">
        {product.image_urls[0] ? <img src={product.image_urls[0]} alt="" /> : <span>No Image</span>}
      </div>
      <div className="print-product-body">
        <h6>{product.name}</h6>
        <div className="print-price-row">
          <span>
            <small>MRP</small>
            <strong>{formatCurrency(product.mrp_price)}</strong>
          </span>
          {canSeeOffer && product.offered_price ? (
            <span>
              <small>Offered</small>
              <strong>{formatCurrency(product.offered_price)}</strong>
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function CatalogPrintDialog() {
  const { accessToken, role, user } = useAuth();
  const catalogCacheScope = user ? `${role}:${user.id}` : "public";
  const { data, loading, error, refresh } = useCatalogData(accessToken, catalogCacheScope);
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<PrintSelection>(emptySelection);
  const canSeeOffer = role === "admin" || role === "salesman";

  const products = useMemo(() => (data ? getSelectedProducts(data, selection) : []), [data, selection]);
  const title = data ? printTitle(data, selection) : "Catalog";

  useEffect(() => {
    function clearPrintState() {
      document.body.classList.remove("is-printing-catalog");
    }

    window.addEventListener("afterprint", clearPrintState);
    return () => window.removeEventListener("afterprint", clearPrintState);
  }, []);

  function updateSelection(next: Partial<PrintSelection>) {
    setSelection((current) => ({ ...current, ...next }));
  }

  function handlePrint() {
    if (!data || products.length === 0) return;
    document.body.classList.add("is-printing-catalog");
    window.setTimeout(() => window.print(), 80);
  }

  return (
    <>
      <button type="button" className="button button-print" onClick={() => setOpen(true)}>
        <Printer size={18} aria-hidden="true" />
        <span>Print</span>
      </button>

      {open ? (
        <div className="print-modal-backdrop" role="presentation">
          <section className="print-modal" role="dialog" aria-modal="true" aria-labelledby="print-dialog-title">
            <div className="print-modal-heading">
              <div>
                <span className="eyebrow">Print Catalog</span>
                <h2 id="print-dialog-title">Choose Print Scope</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Close print dialog">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {loading ? (
              <div className="state-panel">
                <Loader2 className="spin" size={24} aria-hidden="true" />
                <span>Loading catalog</span>
              </div>
            ) : null}

            {error ? <ErrorPanel message={error} /> : null}

            {data && !loading ? (
              <>
                <div className="print-scope-grid" role="list" aria-label="Print scope">
                  {(Object.keys(scopeLabels) as PrintScope[]).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      className={`print-scope-button ${selection.scope === scope ? "active" : ""}`}
                      onClick={() => setSelection({ ...emptySelection, scope })}
                    >
                      <FileText size={16} aria-hidden="true" />
                      {scopeLabels[scope]}
                    </button>
                  ))}
                </div>

                <div className="print-selector-panel">
                  {selection.scope === "main" ? (
                    <SelectionField
                      label="Main Category"
                      value={selection.categoryId}
                      onChange={(categoryId) => updateSelection({ categoryId })}
                    >
                      <option value="">Select main category</option>
                      {data.categories.map((category: MainCategory) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </SelectionField>
                  ) : null}

                  {selection.scope === "brand" ? (
                    <SelectionField
                      label="Brand"
                      value={selection.brandId}
                      onChange={(brandId) => updateSelection({ brandId })}
                    >
                      <option value="">Select brand</option>
                      {data.brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brandLabel(data, brand)}
                        </option>
                      ))}
                    </SelectionField>
                  ) : null}

                  {selection.scope === "sub" ? (
                    <SelectionField
                      label="Subcategory"
                      value={selection.subcategoryId}
                      onChange={(subcategoryId) => updateSelection({ subcategoryId })}
                    >
                      <option value="">Select subcategory</option>
                      {data.subcategories.map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {subcategoryLabel(data, subcategory)}
                        </option>
                      ))}
                    </SelectionField>
                  ) : null}

                  {selection.scope === "second_sub" ? (
                    <SelectionField
                      label="Second Subcategory"
                      value={selection.secondSubcategoryId}
                      onChange={(secondSubcategoryId) => updateSelection({ secondSubcategoryId })}
                    >
                      <option value="">Select second subcategory</option>
                      {data.secondSubcategories.map((secondSubcategory) => (
                        <option key={secondSubcategory.id} value={secondSubcategory.id}>
                          {secondSubcategoryLabel(data, secondSubcategory)}
                        </option>
                      ))}
                    </SelectionField>
                  ) : null}

                  {selection.scope === "product" ? (
                    <SelectionField
                      label="Product"
                      value={selection.productId}
                      onChange={(productId) => updateSelection({ productId })}
                    >
                      <option value="">Select product</option>
                      {data.products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {productLabel(product)}
                        </option>
                      ))}
                    </SelectionField>
                  ) : null}

                  <div className="print-summary-card">
                    <span>{scopeLabels[selection.scope]}</span>
                    <strong>{products.length} products</strong>
                    <em>{canSeeOffer ? "MRP + Offered" : "MRP only"}</em>
                  </div>
                </div>

                <div className="print-modal-actions">
                  <button type="button" className="button button-cancel" onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="button button-soft" onClick={() => void refresh()}>
                    Refresh
                  </button>
                  <button type="button" className="button button-primary" onClick={handlePrint} disabled={products.length === 0}>
                    <Printer size={17} aria-hidden="true" />
                    Print Catalog
                  </button>
                </div>

                {data.schemaWarning ? <p className="form-error">{data.schemaWarning}</p> : null}
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {data ? <PrintDocument data={data} products={products} title={title} canSeeOffer={canSeeOffer} /> : null}
    </>
  );
}
