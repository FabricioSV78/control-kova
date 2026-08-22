-- KOVA elabora cada pulsera a pedido. Se retira el inventario de productos
-- terminados y se conserva la medida de muñeca en cada ítem de venta.

alter table public.sale_items
  add column wrist_measurement_cm numeric(5,2)
  constraint sale_items_wrist_measurement_check
  check (wrist_measurement_cm is null or wrist_measurement_cm between 5 and 50);

create or replace function public.create_business_workspace(workspace_name text, workspace_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  user_id uuid := auth.uid();
  new_business_id uuid;
begin
  if user_id is null then
    raise exception using errcode = '42501', message = 'Debes iniciar sesión.';
  end if;

  if not exists (select 1 from public.profiles where id = user_id) then
    raise exception using errcode = '23503', message = 'El perfil del usuario todavía no está disponible.';
  end if;

  insert into public.businesses (name, slug, created_by)
  values (trim(workspace_name), lower(trim(workspace_slug)), user_id)
  returning id into new_business_id;

  insert into public.business_members (business_id, profile_id, role, display_name, created_by)
  select new_business_id, user_id, 'owner', full_name, user_id
  from public.profiles where id = user_id;

  insert into public.expense_categories (business_id, name, color, sort_order, created_by) values
    (new_business_id, 'Materiales', '#525252', 10, user_id),
    (new_business_id, 'Packaging', '#78716c', 20, user_id),
    (new_business_id, 'Publicidad', '#404040', 30, user_id),
    (new_business_id, 'Envíos', '#a8a29e', 40, user_id),
    (new_business_id, 'Herramientas', '#737373', 50, user_id),
    (new_business_id, 'Impresión', '#57534e', 60, user_id),
    (new_business_id, 'Otros', '#d6d3d1', 70, user_id);

  insert into public.payment_methods (business_id, name, sort_order, created_by) values
    (new_business_id, 'Yape', 10, user_id),
    (new_business_id, 'Plin', 20, user_id),
    (new_business_id, 'Efectivo', 30, user_id),
    (new_business_id, 'Transferencia', 40, user_id),
    (new_business_id, 'Tarjeta', 50, user_id);

  return new_business_id;
end;
$$;

create or replace function public.create_sale(
  p_business_id uuid,
  p_sold_at timestamptz,
  p_payment_method_id uuid,
  p_payment_method_name text,
  p_customer_name text,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  user_id uuid := auth.uid();
  new_sale_id uuid;
  next_number bigint;
  item jsonb;
  product_row public.products%rowtype;
  item_measurement numeric(5,2);
  item_quantity numeric(12,3);
  item_price numeric(12,2);
  sale_total numeric(12,2) := 0;
begin
  if user_id is null or not public.is_business_member(p_business_id, user_id) then
    raise exception using errcode = '42501', message = 'No tienes acceso a este negocio.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = '22023', message = 'La venta debe incluir al menos un producto.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));
  select coalesce(max(sale_number), 0) + 1 into next_number
  from public.sales where business_id = p_business_id;

  insert into public.sales (
    business_id, sale_number, sold_at, payment_method_id, payment_method_name,
    customer_name, notes, total, created_by
  ) values (
    p_business_id, next_number, p_sold_at, p_payment_method_id, trim(p_payment_method_name),
    nullif(trim(p_customer_name), ''), nullif(trim(p_notes), ''), 0, user_id
  ) returning id into new_sale_id;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_measurement := nullif(item ->> 'wrist_measurement_cm', '')::numeric;
    item_quantity := (item ->> 'quantity')::numeric;
    item_price := (item ->> 'unit_price')::numeric;
    if item_measurement is null or item_measurement < 5 or item_measurement > 50 then
      raise exception using errcode = '22023', message = 'La medida de muñeca debe estar entre 5 y 50 cm.';
    end if;
    if item_quantity <= 0 or item_price < 0 then
      raise exception using errcode = '22023', message = 'Cantidad y precio del producto no son válidos.';
    end if;

    select * into product_row from public.products
    where id = (item ->> 'product_id')::uuid and business_id = p_business_id;
    if not found or product_row.status <> 'active' then
      raise exception using errcode = '22023', message = 'Uno de los productos no existe o está inactivo.';
    end if;

    insert into public.sale_items (
      business_id, sale_id, product_id, product_name, wrist_measurement_cm,
      quantity, unit_price, unit_cost
    ) values (
      p_business_id, new_sale_id, product_row.id, product_row.name, item_measurement,
      item_quantity, item_price, product_row.estimated_cost
    );
    sale_total := sale_total + round(item_quantity * item_price, 2);
  end loop;

  update public.sales set total = sale_total where id = new_sale_id;
  insert into public.activity_log (
    business_id, entity_type, action, entity_id, title, description, amount, created_by
  ) values (
    p_business_id, 'sale', 'created', new_sale_id,
    format('Venta #%s registrada', lpad(next_number::text, 4, '0')),
    'Pedido registrado con medida de muñeca.', sale_total, user_id
  );
  return new_sale_id;
