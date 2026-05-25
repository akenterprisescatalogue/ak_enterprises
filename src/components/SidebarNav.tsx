"use client";

import type { ReactNode } from "react";
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

function NavButton({
  selected,
  current,
  onSelect,
  children,
  depth = 0,
  count
}: {
  selected: FilterSelection;
  current: FilterSelection;
  onSelect: (selected: FilterSelection) => void;
  children: ReactNode;
  depth?: number;
  count: number;
}) {
  return (
    <button
      type="button"
      className={`nav-filter nav-depth-${depth} ${isActive(selected, current) ? "active" : ""}`}
      onClick={() => onSelect(current)}
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
  className = ""
}: {
  data: CatalogData;
  selected: FilterSelection;
  onSelect: (selected: FilterSelection) => void;
  className?: string;
}) {
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
            .map((brand) => (
              <div key={brand.id}>
                <NavButton
                  selected={selected}
                  current={{ type: "brand", id: brand.id }}
                  onSelect={onSelect}
                  depth={1}
                  count={countProducts(data, { type: "brand", id: brand.id })}
                >
                  <ChevronRight size={14} aria-hidden="true" />
                  {brand.name}
                </NavButton>

                {data.subcategories
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
                  ))}
              </div>
            ))}
        </div>
      ))}
    </nav>
  );
}
