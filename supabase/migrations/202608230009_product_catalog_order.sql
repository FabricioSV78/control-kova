-- Orden manual de productos en el catálogo público.

alter table public.products
  add column sort_order integer;

with ranked as (
  select id, row_number() over (partition by business_id order by created_at desc) - 1 as position
  from public.products
)
update public.products as product
set sort_order = ranked.position
from ranked
where product.id = ranked.id;

alter table public.products
  alter column sort_order set default 0,
  alter column sort_order set not null;

create index products_catalog_order_idx
on public.products(business_id, status, sort_order, created_at desc);

-- Cambiar solamente la posición no debe llenar el historial con falsas ediciones.
create or replace function public.log_product_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_id uuid := auth.uid();
begin
  if user_id is null then return new; end if;
  if tg_op = 'UPDATE'
    and (to_jsonb(new) - 'sort_order' - 'updated_at') = (to_jsonb(old) - 'sort_order' - 'updated_at') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    insert into public.activity_log (
      business_id, entity_type, action, entity_id, title, description, created_by
    ) values (new.business_id, 'product', 'created', new.id, 'Producto creado', new.name, user_id);
  elsif old.status = 'active' and new.status = 'inactive' then
    insert into public.activity_log (
      business_id, entity_type, action, entity_id, title, description, created_by
    ) values (new.business_id, 'product', 'deactivated', new.id, 'Producto desactivado', new.name, user_id);
  else
    insert into public.activity_log (
      business_id, entity_type, action, entity_id, title, description, created_by
    ) values (new.business_id, 'product', 'updated', new.id, 'Producto actualizado', new.name, user_id);
  end if;
  return new;
end;
$$;

create or replace function public.reorder_products(
  p_business_id uuid,
  p_product_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_business_member(p_business_id) then
    raise exception using errcode = '42501', message = 'No perteneces a este negocio.';
  end if;
  if coalesce(cardinality(p_product_ids), 0) = 0 then return; end if;
  if (select count(distinct id) from unnest(p_product_ids) as ids(id)) <> cardinality(p_product_ids) then
    raise exception using errcode = '22023', message = 'El orden contiene productos repetidos.';
  end if;
  if exists (
    select 1
    from unnest(p_product_ids) as ids(id)
    left join public.products product on product.id = ids.id
    where product.id is null or product.business_id <> p_business_id
  ) then
    raise exception using errcode = '22023', message = 'El orden contiene un producto inválido.';
  end if;

  update public.products as product
  set sort_order = (ordered.position - 1)::integer
  from unnest(p_product_ids) with ordinality as ordered(id, position)
  where product.id = ordered.id
    and product.business_id = p_business_id;
end;
$$;

revoke all on function public.reorder_products(uuid, uuid[]) from public;
grant execute on function public.reorder_products(uuid, uuid[]) to authenticated;

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
          'sort_order', p.sort_order,
          'created_at', p.created_at,
          'updated_at', p.updated_at
        ) order by p.sort_order, p.created_at desc
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

comment on column public.products.sort_order is
'Posición manual del producto en KOVA Control y el catálogo público.';