end;
$$;

create or replace function public.update_sale(
  p_sale_id uuid,
  p_sold_at timestamptz,
  p_payment_method_id uuid,
  p_payment_method_name text,
  p_customer_name text,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  user_id uuid := auth.uid();
  sale_row public.sales%rowtype;
  item jsonb;
  product_row public.products%rowtype;
  item_measurement numeric(5,2);
  item_quantity numeric(12,3);
  item_price numeric(12,2);
  sale_total numeric(12,2) := 0;
begin
  select * into sale_row from public.sales where id = p_sale_id for update;
  if not found or sale_row.status <> 'active' then
    raise exception using errcode = '22023', message = 'La venta no existe o ya fue anulada.';
  end if;
  if user_id is null or not public.is_business_member(sale_row.business_id, user_id) then
    raise exception using errcode = '42501', message = 'No tienes acceso a esta venta.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = '22023', message = 'La venta debe incluir al menos un producto.';
  end if;

  delete from public.sale_items where sale_id = p_sale_id;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_measurement := nullif(item ->> 'wrist_measurement_cm', '')::numeric;
    item_quantity := (item ->> 'quantity')::numeric;
    item_price := (item ->> 'unit_price')::numeric;
    if item_measurement is null or item_measurement < 5 or item_measurement > 50 then
      raise exception using errcode = '22023', message = 'La medida de muñeca debe estar entre 5 y 50 cm.';
    end if;
    if item_quantity <= 0 or item_price < 0 then
      raise exception using errcode = '22023', message = 'Cantidad y precio del producto no son válidos.';
    end if;

    select * into product_row from public.products
    where id = (item ->> 'product_id')::uuid and business_id = sale_row.business_id;
    if not found or product_row.status <> 'active' then
      raise exception using errcode = '22023', message = 'Uno de los productos no existe o está inactivo.';
    end if;

    insert into public.sale_items (
      business_id, sale_id, product_id, product_name, wrist_measurement_cm,
      quantity, unit_price, unit_cost
    ) values (
      sale_row.business_id, p_sale_id, product_row.id, product_row.name, item_measurement,
      item_quantity, item_price, product_row.estimated_cost
    );
    sale_total := sale_total + round(item_quantity * item_price, 2);
  end loop;

  update public.sales set
    sold_at = p_sold_at,
    payment_method_id = p_payment_method_id,
    payment_method_name = trim(p_payment_method_name),
    customer_name = nullif(trim(p_customer_name), ''),
    notes = nullif(trim(p_notes), ''),
    total = sale_total
  where id = p_sale_id;

  insert into public.activity_log (
    business_id, entity_type, action, entity_id, title, description, amount, created_by
  ) values (
    sale_row.business_id, 'sale', 'updated', p_sale_id,
    format('Venta #%s actualizada', lpad(sale_row.sale_number::text, 4, '0')),
    'Los datos, modelos y medidas de la venta fueron actualizados.', sale_total, user_id
  );
  return p_sale_id;
end;
$$;

create or replace function public.void_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  user_id uuid := auth.uid();
  sale_row public.sales%rowtype;
begin
  select * into sale_row from public.sales where id = p_sale_id for update;
  if not found or sale_row.status <> 'active' then
    raise exception using errcode = '22023', message = 'La venta no existe o ya fue anulada.';
  end if;
  if user_id is null or not public.is_business_member(sale_row.business_id, user_id) then
    raise exception using errcode = '42501', message = 'No tienes acceso a esta venta.';
  end if;

  update public.sales
  set status = 'voided', voided_at = now(), voided_by = user_id
  where id = p_sale_id;

  insert into public.activity_log (
    business_id, entity_type, action, entity_id, title, description, amount, created_by
  ) values (
    sale_row.business_id, 'sale', 'voided', p_sale_id,
    format('Venta #%s anulada', lpad(sale_row.sale_number::text, 4, '0')),
    'La venta fue anulada.', sale_row.total, user_id
  );
end;
$$;

drop function if exists public.record_inventory_movement(
  uuid, uuid, public.inventory_movement_type, numeric, text, timestamptz
);
drop trigger if exists products_guard_stock on public.products;
drop function if exists public.guard_product_stock_change();

drop table public.inventory_movements;
drop table public.settings;

alter table public.products
  drop column stock,
  drop column minimum_stock;

drop type public.inventory_movement_type;

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

comment on function public.create_sale is
'Crea una venta bajo pedido y exige la medida de muñeca de cada pulsera en una única transacción.';
comment on column public.sale_items.wrist_measurement_cm is
'Medida de la muñeca del cliente en centímetros para elaborar la pulsera a pedido.';
