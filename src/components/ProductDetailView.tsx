"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Film,
  Image as ImageIcon,
  Package,
  Pencil,
  RotateCcw,
  Tag,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import { PriceBlock } from "@/components/PriceBlock";
import type { ProductWithRelations } from "@/lib/types";

type DetailTab = "images" | "description";

type MediaItem = {
  type: "image" | "video";
  url: string;
};

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

function isVideoFile(url: string) {
  return /\.(mp4|webm|ogg)(?:$|[?#])/i.test(url);
}

export function ProductDetailView({ product }: { product: ProductWithRelations }) {
  const { role } = useAuth();
  const canEdit = role === "admin";
  const [activeTab, setActiveTab] = useState<DetailTab>("images");
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [zoom, setZoom] = useState(1);

  const mediaItems = useMemo<MediaItem[]>(
    () => [
      ...product.image_urls.map((url) => ({ type: "image" as const, url })),
      ...product.video_urls.map((url) => ({ type: "video" as const, url })),
    ],
    [product.image_urls, product.video_urls],
  );

  const activeMedia = mediaItems[activeMediaIndex];
  const canZoom = activeMedia?.type === "image";

  useEffect(() => {
    setActiveTab("images");
    setActiveMediaIndex(0);
    setZoom(1);
  }, [product.id]);

  useEffect(() => {
    setZoom(1);
  }, [activeMediaIndex]);

  useEffect(() => {
    if (mediaItems.length > 0 && activeMediaIndex >= mediaItems.length) {
      setActiveMediaIndex(0);
    }
  }, [activeMediaIndex, mediaItems.length]);

  const goToPreviousMedia = () => {
    if (mediaItems.length < 2) return;
    setActiveMediaIndex((current) => (current === 0 ? mediaItems.length - 1 : current - 1));
  };

  const goToNextMedia = () => {
    if (mediaItems.length < 2) return;
    setActiveMediaIndex((current) => (current + 1) % mediaItems.length);
  };

  const zoomOut = () => setZoom((current) => Math.max(1, Number((current - 0.25).toFixed(2))));
  const zoomIn = () => setZoom((current) => Math.min(2.5, Number((current + 0.25).toFixed(2))));

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

      <div className="detail-tabs" role="tablist" aria-label={`${product.name} details`}>
        <button
          type="button"
          className={`detail-tab-button ${activeTab === "images" ? "active" : ""}`}
          onClick={() => setActiveTab("images")}
          role="tab"
          aria-selected={activeTab === "images"}
        >
          <ImageIcon size={17} aria-hidden="true" />
          Images
        </button>
        <button
          type="button"
          className={`detail-tab-button ${activeTab === "description" ? "active" : ""}`}
          onClick={() => setActiveTab("description")}
          role="tab"
          aria-selected={activeTab === "description"}
        >
          <Package size={17} aria-hidden="true" />
          Description
        </button>
      </div>

      {activeTab === "images" ? (
        <section className="detail-media-panel" aria-label={`${product.name} images and videos`}>
          <div className="detail-media-toolbar">
            <div>
              <span className="eyebrow">Product Media</span>
              <h1>{product.name}</h1>
              <p>
                {mediaItems.length > 0
                  ? `${activeMediaIndex + 1} of ${mediaItems.length} media items`
                  : "No images or videos uploaded yet"}
              </p>
            </div>
            <div className="detail-media-actions" aria-label="Media controls">
              <button
                type="button"
                className="icon-button"
                onClick={goToPreviousMedia}
                disabled={mediaItems.length < 2}
                aria-label="Previous media"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={goToNextMedia}
                disabled={mediaItems.length < 2}
                aria-label="Next media"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={zoomOut}
                disabled={!canZoom || zoom <= 1}
                aria-label="Zoom out"
              >
                <ZoomOut size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={zoomIn}
                disabled={!canZoom || zoom >= 2.5}
                aria-label="Zoom in"
              >
                <ZoomIn size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => setZoom(1)}
                disabled={!canZoom || zoom === 1}
                aria-label="Reset zoom"
              >
                <RotateCcw size={17} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="detail-media-stage">
            {activeMedia ? (
              activeMedia.type === "image" ? (
                <img
                  src={activeMedia.url}
                  alt={`${product.name} image ${activeMediaIndex + 1}`}
                  style={{ transform: `scale(${zoom})` }}
                />
              ) : isVideoFile(activeMedia.url) ? (
                <video src={activeMedia.url} controls />
              ) : (
                <iframe src={getVideoEmbedUrl(activeMedia.url)} title={`${product.name} video`} allowFullScreen />
              )
            ) : (
              <div className="detail-media-empty">
                <ImageIcon size={42} aria-hidden="true" />
                <span>No media uploaded</span>
              </div>
            )}
          </div>

          {mediaItems.length > 1 ? (
            <div className="detail-media-thumbs" aria-label="Select product media">
              {mediaItems.map((item, index) => (
                <button
                  type="button"
                  key={`${item.type}-${item.url}-${index}`}
                  className={`detail-media-thumb ${activeMediaIndex === index ? "active" : ""}`}
                  onClick={() => setActiveMediaIndex(index)}
                  aria-label={`Show ${item.type} ${index + 1}`}
                >
                  {item.type === "image" ? (
                    <img src={item.url} alt={`${product.name} thumbnail ${index + 1}`} />
                  ) : (
                    <span className="detail-video-thumb">
                      <Film size={24} aria-hidden="true" />
                      Video
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <section className="detail-description-layout" aria-label={`${product.name} description`}>
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

          <div className="detail-grid">
            <div className="detail-panel">
              <span className="eyebrow">Highlights</span>
              {product.highlights.length > 0 ? (
                <ul className="feature-list">
                  {product.highlights.map((feature) => (
                    <li key={feature}>
                      <CheckCircle2 size={17} aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No highlights added yet.</p>
              )}
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
          </div>
        </section>
      )}
    </main>
  );
}
