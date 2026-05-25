import { demoCatalog } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase/client";
import type {
  Brand,
  CatalogData,
  MainCategory,
  Product,
  ProductWithRelations,
  SecondSubcategory,
  Subcategory
} from "@/lib/types";

function hydrateProducts(
  products: Product[],
  categories: MainCategory[],
  brands: Brand[],
  subcategories: Subcategory[],
  secondSubcategories: SecondSubcategory[]
): ProductWithRelations[] {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const brandMap = new Map(brands.map((brand) => [brand.id, brand]));
  const subcategoryMap = new Map(subcategories.map((subcategory) => [subcategory.id, subcategory]));
  const secondSubcategoryMap = new Map(secondSubcategories.map((subcategory) => [subcategory.id, subcategory]));

  return products.map((product) => ({
    ...product,
    highlights: product.highlights ?? [],
    image_urls: product.image_urls ?? [],
    video_urls: product.video_urls ?? [],
    tags: product.tags ?? [],
    main_category: categoryMap.get(product.main_category_id) ?? null,
    brand: brandMap.get(product.brand_id) ?? null,
    subcategory: subcategoryMap.get(product.subcategory_id) ?? null,
    second_subcategory: product.second_subcategory_id
      ? secondSubcategoryMap.get(product.second_subcategory_id) ?? null
      : null
  }));
}

async function runWithTimeout<T>(task: (signal: AbortSignal) => Promise<T>, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await task(controller.signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Supabase connection timed out. Check internet access, Supabase project status, and .env values.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchCatalogData(accessToken?: string | null): Promise<CatalogData> {
  if (!supabase) {
    return demoCatalog;
  }

  const payload = await runWithTimeout(async (signal) => {
    const response = await fetch("/api/catalog", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      signal
    });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error ?? "Unable to load catalog.");
    }

    return body as {
      categories: MainCategory[];
      brands: Brand[];
      subcategories: Subcategory[];
      secondSubcategories?: SecondSubcategory[];
      products: Product[];
      schemaWarning?: string;
    };
  });

  const categories = payload.categories ?? [];
  const brands = payload.brands ?? [];
  const subcategories = payload.subcategories ?? [];
  const secondSubcategories = payload.secondSubcategories ?? [];
  const products = hydrateProducts(payload.products ?? [], categories, brands, subcategories, secondSubcategories);

  return {
    categories,
    brands,
    subcategories,
    secondSubcategories,
    products,
    schemaWarning: payload.schemaWarning
  };
}
