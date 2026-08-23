-- Amplía la galería pública para soportar crecimiento y carga progresiva en el cliente.

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

comment on function public.get_public_catalog(text) is
'Devuelve productos activos y hasta cien entregas recientes; el catálogo las revela en grupos de ocho.';
