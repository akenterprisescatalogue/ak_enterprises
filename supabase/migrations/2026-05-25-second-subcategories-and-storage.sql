create extension if not exists pgcrypto;

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

alter table public.products
add column if not exists second_subcategory_id uuid references public.second_subcategories(id) on delete restrict;

create index if not exists second_subcategories_subcategory_id_idx on public.second_subcategories(subcategory_id);
create index if not exists products_second_subcategory_id_idx on public.products(second_subcategory_id);

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

drop trigger if exists set_second_subcategories_updated_at on public.second_subcategories;
create trigger set_second_subcategories_updated_at
before update on public.second_subcategories
for each row execute function public.set_updated_at();

drop trigger if exists validate_products_hierarchy on public.products;
create trigger validate_products_hierarchy
before insert or update on public.products
for each row execute function public.validate_product_hierarchy();

alter table public.second_subcategories enable row level security;

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

grant select on public.second_subcategories to anon, authenticated;
grant insert, update, delete on public.second_subcategories to authenticated;

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
