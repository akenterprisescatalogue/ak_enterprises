create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum ('salesman', 'admin');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role public.user_role not null default 'salesman',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.main_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  main_category_id uuid not null references public.main_categories(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (main_category_id, slug)
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create table if not exists public.second_subcategories (
  id uuid primary key default gen_random_uuid(),
  subcategory_id uuid not null references public.subcategories(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subcategory_id, slug)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  main_category_id uuid not null references public.main_categories(id) on delete restrict,
  brand_id uuid not null references public.brands(id) on delete restrict,
  subcategory_id uuid not null references public.subcategories(id) on delete restrict,
  second_subcategory_id uuid references public.second_subcategories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  sku text,
  description text not null default '',
  highlights text[] not null default '{}',
  image_urls text[] not null default '{}',
  video_urls text[] not null default '{}',
  mrp_price numeric(12, 2) not null check (mrp_price >= 0),
  offered_price numeric(12, 2) check (offered_price is null or offered_price >= 0),
  pack_size text,
  availability text not null default 'In Stock' check (availability in ('In Stock', 'Limited', 'On Order', 'Unavailable')),
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
add column if not exists second_subcategory_id uuid references public.second_subcategories(id) on delete restrict;

create index if not exists brands_main_category_id_idx on public.brands(main_category_id);
create index if not exists subcategories_brand_id_idx on public.subcategories(brand_id);
create index if not exists second_subcategories_subcategory_id_idx on public.second_subcategories(subcategory_id);
create index if not exists products_main_category_id_idx on public.products(main_category_id);
create index if not exists products_brand_id_idx on public.products(brand_id);
create index if not exists products_subcategory_id_idx on public.products(subcategory_id);
create index if not exists products_second_subcategory_id_idx on public.products(second_subcategory_id);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.validate_product_hierarchy()
returns trigger
language plpgsql
as $$
declare
  brand_category_id uuid;
  subcategory_brand_id uuid;
  second_subcategory_parent_id uuid;
begin
  select main_category_id into brand_category_id from public.brands where id = new.brand_id;
  select brand_id into subcategory_brand_id from public.subcategories where id = new.subcategory_id;
  select subcategory_id
  into second_subcategory_parent_id
  from public.second_subcategories
  where id = new.second_subcategory_id;

  if brand_category_id is null or brand_category_id <> new.main_category_id then
    raise exception 'Brand does not belong to selected main category';
  end if;

  if subcategory_brand_id is null or subcategory_brand_id <> new.brand_id then
    raise exception 'Subcategory does not belong to selected brand';
  end if;

  if new.second_subcategory_id is not null
    and (second_subcategory_parent_id is null or second_subcategory_parent_id <> new.subcategory_id) then
    raise exception 'Second subcategory does not belong to selected subcategory';
  end if;

  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_main_categories_updated_at on public.main_categories;
create trigger set_main_categories_updated_at
before update on public.main_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_brands_updated_at on public.brands;
create trigger set_brands_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

drop trigger if exists set_subcategories_updated_at on public.subcategories;
create trigger set_subcategories_updated_at
before update on public.subcategories
for each row execute function public.set_updated_at();

drop trigger if exists set_second_subcategories_updated_at on public.second_subcategories;
create trigger set_second_subcategories_updated_at
before update on public.second_subcategories
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists validate_products_hierarchy on public.products;
create trigger validate_products_hierarchy
before insert or update on public.products
for each row execute function public.validate_product_hierarchy();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.main_categories enable row level security;
alter table public.brands enable row level security;
alter table public.subcategories enable row level security;
alter table public.second_subcategories enable row level security;
alter table public.products enable row level security;

drop policy if exists "Profiles readable by owner or admin" on public.profiles;
create policy "Profiles readable by owner or admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public read main categories" on public.main_categories;
create policy "Public read main categories"
on public.main_categories
for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage main categories" on public.main_categories;
create policy "Admins manage main categories"
on public.main_categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public read brands" on public.brands;
create policy "Public read brands"
on public.brands
for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage brands" on public.brands;
create policy "Admins manage brands"
on public.brands
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public read subcategories" on public.subcategories;
create policy "Public read subcategories"
on public.subcategories
for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage subcategories" on public.subcategories;
create policy "Admins manage subcategories"
on public.subcategories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public read second subcategories" on public.second_subcategories;
create policy "Public read second subcategories"
on public.second_subcategories
for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage second subcategories" on public.second_subcategories;
create policy "Admins manage second subcategories"
on public.second_subcategories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

revoke all on public.products from anon, authenticated;
grant select on public.main_categories, public.brands, public.subcategories, public.second_subcategories to anon, authenticated;
grant insert, update, delete on public.main_categories, public.brands, public.subcategories, public.second_subcategories to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop view if exists public.catalog_products;
create view public.catalog_products as
select
  p.id,
  p.main_category_id,
  p.brand_id,
  p.subcategory_id,
  p.second_subcategory_id,
  p.name,
  p.slug,
  p.sku,
  p.description,
  p.highlights,
  p.image_urls,
  p.video_urls,
  p.mrp_price,
  case
    when public.current_user_role() in ('salesman', 'admin') then p.offered_price
    else null
  end as offered_price,
  p.pack_size,
  p.availability,
  p.tags,
  p.is_active,
  p.created_at,
  p.updated_at
from public.products p
where p.is_active = true or public.is_admin();

grant select on public.catalog_products to anon, authenticated;

insert into public.main_categories (name, slug, description, sort_order)
values
  ('Surgical Products', 'surgical-products', 'Surgical instruments, sterile disposables, and operating room essentials.', 1),
  ('Pharma Products', 'pharma-products', 'Medicines, supplements, and pharmacy supply catalog items.', 2)
on conflict (slug) do nothing;

-- After creating the first user in Supabase Auth, promote them with:
-- update public.profiles set role = 'admin' where email = 'admin@example.com';
