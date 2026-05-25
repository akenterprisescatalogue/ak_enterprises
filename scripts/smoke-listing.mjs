import { readFile } from "node:fs/promises";

const appUrl = process.argv[2] ?? "http://localhost:3000";

function parseEnv(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [
          line.slice(0, index).trim(),
          line
            .slice(index + 1)
            .trim()
            .replace(/^['"]|['"]$/g, "")
        ];
      })
  );
}

const env = parseEnv(await readFile(".env", "utf8"));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

const baseHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json"
};

async function rest(path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...baseHeaders,
      ...(options.headers ?? {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (body?.code === "PGRST205" && JSON.stringify(body).includes("second_subcategories")) {
      throw new Error(
        "Supabase is missing public.second_subcategories. Run supabase/migrations/2026-05-25-second-subcategories-and-storage.sql in the Supabase SQL Editor, then rerun this smoke test."
      );
    }

    throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const categories = await rest("main_categories?select=*&order=sort_order.asc");
const targetCategory =
  categories.find((category) => category.slug === "pharma-products") ??
  categories.find((category) => category.slug === "surgical-products") ??
  categories[0];

assert(targetCategory, "No main category found.");

const stamp = Date.now();
const brandSlug = `codex-smoke-brand-${stamp}`;
const subcategorySlug = `codex-smoke-subcategory-${stamp}`;
const secondSubcategorySlug = `codex-smoke-second-subcategory-${stamp}`;
const productSlug = `codex-smoke-product-${stamp}`;
const created = {};

try {
  const [brand] = await rest("brands", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      main_category_id: targetCategory.id,
      name: "Codex Smoke Brand",
      slug: brandSlug,
      sort_order: 999
    })
  });
  created.brand = brand;

  const [subcategory] = await rest("subcategories", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      brand_id: brand.id,
      name: "Codex Smoke Subcategory",
      slug: subcategorySlug,
      sort_order: 999
    })
  });
  created.subcategory = subcategory;

  const [secondSubcategory] = await rest("second_subcategories", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      subcategory_id: subcategory.id,
      name: "Codex Smoke Second Subcategory",
      slug: secondSubcategorySlug,
      sort_order: 999
    })
  });
  created.secondSubcategory = secondSubcategory;

  const [product] = await rest("products", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      main_category_id: targetCategory.id,
      brand_id: brand.id,
      subcategory_id: subcategory.id,
      second_subcategory_id: secondSubcategory.id,
      name: "Codex Smoke Product",
      slug: productSlug,
      sku: "CODEX-SMOKE",
      description: "Temporary smoke test product created by Codex and removed after verification.",
      highlights: ["Hierarchy test", "Listing visibility test"],
      image_urls: [
        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80"
      ],
      video_urls: [],
      mrp_price: 1234,
      offered_price: 999,
      pack_size: "1 test unit",
      availability: "In Stock",
      tags: ["codex-smoke"],
      is_active: true
    })
  });
  created.product = product;

  const catalogResponse = await fetch(`${appUrl}/api/catalog`);
  const catalog = await catalogResponse.json();
  assert(catalogResponse.ok, catalog.error ?? "Catalog API failed.");

  const foundBrand = catalog.brands.find(
    (item) => item.slug === brandSlug && item.main_category_id === targetCategory.id
  );
  const foundSubcategory = catalog.subcategories.find(
    (item) => item.slug === subcategorySlug && item.brand_id === brand.id
  );
  const foundSecondSubcategory = catalog.secondSubcategories.find(
    (item) => item.slug === secondSubcategorySlug && item.subcategory_id === subcategory.id
  );
  const foundProduct = catalog.products.find((item) => item.slug === productSlug);
  const detailResponse = await fetch(`${appUrl}/products/${productSlug}`);

  assert(foundBrand, "Brand did not appear in catalog API.");
  assert(foundSubcategory, "Subcategory did not appear in catalog API.");
  assert(foundSecondSubcategory, "Second subcategory did not appear in catalog API.");
  assert(foundProduct, "Product did not appear in catalog API.");
  assert(foundProduct.main_category_id === targetCategory.id, "Product category mismatch.");
  assert(foundProduct.brand_id === brand.id, "Product brand mismatch.");
  assert(foundProduct.subcategory_id === subcategory.id, "Product subcategory mismatch.");
  assert(foundProduct.second_subcategory_id === secondSubcategory.id, "Product second subcategory mismatch.");
  assert(detailResponse.ok, "Product detail route did not respond.");

  console.log(
    JSON.stringify(
      {
        ok: true,
        category: targetCategory.name,
        brand: brand.name,
        subcategory: subcategory.name,
        secondSubcategory: secondSubcategory.name,
        product: product.name,
        productSlug,
        detailStatus: detailResponse.status
      },
      null,
      2
    )
  );
} finally {
  if (created.product?.id) {
    await rest(`products?id=eq.${created.product.id}`, { method: "DELETE" });
  }
  if (created.secondSubcategory?.id) {
    await rest(`second_subcategories?id=eq.${created.secondSubcategory.id}`, { method: "DELETE" });
  }
  if (created.subcategory?.id) {
    await rest(`subcategories?id=eq.${created.subcategory.id}`, { method: "DELETE" });
  }
  if (created.brand?.id) {
    await rest(`brands?id=eq.${created.brand.id}`, { method: "DELETE" });
  }
}
