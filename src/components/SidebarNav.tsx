"use client";

import { useState, type ReactNode } from "react";
import { Boxes, ChevronRight, FolderTree, Layers3, Tag } from "lucide-react";

import type { CatalogData, FilterSelection } from "@/lib/types";

function countProducts(data: CatalogData, selected: FilterSelection) {
  if (selected.type === "all") return data.products.length;
  if (selected.type === "main") {
    return data.products.filter((product) => product.main_category_id === selected.id).length;
  }
  if (selected.type === "brand") {
    return data.products.filter((product) => product.brand_id === selected.id).length;
  }
  if (selected.type === "sub") {
    return data.products.filter((product) => product.subcategory_id === selected.id).length;
  }
  return data.products.filter((product) => product.second_subcategory_id === selected.id).length;
}

function isActive(current: FilterSelection, next: FilterSelection) {
  return current.type === next.type && ("id" in current ? current.id : "") === ("id" in next ? next.id : "");
}

function hasSelectedBrandChild(data: CatalogData, brandId: string, selected: FilterSelection) {
  if (selected.type === "sub") {
    return data.subcategories.some((subcategory) => subcategory.id === selected.id && subcategory.brand_id === brandId);
  }

  if (selected.type === "second_sub") {
    const secondSubcategory = data.secondSubcategories.find((item) => item.id === selected.id);
    if (!secondSubcategory) return false;
    return data.subcategories.some(
      (subcategory) => subcategory.id === secondSubcategory.subcategory_id && subcategory.brand_id === brandId
    );
  }

  return false;
}

function NavButton({
  selected,
  current,
  onSelect,
  onActivate,
  children,
  depth = 0,
  count
}: {
  selected: FilterSelection;
  current: FilterSelection;
  onSelect: (selected: FilterSelection) => void;
  onActivate?: () => void;
  children: ReactNode;
  depth?: number;
  count: number;
}) {
  return (
    <button
      type="button"
      className={`nav-filter nav-depth-${depth} ${isActive(selected, current) ? "active" : ""}`}
      onClick={() => {
        onSelect(current);
        onActivate?.();
      }}
    >
      <span>{children}</span>
      <em>{count}</em>
    </button>
  );
}

export function SidebarNav({
  data,
  selected,
  onSelect,
  className = "",
  collapsibleBrands = false
}: {
  data: CatalogData;
  selected: FilterSelection;
  onSelect: (selected: FilterSelection) => void;
  className?: string;
  collapsibleBrands?: boolean;
}) {
  const [expandedBrandIds, setExpandedBrandIds] = useState<Set<string>>(new Set());

  function toggleBrand(brandId: string) {
    if (!collapsibleBrands) return;
    setExpandedBrandIds((current) => {
      const next = new Set(current);
      if (next.has(brandId)) {
        next.delete(brandId);
      } else {
        next.add(brandId);
      }
      return next;
    });
  }

  return (
    <nav className={`sidebar-nav ${className}`} aria-label="Catalog filters">
      <div className="sidebar-title">
        <FolderTree size={18} aria-hidden="true" />
        <span>Directory</span>
      </div>
      <NavButton selected={selected} current={{ type: "all" }} onSelect={onSelect} count={data.products.length}>
        <Boxes size={16} aria-hidden="true" />
        All Products
      </NavButton>

      {data.categories.map((category) => (
        <div key={category.id} className="nav-group">
          <NavButton
            selected={selected}
            current={{ type: "main", id: category.id }}
            onSelect={onSelect}
            count={countProducts(data, { type: "main", id: category.id })}
          >
            <Layers3 size={16} aria-hidden="true" />
            {category.name}
          </NavButton>

          {data.brands
            .filter((brand) => brand.main_category_id === category.id)
            .map((brand) => {
              const showBrandChildren =
                !collapsibleBrands || expandedBrandIds.has(brand.id) || hasSelectedBrandChild(data, brand.id, selected);

              return (
              <div key={brand.id}>
                <NavButton
                  selected={selected}
                  current={{ type: "brand", id: brand.id }}
                  onSelect={onSelect}
                  onActivate={() => toggleBrand(brand.id)}
                  depth={1}
                  count={countProducts(data, { type: "brand", id: brand.id })}
                >
                  <ChevronRight size={14} aria-hidden="true" />
                  {brand.name}
                </NavButton>

                {showBrandChildren
                  ? data.subcategories
                      .filter((subcategory) => subcategory.brand_id === brand.id)
                      .map((subcategory) => (
                        <div key={subcategory.id}>
                          <NavButton
                            selected={selected}
                            current={{ type: "sub", id: subcategory.id }}
                            onSelect={onSelect}
                            depth={2}
                            count={countProducts(data, { type: "sub", id: subcategory.id })}
                          >
                            <Tag size={13} aria-hidden="true" />
                            {subcategory.name}
                          </NavButton>
                          {data.secondSubcategories
                            .filter((secondSubcategory) => secondSubcategory.subcategory_id === subcategory.id)
                            .map((secondSubcategory) => (
                              <NavButton
                                key={secondSubcategory.id}
                                selected={selected}
                                current={{ type: "second_sub", id: secondSubcategory.id }}
                                onSelect={onSelect}
                                depth={3}
                                count={countProducts(data, { type: "second_sub", id: secondSubcategory.id })}
                              >
                                <ChevronRight size={12} aria-hidden="true" />
                                {secondSubcategory.name}
                              </NavButton>
                            ))}
                        </div>
                      ))
                  : null}
              </div>
            );
            })}
        </div>
      ))}
    </nav>
  );
}
