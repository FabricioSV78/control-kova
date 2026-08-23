-- Catálogo público KOVA, contacto comercial y galería de hasta cuatro imágenes.

alter table public.businesses
  add column whatsapp_number text
  constraint businesses_whatsapp_number_check
  check (whatsapp_number is null or whatsapp_number ~ '^[1-9][0-9]{8,14}$');

alter table public.products
  add column description text
  constraint products_description_length_check
  check (description is null or length(description) <= 600);

alter table public.products
  add constraint products_business_id_id_key unique (business_id, id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  product_id uuid not null,
  image_url text not null,
  storage_path text,
  sort_order smallint not null check (sort_order between 0 and 3),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (product_id, sort_order),
  foreign key (business_id, product_id)
    references public.products(business_id, id) on delete cascade
);

create index product_images_product_idx
on public.product_images(product_id, sort_order);

-- Conserva la imagen única usada por versiones anteriores del panel.
insert into public.product_images (
  business_id, product_id, image_url, storage_path, sort_order, created_by
)
select business_id, id, image_url, null, 0, created_by
from public.products
where image_url is not null and trim(image_url) <> '';

alter table public.product_images enable row level security;

create policy product_images_select_members on public.product_images
for select to authenticated
using (public.is_business_member(business_id));

create policy product_images_insert_members on public.product_images
for insert to authenticated
with check (
  public.is_business_member(business_id)
  and created_by = auth.uid()
);

create policy product_images_update_members on public.product_images
for update to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

create policy product_images_delete_members on public.product_images
for delete to authenticated
using (public.is_business_member(business_id));

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_storage_insert_members on storage.objects
for insert to authenticated
with check (
  bucket_id = 'product-images'
  and public.is_business_member(((storage.foldername(name))[1])::uuid)
);

create policy product_images_storage_delete_members on storage.objects
for delete to authenticated
using (
  bucket_id = 'product-images'
  and public.is_business_member(((storage.foldername(name))[1])::uuid)
);

-- El catálogo nunca da acceso anónimo directo a products: esa tabla también
-- contiene el costo estimado. Esta RPC devuelve solo los campos comerciales.
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
          'category', p.category,
          'sale_price', p.sale_price,
          'created_at', p.created_at,
          'updated_at', p.updated_at,
          'images', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', pi.id,
                'url', pi.image_url,
                'sort_order', pi.sort_order
              ) order by pi.sort_order
            )
            from public.product_images pi
            where pi.product_id = p.id
              and pi.business_id = p.business_id
          ), '[]'::jsonb)
        ) order by p.created_at desc
      )
      from public.products p
      where p.business_id = b.id
        and p.status = 'active'
    ), '[]'::jsonb)
  )
  from public.businesses b
  where b.slug = lower(trim(p_slug));
$$;

revoke all on function public.get_public_catalog(text) from public;
grant execute on function public.get_public_catalog(text) to anon, authenticated;

comment on table public.product_images is
'Galería pública de productos KOVA. Cada producto admite como máximo cuatro posiciones.';
comment on column public.businesses.whatsapp_number is
'Número internacional de WhatsApp, solo dígitos, usado por el catálogo público.';
comment on function public.get_public_catalog(text) is
'Devuelve únicamente la información comercial publicable; nunca expone costos internos.';
