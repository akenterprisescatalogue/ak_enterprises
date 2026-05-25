# AK Enterprises Catalog Dashboard Plan

## Goal
Build a responsive Next.js + Supabase catalog dashboard for AK Enterprises with a white and blue visual system, role based access control, detailed product listings, and a mobile-first browsing experience.

## Core Roles
- Public visitor: can browse all visible products and see MRP price only.
- Salesman: can sign in, browse all products, and see both MRP price and offered price. Cannot create, edit, or delete catalog data.
- Admin: can sign in, browse all products, see both prices, create/edit/delete products, manage categories, manage brands, manage subcategories, and edit pricing.

## Catalog Architecture
- Main categories:
  - Surgical Products
  - Pharma Products
- Each main category contains brands.
- Each brand contains subcategories.
- Each subcategory contains products.
- Home/catalog filtering hierarchy:
  - All Products
  - Main Category
  - Brand
  - Subcategory
  - Product cards

## Product Listing Fields
- Product name
- Slug
- Main category
- Brand
- Subcategory
- Product media:
  - Image URLs
  - Video URLs
- Highlight features
- Description
- MRP price
- Offered price
- SKU/model number
- Pack size/unit
- Availability status
- Tags
- Created/updated timestamps

## Pages
- `/`: catalog home with logo header, left filtering menu, product grid, responsive mobile category drawer, and admin-only Add Listing button.
- `/products/[slug]`: detailed product page with gallery, videos, highlights, pricing visibility based on role, category path, and full description.
- `/admin/listings`: admin-only listing dashboard with product form and product management table.
- `/login`: Supabase auth login page with role-aware redirect.
- Admin access panel: admin-only salesman account creation using a protected server route.

## Admin Listing Experience
- Create/select main category.
- Create/select brand under the selected main category.
- Create/select subcategory under the selected brand.
- Create/edit/delete product listings.
- Edit MRP and offered price.
- Manage images/videos as URL lists.
- Manage highlights as repeatable text entries.

## Supabase Data Model
- `profiles`: stores user role linked to `auth.users`.
- `main_categories`: top level product categories.
- `brands`: brand records linked to main categories.
- `subcategories`: subcategory records linked to brands.
- `products`: product listing records linked to subcategories and brands.

## Supabase RBAC Rules
- Public read access for product hierarchy and MRP-facing product data.
- Salesman read access for offered price through authenticated role checks.
- Admin write access for all catalog tables.
- Admin delete access for products/categories/brands/subcategories.
- Admin can create salesman auth accounts through a server-only Supabase service role route.
- Role is resolved from `profiles.role`.

## Visual Direction
- Primary blue sampled from the provided image: `#0b4a86`.
- Clean white surfaces, soft blue background accents, glass/blur panels, rounded product cards, and professional dashboard spacing.
- Logo placed in the top header and login screen.
- Product cards show image, product name, MRP, and offered price only when the signed-in user is salesman/admin.
- Mobile-first layout with horizontal/slide-in navigation and compact product cards.

## Build Steps
1. Scaffold Next.js app structure and project config.
2. Add assets, theme CSS, Supabase clients, types, and seed/demo data fallback.
3. Build catalog home with hierarchical filtering.
4. Build product detail page.
5. Build Supabase auth and role helpers.
6. Build admin listing management UI.
7. Add Supabase SQL schema and RLS policies.
8. Verify build and responsive behavior.
