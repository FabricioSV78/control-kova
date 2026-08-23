-- Galería pública de pedidos enviados o entregados, administrada desde KOVA Control.

create table public.delivery_showcase (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null check (length(trim(title)) between 3 and 120),
  image_url text not null,
  storage_path text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index delivery_showcase_business_created_idx
on public.delivery_showcase(business_id, created_at desc);

create trigger delivery_showcase_updated_at
before update on public.delivery_showcase
for each row execute function public.set_updated_at();

alter table public.delivery_showcase enable row level security;

create policy delivery_showcase_select_members on public.delivery_showcase
for select to authenticated
using (public.is_business_member(business_id));

create policy delivery_showcase_insert_members on public.delivery_showcase
for insert to authenticated
with check (
  public.is_business_member(business_id)
  and created_by = auth.uid()
);

create policy delivery_showcase_update_members on public.delivery_showcase
for update to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

create policy delivery_showcase_delete_members on public.delivery_showcase
for delete to authenticated
using (public.is_business_member(business_id));

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'delivery-images',
  'delivery-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy delivery_images_storage_insert_members on storage.objects
for insert to authenticated
with check (
  bucket_id = 'delivery-images'
  and public.is_business_member(((storage.foldername(name))[1])::uuid)
);

create policy delivery_images_storage_delete_members on storage.objects
for delete to authenticated
using (
  bucket_id = 'delivery-images'
  and public.is_business_member(((storage.foldername(name))[1])::uuid)
);

create or replace function public.get_public_catalog(p_slug text default 'kova')
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'business', jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'slug', b.slug,
      'whatsapp_number', b.whatsapp_number
    ),
    'products', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'description', p.description,
          'sku', p.sku,
          'category', p.category,
          'sale_price', p.sale_price,
          'created_at', p.created_at,
          'updated_at', p.updated_at
        ) order by p.created_at desc
      )
      from public.products p
      where p.business_id = b.id
        and p.status = 'active'
    ), '[]'::jsonb),
    'deliveries', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', delivery.id,
          'title', delivery.title,
          'image_url', delivery.image_url,
          'created_at', delivery.created_at
        ) order by delivery.created_at desc
      )
      from (
        select item.id, item.title, item.image_url, item.created_at
        from public.delivery_showcase item
        where item.business_id = b.id
        order by item.created_at desc
        limit 100
      ) delivery
    ), '[]'::jsonb)
  )
  from public.businesses b
  where b.slug = lower(trim(p_slug));
$$;

revoke all on function public.get_public_catalog(text) from public;
grant execute on function public.get_public_catalog(text) to anon, authenticated;

comment on table public.delivery_showcase is
'Fotos verticales de pedidos enviados o entregados que se muestran en el catálogo público.';
