"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Film, Package, Pencil, Tag } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import { PriceBlock } from "@/components/PriceBlock";
import { ProductImage } from "@/components/ProductImage";
import type { ProductWithRelations } from "@/lib/types";

function getVideoEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    if (parsed.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${parsed.pathname.replace("/", "")}`;
    }
    return url;
  } catch {
    return url;
  }
}

export function ProductDetailView({ product }: { product: ProductWithRelations }) {
  const { role } = useAuth();
  const canEdit = role === "admin";
  const gallery = product.image_urls.length > 0 ? product.image_urls : [undefined];

  return (
    <main className="app-shell product-detail-shell">
      <div className="detail-topbar">
        <Link href="/" className="back-link">
          <ArrowLeft size={17} aria-hidden="true" />
          Catalog
        </Link>
        {canEdit ? (
          <Link href={`/admin/listings?edit=${product.id}`} className="button button-primary">
            <Pencil size={16} aria-hidden="true" />
            Edit Listing
          </Link>
        ) : null}
      </div>

      <section className="detail-hero">
        <div className="detail-gallery">
          <ProductImage src={gallery[0]} alt={product.name} className="detail-main-image" />
          {product.image_urls.length > 1 ? (
            <div className="detail-thumbs">
              {product.image_urls.slice(1, 5).map((image) => (
                <ProductImage key={image} src={image} alt={product.name} className="detail-thumb" />
              ))}
            </div>
          ) : null}
        </div>

        <div className="detail-summary">
          <div className="breadcrumb-line">
            <span>{product.main_category?.name}</span>
            <span>{product.brand?.name}</span>
            <span>{product.subcategory?.name}</span>
            {product.second_subcategory?.name ? <span>{product.second_subcategory.name}</span> : null}
          </div>
          <h1>{product.name}</h1>
          <p>{product.description}</p>

          <div className="detail-tags">
            {product.sku ? (
              <span>
                <Tag size={14} aria-hidden="true" />
                {product.sku}
              </span>
            ) : null}
            {product.pack_size ? (
              <span>
                <Package size={14} aria-hidden="true" />
                {product.pack_size}
              </span>
            ) : null}
            <span>
              <CheckCircle2 size={14} aria-hidden="true" />
              {product.availability}
            </span>
          </div>

          <PriceBlock mrp={product.mrp_price} offered={product.offered_price} />
        </div>
      </section>

      <section className="detail-grid">
        <div className="detail-panel">
          <span className="eyebrow">Highlights</span>
          <ul className="feature-list">
            {product.highlights.map((feature) => (
              <li key={feature}>
                <CheckCircle2 size={17} aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="detail-panel">
          <span className="eyebrow">Product Info</span>
          <p>{product.description}</p>
          {product.tags.length > 0 ? (
            <div className="tag-row">
              {product.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {product.video_urls.length > 0 ? (
        <section className="video-section">
          <div className="section-heading">
            <span>Media</span>
            <h2>Product Videos</h2>
          </div>
          <div className="video-grid">
            {product.video_urls.map((video) => {
              const embedUrl = getVideoEmbedUrl(video);
              const isVideoFile = /\.(mp4|webm|ogg)$/i.test(video);

              return (
                <div key={video} className="video-frame">
                  {isVideoFile ? (
                    <video src={video} controls />
                  ) : (
                    <iframe src={embedUrl} title={`${product.name} video`} allowFullScreen />
                  )}
                  <span>
                    <Film size={15} aria-hidden="true" />
                    Product media
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}
