"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
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

type Point = {
  x: number;
  y: number;
};

type PointerDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startPan: Point;
};

type TouchGestureState = {
  mode: "swipe" | "pan" | "pinch";
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startPan: Point;
  startZoom: number;
  startDistance: number;
  didPinch: boolean;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const SWIPE_DISTANCE = 46;
const SWIPE_RESTRAINT = 62;
const DEFAULT_ORIGIN = { x: 50, y: 50 };
const DEFAULT_PAN = { x: 0, y: 0 };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundZoom(value: number) {
  return Number(value.toFixed(2));
}

function getTouchDistance(touches: ReactTouchEvent<HTMLDivElement>["touches"]) {
  if (touches.length < 2) return 0;
  const first = touches[0];
  const second = touches[1];
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

function getTouchMidpoint(touches: ReactTouchEvent<HTMLDivElement>["touches"]) {
  const first = touches[0];
  const second = touches[1];
  return {
    clientX: (first.clientX + second.clientX) / 2,
    clientY: (first.clientY + second.clientY) / 2,
  };
}

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
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pointerDragRef = useRef<PointerDragState | null>(null);
  const touchGestureRef = useRef<TouchGestureState | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("images");
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState<Point>(DEFAULT_ORIGIN);
  const [pan, setPan] = useState<Point>(DEFAULT_PAN);

  const mediaItems = useMemo<MediaItem[]>(
    () => [
      ...product.image_urls.map((url) => ({ type: "image" as const, url })),
      ...product.video_urls.map((url) => ({ type: "video" as const, url })),
    ],
    [product.image_urls, product.video_urls],
  );

  const activeMedia = mediaItems[activeMediaIndex];
  const canZoom = activeMedia?.type === "image";
  const isZoomed = canZoom && zoom > MIN_ZOOM;
  const imageTransformStyle: CSSProperties = {
    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
    transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
  };

  useEffect(() => {
    setActiveTab("images");
    setActiveMediaIndex(0);
    setZoom(1);
    setZoomOrigin(DEFAULT_ORIGIN);
    setPan(DEFAULT_PAN);
  }, [product.id]);

  useEffect(() => {
    setZoom(1);
    setZoomOrigin(DEFAULT_ORIGIN);
    setPan(DEFAULT_PAN);
  }, [activeMediaIndex]);

  useEffect(() => {
    if (mediaItems.length > 0 && activeMediaIndex >= mediaItems.length) {
      setActiveMediaIndex(0);
    }
  }, [activeMediaIndex, mediaItems.length]);

  const getStageOrigin = (clientX: number, clientY: number): Point => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return DEFAULT_ORIGIN;

    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  };

  const clampPan = (nextPan: Point, nextZoom = zoom) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || nextZoom <= MIN_ZOOM) return DEFAULT_PAN;

    const maxX = (rect.width * (nextZoom - MIN_ZOOM)) / 2;
    const maxY = (rect.height * (nextZoom - MIN_ZOOM)) / 2;

    return {
      x: clamp(nextPan.x, -maxX, maxX),
      y: clamp(nextPan.y, -maxY, maxY),
    };
  };

  const applyZoom = (nextZoom: number, origin?: Point) => {
    if (!canZoom) return;
    const safeZoom = clamp(roundZoom(nextZoom), MIN_ZOOM, MAX_ZOOM);

    if (origin) {
      setZoomOrigin(origin);
    }

    setZoom(safeZoom);
    setPan((current) => clampPan(current, safeZoom));
  };

  const resetZoom = () => {
    setZoom(MIN_ZOOM);
    setZoomOrigin(DEFAULT_ORIGIN);
    setPan(DEFAULT_PAN);
  };

  const goToPreviousMedia = () => {
    if (mediaItems.length < 2) return;
    setActiveMediaIndex((current) => (current === 0 ? mediaItems.length - 1 : current - 1));
  };

  const goToNextMedia = () => {
    if (mediaItems.length < 2) return;
    setActiveMediaIndex((current) => (current + 1) % mediaItems.length);
  };

  const zoomOut = () => applyZoom(zoom - ZOOM_STEP);
  const zoomIn = () => applyZoom(zoom + ZOOM_STEP);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canZoom || event.pointerType === "touch") return;

    setZoomOrigin(getStageOrigin(event.clientX, event.clientY));
    if (!isZoomed) return;

    pointerDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPan: pan,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = pointerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !isZoomed) return;

    event.preventDefault();
    setPan(
      clampPan({
        x: drag.startPan.x + event.clientX - drag.startX,
        y: drag.startPan.y + event.clientY - drag.startY,
      }),
    );
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerDragRef.current?.pointerId === event.pointerId) {
      pointerDragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  };

  const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!canZoom) return;

    const origin = getStageOrigin(event.clientX, event.clientY);
    if (isZoomed) {
      resetZoom();
    } else {
      applyZoom(2, origin);
    }
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!canZoom) return;

    if (event.touches.length === 2) {
      event.preventDefault();
      const midpoint = getTouchMidpoint(event.touches);
      setZoomOrigin(getStageOrigin(midpoint.clientX, midpoint.clientY));
      touchGestureRef.current = {
        mode: "pinch",
        startX: midpoint.clientX,
        startY: midpoint.clientY,
        currentX: midpoint.clientX,
        currentY: midpoint.clientY,
        startPan: pan,
        startZoom: zoom,
        startDistance: getTouchDistance(event.touches),
        didPinch: true,
      };
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;

    setZoomOrigin(getStageOrigin(touch.clientX, touch.clientY));
    touchGestureRef.current = {
      mode: isZoomed ? "pan" : "swipe",
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      startPan: pan,
      startZoom: zoom,
      startDistance: 0,
      didPinch: false,
    };
  };

  const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!canZoom) return;

    if (event.touches.length === 2) {
      event.preventDefault();
      const midpoint = getTouchMidpoint(event.touches);
      const currentDistance = getTouchDistance(event.touches);
      const gesture = touchGestureRef.current;
      const startDistance = gesture?.startDistance || currentDistance;
      const startZoom = gesture?.startZoom || zoom;
      const nextZoom = startDistance > 0 ? clamp(roundZoom(startZoom * (currentDistance / startDistance)), MIN_ZOOM, MAX_ZOOM) : zoom;

      setZoomOrigin(getStageOrigin(midpoint.clientX, midpoint.clientY));
      setZoom(nextZoom);
      setPan((current) => clampPan(current, nextZoom));
      touchGestureRef.current = {
        mode: "pinch",
        startX: gesture?.startX ?? midpoint.clientX,
        startY: gesture?.startY ?? midpoint.clientY,
        currentX: midpoint.clientX,
        currentY: midpoint.clientY,
        startPan: gesture?.startPan ?? pan,
        startZoom,
        startDistance,
        didPinch: true,
      };
      return;
    }

    const touch = event.touches[0];
    const gesture = touchGestureRef.current;
    if (!touch || !gesture) return;

    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;

    if (gesture.mode === "pan" || zoom > MIN_ZOOM) {
      event.preventDefault();
      setPan(
        clampPan({
          x: gesture.startPan.x + deltaX,
          y: gesture.startPan.y + deltaY,
        }),
      );
    } else if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
      event.preventDefault();
    }

    touchGestureRef.current = {
      ...gesture,
      currentX: touch.clientX,
      currentY: touch.clientY,
    };
  };

  const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!canZoom) return;

    const gesture = touchGestureRef.current;
    if (!gesture) return;

    if (event.touches.length > 0) {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        touchGestureRef.current = {
          mode: zoom > MIN_ZOOM ? "pan" : "swipe",
          startX: touch.clientX,
          startY: touch.clientY,
          currentX: touch.clientX,
          currentY: touch.clientY,
          startPan: pan,
          startZoom: zoom,
          startDistance: 0,
          didPinch: gesture.didPinch,
        };
      }
      return;
    }

    touchGestureRef.current = null;

    if (gesture.didPinch) {
      return;
    }

    const deltaX = gesture.currentX - gesture.startX;
    const deltaY = gesture.currentY - gesture.startY;
    const changedTouch = event.changedTouches[0];

    if (changedTouch && Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) {
      setZoomOrigin(getStageOrigin(changedTouch.clientX, changedTouch.clientY));
      return;
    }

    if (zoom <= MIN_ZOOM && mediaItems.length > 1 && Math.abs(deltaX) > SWIPE_DISTANCE && Math.abs(deltaY) < SWIPE_RESTRAINT) {
      if (deltaX < 0) {
        goToNextMedia();
      } else {
        goToPreviousMedia();
      }
    }
  };

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
                disabled={!canZoom || zoom >= MAX_ZOOM}
                aria-label="Zoom in"
              >
                <ZoomIn size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={resetZoom}
                disabled={!canZoom || zoom === 1}
                aria-label="Reset zoom"
              >
                <RotateCcw size={17} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            ref={stageRef}
            className={`detail-media-stage ${canZoom ? "is-zoomable" : ""} ${isZoomed ? "is-zoomed" : ""}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onDoubleClick={handleDoubleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {activeMedia ? (
              activeMedia.type === "image" ? (
                <img
                  src={activeMedia.url}
                  alt={`${product.name} image ${activeMediaIndex + 1}`}
                  draggable={false}
                  style={imageTransformStyle}
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
