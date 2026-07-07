"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchCatalogData } from "@/lib/catalog";
import type { CatalogData } from "@/lib/types";

const catalogCache = new Map<string, CatalogData>();

function getCacheKey(accessToken?: string | null) {
  return accessToken ? `auth:${accessToken}` : "public";
}

export function useCatalogData(accessToken?: string | null) {
  const cacheKey = getCacheKey(accessToken);
  const [data, setData] = useState<CatalogData | null>(() => catalogCache.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(() => !catalogCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    const cached = catalogCache.get(cacheKey);
    if (!silent && !cached) setLoading(true);
    setError(null);

    try {
      const catalog = await fetchCatalogData(accessToken);
      catalogCache.set(cacheKey, catalog);
      setData(catalog);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load catalog.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, cacheKey]);

  useEffect(() => {
    const cached = catalogCache.get(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      void refresh({ silent: true });
      return;
    }

    setData(null);
    void refresh();
  }, [cacheKey, refresh]);

  return { data, loading, error, refresh };
}