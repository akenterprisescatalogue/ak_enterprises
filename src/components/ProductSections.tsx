"use client";

import { SearchX } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import type { CatalogData, ProductWithRelations } from "@/lib/types";
import { buildGroupedProducts } from "@/lib/utils";

export function ProductSections({
  data,
  products
}: {
  data: CatalogData;
  products: ProductWithRelations[];
}) {
  const groups = buildGroupedProducts(data, products);

  if (products.length === 0) {
    return (
      <div className="empty-state">
        <SearchX size={26} aria-hidden="true" />
        <h3>No products found</h3>
        <p>Try another category, brand, or subcategory from the directory.</p>
      </div>
    );
  }

  return (
    <div className="product-sections">
      {groups.map((categoryGroup) => (
        <section key={categoryGroup.category.id} className="catalog-section">
          <div className="section-heading">
            <span>Main Category</span>
            <h2>{categoryGroup.category.name}</h2>
          </div>

          {categoryGroup.brands.map((brandGroup) => (
            <div key={brandGroup.brand.id} className="brand-section">
              <div className="brand-heading">
                <span>Brand</span>
                <h3>{brandGroup.brand.name}</h3>
              </div>

              {brandGroup.subcategories.map((subcategoryGroup) => (
                <div key={subcategoryGroup.subcategory.id} className="subcategory-section">
                  <div className="subcategory-heading">
                    <span>Subcategory</span>
                    <h4>{subcategoryGroup.subcategory.name}</h4>
                  </div>
                  {subcategoryGroup.secondSubcategories.map((secondSubcategoryGroup) => (
                    <div key={secondSubcategoryGroup.secondSubcategory.id} className="second-subcategory-section">
                      <div className="second-subcategory-heading">
                        <span>Second Subcategory</span>
                        <h5>{secondSubcategoryGroup.secondSubcategory.name}</h5>
                      </div>
                      <div className="product-grid">
                        {secondSubcategoryGroup.products.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {subcategoryGroup.products.length > 0 ? (
                    <div className="product-grid">
                      {subcategoryGroup.products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
