"use client";

import Link from "next/link";
import { ArrowUpRight, PackageCheck } from "lucide-react";

import { PriceBlock } from "@/components/PriceBlock";
import { ProductImage } from "@/components/ProductImage";
import type { ProductWithRelations } from "@/lib/types";

export function ProductCard({ product }: { product: ProductWithRelations }) {
  return (
    <Link href={`/products/${product.slug}`} className="product-card">
      <div className="product-card-media">
        <ProductImage src={product.image_urls[0]} alt={product.name} className="product-card-image" />
        <span className="availability-badge">
          <PackageCheck size={14} aria-hidden="true" />
          {product.availability}
        </span>
      </div>
      <div className="product-card-body">
        <div className="product-meta-row">
          <span>{product.brand?.name ?? "Brand"}</span>
          <span>{product.second_subcategory?.name ?? product.subcategory?.name ?? "Subcategory"}</span>
        </div>
        <h3>{product.name}</h3>
        <PriceBlock mrp={product.mrp_price} offered={product.offered_price} compact />
        <span className="card-view-link">
          View details
          <ArrowUpRight size={15} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
