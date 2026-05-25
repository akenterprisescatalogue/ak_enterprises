"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchCatalogData } from "@/lib/catalog";
import type { CatalogData } from "@/lib/types";

export function useCatalogData(accessToken?: string | null) {
  const [data, setData] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const catalog = await fetchCatalogData(accessToken);
      setData(catalog);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load catalog.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
