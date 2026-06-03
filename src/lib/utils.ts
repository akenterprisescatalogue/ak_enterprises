import type { CatalogData, FilterSelection, ProductWithRelations } from "@/lib/types";

export function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0
  }).format(value);
}

export function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function splitTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function filterProducts(
  products: ProductWithRelations[],
  selected: FilterSelection
) {
  if (selected.type === "all") return products;

  return products.filter((product) => {
    if (selected.type === "main") return product.main_category_id === selected.id;
    if (selected.type === "brand") return product.brand_id === selected.id;
    if (selected.type === "sub") return product.subcategory_id === selected.id;
    return product.second_subcategory_id === selected.id;
  });
}

export function searchProducts(products: ProductWithRelations[], query: string) {
  const terms = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) return products;

  return products.filter((product) => {
    const searchableText = [
      product.name,
      product.slug,
      product.sku,
      product.description,
      product.pack_size,
      product.availability,
      product.main_category?.name,
      product.main_category?.description,
      product.brand?.name,
      product.brand?.description,
      product.subcategory?.name,
      product.subcategory?.description,
      product.second_subcategory?.name,
      product.second_subcategory?.description,
      ...product.highlights,
      ...product.tags
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return terms.every((term) => searchableText.includes(term));
  });
}

export function getSelectionTitle(data: CatalogData, selected: FilterSelection) {
  if (selected.type === "all") return "All Products";
  if (selected.type === "main") {
    return data.categories.find((category) => category.id === selected.id)?.name ?? "Category";
  }
  if (selected.type === "brand") {
    return data.brands.find((brand) => brand.id === selected.id)?.name ?? "Brand";
  }
  if (selected.type === "second_sub") {
    return data.secondSubcategories.find((subcategory) => subcategory.id === selected.id)?.name ?? "Second Subcategory";
  }

  return data.subcategories.find((subcategory) => subcategory.id === selected.id)?.name ?? "Subcategory";
}

export function buildGroupedProducts(data: CatalogData, products: ProductWithRelations[]) {
  return data.categories
    .map((category) => {
      const brands = data.brands
        .filter((brand) => brand.main_category_id === category.id)
        .map((brand) => {
          const subcategories = data.subcategories
            .filter((subcategory) => subcategory.brand_id === brand.id)
            .map((subcategory) => {
              const secondSubcategories = data.secondSubcategories
                .filter((secondSubcategory) => secondSubcategory.subcategory_id === subcategory.id)
                .map((secondSubcategory) => ({
                  secondSubcategory,
                  products: products.filter((product) => product.second_subcategory_id === secondSubcategory.id)
                }))
                .filter((group) => group.products.length > 0);
              const uncategorizedProducts = products.filter(
                (product) => product.subcategory_id === subcategory.id && !product.second_subcategory_id
              );

              return { subcategory, secondSubcategories, products: uncategorizedProducts };
            })
            .filter((group) => group.products.length > 0 || group.secondSubcategories.length > 0);

          return { brand, subcategories };
        })
        .filter((group) => group.subcategories.length > 0);

      return { category, brands };
    })
    .filter((group) => group.brands.length > 0);
}
