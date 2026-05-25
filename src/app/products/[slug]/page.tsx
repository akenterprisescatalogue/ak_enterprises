"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";
import { ProductDetailView } from "@/components/ProductDetailView";
import { ErrorPanel, LoadingPanel } from "@/components/StatusPanels";
import { useCatalogData } from "@/hooks/useCatalogData";

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const { accessToken } = useAuth();
  const { data, loading, error } = useCatalogData(accessToken);
  const product = data?.products.find((item) => item.slug === params.slug);

  if (loading) return <LoadingPanel label="Loading product" />;
  if (error) return <ErrorPanel message={error} />;

  if (!product) {
    return (
      <main className="app-shell">
        <div className="empty-state">
          <h1>Product not found</h1>
          <Link href="/" className="button button-primary">
            Back to Catalog
          </Link>
        </div>
      </main>
    );
  }

  return <ProductDetailView product={product} />;
}
