export type UserRole = "public" | "salesman" | "admin";

export type FilterSelection =
  | { type: "all" }
  | { type: "main"; id: string }
  | { type: "brand"; id: string }
  | { type: "sub"; id: string }
  | { type: "second_sub"; id: string };

export type Availability = "In Stock" | "Limited" | "On Order" | "Unavailable";

export type MainCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
};

export type Brand = {
  id: string;
  main_category_id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
};

export type Subcategory = {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
};

export type SecondSubcategory = {
  id: string;
  subcategory_id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
};

export type Product = {
  id: string;
  main_category_id: string;
  brand_id: string;
  subcategory_id: string;
  second_subcategory_id: string | null;
  name: string;
  slug: string;
  sku: string | null;
  description: string;
  highlights: string[];
  image_urls: string[];
  video_urls: string[];
  mrp_price: number;
  offered_price: number | null;
  pack_size: string | null;
  availability: Availability;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductWithRelations = Product & {
  main_category: MainCategory | null;
  brand: Brand | null;
  subcategory: Subcategory | null;
  second_subcategory: SecondSubcategory | null;
};

export type CatalogData = {
  categories: MainCategory[];
  brands: Brand[];
  subcategories: Subcategory[];
  secondSubcategories: SecondSubcategory[];
  products: ProductWithRelations[];
  schemaWarning?: string;
};
