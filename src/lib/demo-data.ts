import type { CatalogData } from "@/lib/types";

const now = new Date().toISOString();

export const demoCatalog: CatalogData = {
  categories: [
    {
      id: "cat-surgical",
      name: "Surgical Products",
      slug: "surgical-products",
      description: "Surgical instruments, sterile disposables, and operating room essentials.",
      sort_order: 1
    },
    {
      id: "cat-pharma",
      name: "Pharma Products",
      slug: "pharma-products",
      description: "Medicines, supplements, and pharmacy supply catalog items.",
      sort_order: 2
    }
  ],
  brands: [
    {
      id: "brand-ak-medline",
      main_category_id: "cat-surgical",
      name: "AK Medline",
      slug: "ak-medline",
      description: "Professional surgical supply range.",
      sort_order: 1
    },
    {
      id: "brand-careplus",
      main_category_id: "cat-surgical",
      name: "CarePlus",
      slug: "careplus",
      description: "Clinical disposable essentials.",
      sort_order: 2
    },
    {
      id: "brand-vitalis",
      main_category_id: "cat-pharma",
      name: "Vitalis Pharma",
      slug: "vitalis-pharma",
      description: "High movement pharmacy products.",
      sort_order: 1
    }
  ],
  subcategories: [
    {
      id: "sub-instruments",
      brand_id: "brand-ak-medline",
      name: "Instruments",
      slug: "instruments",
      description: "Reusable surgical instruments.",
      sort_order: 1
    },
    {
      id: "sub-disposables",
      brand_id: "brand-careplus",
      name: "Disposables",
      slug: "disposables",
      description: "Single use sterile supplies.",
      sort_order: 1
    },
    {
      id: "sub-tablets",
      brand_id: "brand-vitalis",
      name: "Tablets",
      slug: "tablets",
      description: "Tablet and capsule products.",
      sort_order: 1
    }
  ],
  secondSubcategories: [
    {
      id: "second-needle-holders",
      subcategory_id: "sub-instruments",
      name: "Needle Holders",
      slug: "needle-holders",
      description: "Precision gripping instruments for suturing.",
      sort_order: 1
    },
    {
      id: "second-surgical-gloves",
      subcategory_id: "sub-disposables",
      name: "Surgical Gloves",
      slug: "surgical-gloves",
      description: "Sterile procedure gloves and disposable hand protection.",
      sort_order: 1
    },
    {
      id: "second-supplements",
      subcategory_id: "sub-tablets",
      name: "Supplements",
      slug: "supplements",
      description: "Daily supplement tablets and capsules.",
      sort_order: 1
    }
  ],
  products: [
    {
      id: "prod-needle-holder",
      main_category_id: "cat-surgical",
      brand_id: "brand-ak-medline",
      subcategory_id: "sub-instruments",
      second_subcategory_id: "second-needle-holders",
      name: "Mayo Hegar Needle Holder",
      slug: "mayo-hegar-needle-holder",
      sku: "AK-SRG-110",
      description:
        "A stainless steel needle holder designed for controlled grip, smooth ratchet movement, and daily procedure room reliability.",
      highlights: ["German stainless steel finish", "Serrated jaws for secure grip", "Autoclavable reusable build"],
      image_urls: [
        "https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=1200&q=80"
      ],
      video_urls: [],
      mrp_price: 6200,
      offered_price: 5450,
      pack_size: "1 instrument",
      availability: "In Stock" as const,
      tags: ["instrument", "surgical", "stainless"],
      is_active: true,
      created_at: now,
      updated_at: now,
      main_category: null,
      brand: null,
      subcategory: null,
      second_subcategory: null
    },
    {
      id: "prod-sterile-gloves",
      main_category_id: "cat-surgical",
      brand_id: "brand-careplus",
      subcategory_id: "sub-disposables",
      second_subcategory_id: "second-surgical-gloves",
      name: "Sterile Latex Surgical Gloves",
      slug: "sterile-latex-surgical-gloves",
      sku: "CP-DSP-210",
      description:
        "Powder-free sterile latex gloves with precise fit and textured fingertips for procedure confidence.",
      highlights: ["Powder-free sterile pair", "Textured fingertips", "Multiple sizes supported"],
      image_urls: [
        "https://images.unsplash.com/photo-1583947581924-a6d3d94d944f?auto=format&fit=crop&w=1200&q=80"
      ],
      video_urls: [],
      mrp_price: 1900,
      offered_price: 1650,
      pack_size: "Box of 50 pairs",
      availability: "Limited" as const,
      tags: ["gloves", "disposable", "sterile"],
      is_active: true,
      created_at: now,
      updated_at: now,
      main_category: null,
      brand: null,
      subcategory: null,
      second_subcategory: null
    },
    {
      id: "prod-calcium-d3",
      main_category_id: "cat-pharma",
      brand_id: "brand-vitalis",
      subcategory_id: "sub-tablets",
      second_subcategory_id: "second-supplements",
      name: "Calcium + D3 Tablets",
      slug: "calcium-d3-tablets",
      sku: "VP-TAB-302",
      description:
        "Daily calcium and vitamin D3 support tablet range for pharmacy counters and clinic dispensing.",
      highlights: ["Blister packed tablets", "Fast moving pharmacy item", "Clear dosage panel on packaging"],
      image_urls: [
        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80"
      ],
      video_urls: [],
      mrp_price: 860,
      offered_price: 740,
      pack_size: "30 tablets",
      availability: "In Stock" as const,
      tags: ["pharma", "tablets", "supplement"],
      is_active: true,
      created_at: now,
      updated_at: now,
      main_category: null,
      brand: null,
      subcategory: null,
      second_subcategory: null
    }
  ].map((product) => {
    const main_category = product.main_category_id === "cat-surgical"
      ? {
          id: "cat-surgical",
          name: "Surgical Products",
          slug: "surgical-products",
          description: "Surgical instruments, sterile disposables, and operating room essentials.",
          sort_order: 1
        }
      : {
          id: "cat-pharma",
          name: "Pharma Products",
          slug: "pharma-products",
          description: "Medicines, supplements, and pharmacy supply catalog items.",
          sort_order: 2
        };
    const brand =
      product.brand_id === "brand-ak-medline"
        ? {
            id: "brand-ak-medline",
            main_category_id: "cat-surgical",
            name: "AK Medline",
            slug: "ak-medline",
            description: "Professional surgical supply range.",
            sort_order: 1
          }
        : product.brand_id === "brand-careplus"
          ? {
              id: "brand-careplus",
              main_category_id: "cat-surgical",
              name: "CarePlus",
              slug: "careplus",
              description: "Clinical disposable essentials.",
              sort_order: 2
            }
          : {
              id: "brand-vitalis",
              main_category_id: "cat-pharma",
              name: "Vitalis Pharma",
              slug: "vitalis-pharma",
              description: "High movement pharmacy products.",
              sort_order: 1
            };
    const subcategory =
      product.subcategory_id === "sub-instruments"
        ? {
            id: "sub-instruments",
            brand_id: "brand-ak-medline",
            name: "Instruments",
            slug: "instruments",
            description: "Reusable surgical instruments.",
            sort_order: 1
          }
        : product.subcategory_id === "sub-disposables"
          ? {
              id: "sub-disposables",
              brand_id: "brand-careplus",
              name: "Disposables",
              slug: "disposables",
              description: "Single use sterile supplies.",
              sort_order: 1
            }
          : {
              id: "sub-tablets",
              brand_id: "brand-vitalis",
              name: "Tablets",
              slug: "tablets",
              description: "Tablet and capsule products.",
              sort_order: 1
            };
    const second_subcategory =
      product.second_subcategory_id === "second-needle-holders"
        ? {
            id: "second-needle-holders",
            subcategory_id: "sub-instruments",
            name: "Needle Holders",
            slug: "needle-holders",
            description: "Precision gripping instruments for suturing.",
            sort_order: 1
          }
        : product.second_subcategory_id === "second-surgical-gloves"
          ? {
              id: "second-surgical-gloves",
              subcategory_id: "sub-disposables",
              name: "Surgical Gloves",
              slug: "surgical-gloves",
              description: "Sterile procedure gloves and disposable hand protection.",
              sort_order: 1
            }
          : {
              id: "second-supplements",
              subcategory_id: "sub-tablets",
              name: "Supplements",
              slug: "supplements",
              description: "Daily supplement tablets and capsules.",
              sort_order: 1
            };

    return { ...product, main_category, brand, subcategory, second_subcategory };
  })
};
