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
