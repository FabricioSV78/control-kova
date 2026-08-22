-- KOVA Control — autorización, RLS y operaciones atómicas.

create or replace function public.is_business_member(target_business_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = target_business_id
      and bm.profile_id = target_user_id
  );
$$;

create or replace function public.has_business_role(
  target_business_id uuid,
  allowed_roles public.member_role[],
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = target_business_id
      and bm.profile_id = target_user_id
      and bm.role = any(allowed_roles)
  );
$$;

revoke all on function public.is_business_member(uuid, uuid) from public;
revoke all on function public.has_business_role(uuid, public.member_role[], uuid) from public;
grant execute on function public.is_business_member(uuid, uuid) to authenticated;
grant execute on function public.has_business_role(uuid, public.member_role[], uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.expense_categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_contributions enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.activity_log enable row level security;
alter table public.settings enable row level security;
alter table public.import_batches enable row level security;

-- Un perfil puede verse a sí mismo y a los integrantes de cualquiera de sus negocios.
create policy profiles_select_peers on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.business_members mine
    join public.business_members peer on peer.business_id = mine.business_id
    where mine.profile_id = auth.uid() and peer.profile_id = profiles.id
  )
);

create policy profiles_update_self on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Todo acceso a datos de negocio exige membresía comprobada en PostgreSQL.
create policy businesses_select_members on public.businesses
for select to authenticated using (public.is_business_member(id));
create policy businesses_update_admins on public.businesses
for update to authenticated
using (public.has_business_role(id, array['owner', 'admin']::public.member_role[]))
with check (public.has_business_role(id, array['owner', 'admin']::public.member_role[]));

create policy business_members_select_members on public.business_members
for select to authenticated using (public.is_business_member(business_id));
create policy business_members_insert_admins on public.business_members
for insert to authenticated
with check (public.has_business_role(business_id, array['owner', 'admin']::public.member_role[]));
create policy business_members_update_admins on public.business_members
for update to authenticated
using (public.has_business_role(business_id, array['owner', 'admin']::public.member_role[]))
with check (public.has_business_role(business_id, array['owner', 'admin']::public.member_role[]));
create policy business_members_delete_admins on public.business_members
for delete to authenticated
using (
  profile_id <> auth.uid()
  and public.has_business_role(business_id, array['owner', 'admin']::public.member_role[])
);

create policy expense_categories_select_members on public.expense_categories
for select to authenticated using (public.is_business_member(business_id));
create policy expense_categories_insert_members on public.expense_categories
for insert to authenticated with check (public.is_business_member(business_id) and created_by = auth.uid());
create policy expense_categories_update_members on public.expense_categories
for update to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

create policy payment_methods_select_members on public.payment_methods
for select to authenticated using (public.is_business_member(business_id));
create policy payment_methods_insert_members on public.payment_methods
for insert to authenticated with check (public.is_business_member(business_id) and created_by = auth.uid());
create policy payment_methods_update_members on public.payment_methods
for update to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

create policy products_select_members on public.products
for select to authenticated using (public.is_business_member(business_id));
create policy products_insert_members on public.products
for insert to authenticated with check (public.is_business_member(business_id) and created_by = auth.uid());
create policy products_update_members on public.products
for update to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

-- Estas tablas se escriben exclusivamente mediante RPC transaccionales.
create policy sales_select_members on public.sales
for select to authenticated using (public.is_business_member(business_id));
create policy sale_items_select_members on public.sale_items
for select to authenticated using (public.is_business_member(business_id));
create policy expenses_select_members on public.expenses
for select to authenticated using (public.is_business_member(business_id));
create policy expense_contributions_select_members on public.expense_contributions
for select to authenticated using (public.is_business_member(business_id));
create policy inventory_movements_select_members on public.inventory_movements
for select to authenticated using (public.is_business_member(business_id));
create policy activity_log_select_members on public.activity_log
for select to authenticated using (public.is_business_member(business_id));

create policy settings_select_members on public.settings
for select to authenticated using (public.is_business_member(business_id));
create policy settings_update_admins on public.settings
for update to authenticated
using (public.has_business_role(business_id, array['owner', 'admin']::public.member_role[]))
with check (public.has_business_role(business_id, array['owner', 'admin']::public.member_role[]));

create policy import_batches_select_members on public.import_batches
for select to authenticated using (public.is_business_member(business_id));
create policy import_batches_insert_members on public.import_batches
for insert to authenticated with check (public.is_business_member(business_id) and created_by = auth.uid());

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

  insert into public.settings (business_id, created_by) values (new_business_id, user_id);

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
  item_quantity numeric(12,3);
  item_price numeric(12,2);
  sale_total numeric(12,2) := 0;
  negative_stock_allowed boolean;
begin
  if user_id is null or not public.is_business_member(p_business_id, user_id) then
    raise exception using errcode = '42501', message = 'No tienes acceso a este negocio.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = '22023', message = 'La venta debe incluir al menos un producto.';
  end if;

  select allow_negative_stock into negative_stock_allowed
  from public.settings where business_id = p_business_id;
  negative_stock_allowed := coalesce(negative_stock_allowed, false);
  perform set_config('kova.inventory_operation', 'true', true);

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
    item_quantity := (item ->> 'quantity')::numeric;
    item_price := (item ->> 'unit_price')::numeric;
    if item_quantity <= 0 or item_price < 0 then
      raise exception using errcode = '22023', message = 'Cantidad y precio del producto no son válidos.';
    end if;

    select * into product_row from public.products
    where id = (item ->> 'product_id')::uuid and business_id = p_business_id
    for update;
    if not found or product_row.status <> 'active' then
      raise exception using errcode = '22023', message = 'Uno de los productos no existe o está inactivo.';
    end if;
    if not negative_stock_allowed and product_row.stock < item_quantity then
      raise exception using errcode = '22023', message = format('Stock insuficiente para %s.', product_row.name);
    end if;

    update public.products set stock = stock - item_quantity where id = product_row.id;
    insert into public.sale_items (
      business_id, sale_id, product_id, product_name, quantity, unit_price, unit_cost
    ) values (
      p_business_id, new_sale_id, product_row.id, product_row.name,
      item_quantity, item_price, product_row.estimated_cost
    );
    sale_total := sale_total + round(item_quantity * item_price, 2);

    insert into public.inventory_movements (
      business_id, product_id, movement_type, quantity_delta, stock_after,
      reference_type, reference_id, notes, occurred_at, created_by
    ) values (
      p_business_id, product_row.id, 'Venta', -item_quantity, product_row.stock - item_quantity,
      'sale', new_sale_id, format('Venta #%s', lpad(next_number::text, 4, '0')), p_sold_at, user_id
    );
  end loop;

  update public.sales set total = sale_total where id = new_sale_id;
  insert into public.activity_log (
    business_id, entity_type, action, entity_id, title, description, amount, created_by
  ) values (
    p_business_id, 'sale', 'created', new_sale_id,
    format('Venta #%s registrada', lpad(next_number::text, 4, '0')),
    'Venta registrada correctamente.', sale_total, user_id
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
  old_item record;
  item jsonb;
  product_row public.products%rowtype;
  item_quantity numeric(12,3);
  item_price numeric(12,2);
  sale_total numeric(12,2) := 0;
  negative_stock_allowed boolean;
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

  select coalesce(allow_negative_stock, false) into negative_stock_allowed
  from public.settings where business_id = sale_row.business_id;
  negative_stock_allowed := coalesce(negative_stock_allowed, false);
  perform set_config('kova.inventory_operation', 'true', true);

  for old_item in select * from public.sale_items where sale_id = p_sale_id
  loop
    update public.products set stock = stock + old_item.quantity where id = old_item.product_id;
    insert into public.inventory_movements (
      business_id, product_id, movement_type, quantity_delta, stock_after,
      reference_type, reference_id, notes, occurred_at, created_by
    )
    select sale_row.business_id, p.id, 'Anulación de venta', old_item.quantity, p.stock,
      'sale', p_sale_id, 'Reversión temporal por edición de venta', now(), user_id
    from public.products p where p.id = old_item.product_id;
  end loop;
  delete from public.sale_items where sale_id = p_sale_id;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item ->> 'quantity')::numeric;
    item_price := (item ->> 'unit_price')::numeric;
    if item_quantity <= 0 or item_price < 0 then
      raise exception using errcode = '22023', message = 'Cantidad y precio del producto no son válidos.';
    end if;
    select * into product_row from public.products
    where id = (item ->> 'product_id')::uuid and business_id = sale_row.business_id
    for update;
    if not found or product_row.status <> 'active' then
      raise exception using errcode = '22023', message = 'Uno de los productos no existe o está inactivo.';
    end if;
    if not negative_stock_allowed and product_row.stock < item_quantity then
      raise exception using errcode = '22023', message = format('Stock insuficiente para %s.', product_row.name);
    end if;

    update public.products set stock = stock - item_quantity where id = product_row.id;
    insert into public.sale_items (
      business_id, sale_id, product_id, product_name, quantity, unit_price, unit_cost
    ) values (
      sale_row.business_id, p_sale_id, product_row.id, product_row.name,
      item_quantity, item_price, product_row.estimated_cost
    );
    sale_total := sale_total + round(item_quantity * item_price, 2);
    insert into public.inventory_movements (
      business_id, product_id, movement_type, quantity_delta, stock_after,
      reference_type, reference_id, notes, occurred_at, created_by
    ) values (
      sale_row.business_id, product_row.id, 'Venta', -item_quantity, product_row.stock - item_quantity,
      'sale', p_sale_id, 'Stock aplicado tras editar venta', p_sold_at, user_id
    );
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
    'Los datos y el inventario de la venta fueron actualizados.', sale_total, user_id
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
  item_row record;
begin
  select * into sale_row from public.sales where id = p_sale_id for update;
  if not found or sale_row.status <> 'active' then
    raise exception using errcode = '22023', message = 'La venta no existe o ya fue anulada.';
  end if;
  if user_id is null or not public.is_business_member(sale_row.business_id, user_id) then
    raise exception using errcode = '42501', message = 'No tienes acceso a esta venta.';
  end if;
  perform set_config('kova.inventory_operation', 'true', true);
  for item_row in select * from public.sale_items where sale_id = p_sale_id
  loop
    update public.products set stock = stock + item_row.quantity where id = item_row.product_id;
    insert into public.inventory_movements (
      business_id, product_id, movement_type, quantity_delta, stock_after,
      reference_type, reference_id, notes, created_by
    )
    select sale_row.business_id, p.id, 'Anulación de venta', item_row.quantity, p.stock,
      'sale', p_sale_id, 'Stock restituido por anulación de venta', user_id
    from public.products p where p.id = item_row.product_id;
  end loop;
  update public.sales set status = 'voided', voided_at = now(), voided_by = user_id where id = p_sale_id;
  insert into public.activity_log (
    business_id, entity_type, action, entity_id, title, description, amount, created_by
  ) values (
    sale_row.business_id, 'sale', 'voided', p_sale_id,
    format('Venta #%s anulada', lpad(sale_row.sale_number::text, 4, '0')),
    'La venta fue anulada y el stock fue restituido.', sale_row.total, user_id
  );
end;
$$;

create or replace function public.write_expense_contributions(
  target_expense_id uuid,
  target_business_id uuid,
  target_paid_by public.expense_payer,
  target_total numeric,
  target_contributions jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  contribution jsonb;
  contribution_total numeric(12,2) := 0;
begin
  if target_paid_by in ('Fabricio', 'Daniela') then
    insert into public.expense_contributions (business_id, expense_id, partner, amount)
    values (target_business_id, target_expense_id, target_paid_by::text::public.partner_name, target_total);
  elsif target_paid_by = 'Compartido' then
    if target_contributions is null or jsonb_typeof(target_contributions) <> 'array'
      or jsonb_array_length(target_contributions) <> 2 then
      raise exception using errcode = '22023', message = 'Un gasto compartido requiere los aportes de Fabricio y Daniela.';
    end if;
    for contribution in select value from jsonb_array_elements(target_contributions)
    loop
      if (contribution ->> 'amount')::numeric < 0 then
        raise exception using errcode = '22023', message = 'Los aportes compartidos no pueden ser negativos.';
      end if;
      insert into public.expense_contributions (business_id, expense_id, partner, amount)
      values (
        target_business_id,
        target_expense_id,
        (contribution ->> 'partner')::public.partner_name,
        (contribution ->> 'amount')::numeric
      );
      contribution_total := contribution_total + (contribution ->> 'amount')::numeric;
    end loop;
    if round(contribution_total, 2) <> round(target_total, 2) then
      raise exception using errcode = '22023',
        message = format('El aporte de Fabricio y Daniela debe sumar S/ %s.', to_char(target_total, 'FM999999990.00'));
    end if;
  end if;
end;
$$;

create or replace function public.create_expense(
  p_business_id uuid,
  p_spent_at timestamptz,
  p_category_id uuid,
  p_category_name text,
  p_concept text,
  p_quantity numeric,
  p_unit_price numeric,
  p_paid_by public.expense_payer,
  p_notes text,
  p_contributions jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  user_id uuid := auth.uid();
  new_expense_id uuid;
  expense_total numeric(12,2);
begin
  if user_id is null or not public.is_business_member(p_business_id, user_id) then
    raise exception using errcode = '42501', message = 'No tienes acceso a este negocio.';
  end if;
  if p_quantity <= 0 or p_unit_price < 0 then
    raise exception using errcode = '22023', message = 'Cantidad y precio del gasto no son válidos.';
  end if;
  if length(trim(p_concept)) < 2 then
    raise exception using errcode = '22023', message = 'Escribe el concepto del gasto.';
  end if;
  expense_total := round(p_quantity * p_unit_price, 2);
  insert into public.expenses (
    business_id, spent_at, category_id, category_name, concept,
    quantity, unit_price, paid_by, notes, created_by
  ) values (
    p_business_id, p_spent_at, p_category_id, trim(p_category_name), trim(p_concept),
    p_quantity, p_unit_price, p_paid_by, nullif(trim(p_notes), ''), user_id
  ) returning id into new_expense_id;

  perform public.write_expense_contributions(
    new_expense_id, p_business_id, p_paid_by, expense_total, p_contributions
  );
  insert into public.activity_log (
    business_id, entity_type, action, entity_id, title, description, amount, created_by
  ) values (
    p_business_id, 'expense', 'created', new_expense_id,
    'Gasto registrado', format('%s · Pagado por %s', trim(p_concept), p_paid_by),
    expense_total, user_id
  );
  return new_expense_id;
end;
$$;

create or replace function public.update_expense(
  p_expense_id uuid,
  p_spent_at timestamptz,
  p_category_id uuid,
  p_category_name text,
  p_concept text,
  p_quantity numeric,
  p_unit_price numeric,
  p_paid_by public.expense_payer,
  p_notes text,
  p_contributions jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  user_id uuid := auth.uid();
  expense_row public.expenses%rowtype;
  expense_total numeric(12,2);
begin
  select * into expense_row from public.expenses where id = p_expense_id for update;
  if not found or expense_row.status <> 'active' then
    raise exception using errcode = '22023', message = 'El gasto no existe o ya fue anulado.';
  end if;
  if user_id is null or not public.is_business_member(expense_row.business_id, user_id) then
    raise exception using errcode = '42501', message = 'No tienes acceso a este gasto.';
  end if;
  if p_quantity <= 0 or p_unit_price < 0 or length(trim(p_concept)) < 2 then
    raise exception using errcode = '22023', message = 'Revisa la cantidad, el precio y el concepto.';
  end if;
  expense_total := round(p_quantity * p_unit_price, 2);
  delete from public.expense_contributions where expense_id = p_expense_id;
  update public.expenses set
    spent_at = p_spent_at, category_id = p_category_id, category_name = trim(p_category_name),
    concept = trim(p_concept), quantity = p_quantity, unit_price = p_unit_price,
    paid_by = p_paid_by, notes = nullif(trim(p_notes), '')
  where id = p_expense_id;
  perform public.write_expense_contributions(
    p_expense_id, expense_row.business_id, p_paid_by, expense_total, p_contributions
  );
  insert into public.activity_log (
    business_id, entity_type, action, entity_id, title, description, amount, created_by
  ) values (
    expense_row.business_id, 'expense', 'updated', p_expense_id,
    'Gasto actualizado', trim(p_concept), expense_total, user_id
  );
  return p_expense_id;
end;
$$;

create or replace function public.void_expense(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  user_id uuid := auth.uid();
  expense_row public.expenses%rowtype;
begin
  select * into expense_row from public.expenses where id = p_expense_id for update;
  if not found or expense_row.status <> 'active' then
    raise exception using errcode = '22023', message = 'El gasto no existe o ya fue anulado.';
  end if;
  if user_id is null or not public.is_business_member(expense_row.business_id, user_id) then
    raise exception using errcode = '42501', message = 'No tienes acceso a este gasto.';
  end if;
  update public.expenses set status = 'voided', voided_at = now(), voided_by = user_id
  where id = p_expense_id;
  insert into public.activity_log (
    business_id, entity_type, action, entity_id, title, description, amount, created_by
  ) values (
    expense_row.business_id, 'expense', 'voided', p_expense_id,
    'Gasto anulado', expense_row.concept, expense_row.total, user_id
  );
end;
$$;

create or replace function public.record_inventory_movement(
  p_business_id uuid,
  p_product_id uuid,
  p_movement_type public.inventory_movement_type,
  p_quantity_delta numeric,
  p_notes text,
  p_occurred_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  user_id uuid := auth.uid();
  product_row public.products%rowtype;
  new_stock numeric(12,3);
  movement_id uuid;
  negative_stock_allowed boolean;
begin
  if user_id is null or not public.is_business_member(p_business_id, user_id) then
    raise exception using errcode = '42501', message = 'No tienes acceso a este negocio.';
  end if;
  if p_quantity_delta = 0 or p_movement_type in ('Venta', 'Anulación de venta') then
    raise exception using errcode = '22023', message = 'El movimiento de inventario no es válido.';
  end if;
  if p_movement_type in ('Entrada', 'Devolución') and p_quantity_delta < 0 then
    raise exception using errcode = '22023', message = 'Una entrada o devolución debe aumentar el stock.';
  end if;
  if p_movement_type = 'Pérdida' and p_quantity_delta > 0 then
    raise exception using errcode = '22023', message = 'Una pérdida debe disminuir el stock.';
  end if;
  select * into product_row from public.products
  where id = p_product_id and business_id = p_business_id for update;
  if not found then
    raise exception using errcode = '22023', message = 'El producto no existe.';
  end if;
  select coalesce(allow_negative_stock, false) into negative_stock_allowed
  from public.settings where business_id = p_business_id;
  negative_stock_allowed := coalesce(negative_stock_allowed, false);
  perform set_config('kova.inventory_operation', 'true', true);
  new_stock := product_row.stock + p_quantity_delta;
  if not negative_stock_allowed and new_stock < 0 then
    raise exception using errcode = '22023', message = 'El movimiento dejaría el stock en negativo.';
  end if;
  update public.products set stock = new_stock where id = p_product_id;
  insert into public.inventory_movements (
    business_id, product_id, movement_type, quantity_delta, stock_after,
    notes, occurred_at, created_by
  ) values (
    p_business_id, p_product_id, p_movement_type, p_quantity_delta, new_stock,
    nullif(trim(p_notes), ''), p_occurred_at, user_id
  ) returning id into movement_id;
  insert into public.activity_log (
    business_id, entity_type, action, entity_id, title, description, metadata, created_by
  ) values (
    p_business_id, 'inventory', 'created', movement_id,
    'Movimiento de inventario', format('%s · %s', product_row.name, p_movement_type),
    jsonb_build_object('quantity_delta', p_quantity_delta, 'stock_after', new_stock), user_id
  );
  return movement_id;
end;
$$;

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
    and (to_jsonb(new) - 'stock' - 'updated_at') = (to_jsonb(old) - 'stock' - 'updated_at') then
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

create or replace function public.guard_product_stock_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  negative_stock_allowed boolean := false;
begin
  if tg_op = 'UPDATE' and new.stock is distinct from old.stock
    and coalesce(current_setting('kova.inventory_operation', true), '') <> 'true' then
    raise exception using errcode = '42501',
      message = 'Modifica el stock mediante un movimiento de inventario.';
  end if;
  select coalesce(allow_negative_stock, false) into negative_stock_allowed
  from public.settings where business_id = new.business_id;
  if new.stock < 0 and not coalesce(negative_stock_allowed, false) then
    raise exception using errcode = '22023', message = 'El stock no puede quedar en negativo.';
  end if;
  return new;
end;
$$;

create trigger products_guard_stock
before insert or update of stock on public.products
for each row execute function public.guard_product_stock_change();

create trigger products_activity_log
after insert or update on public.products
for each row execute function public.log_product_change();

create or replace function public.protect_product_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from public.sale_items where product_id = old.id) then
    raise exception using errcode = '23503', message = 'Este producto tiene ventas asociadas; desactívalo en lugar de eliminarlo.';
  end if;
  return old;
end;
$$;

create trigger products_protect_delete
before delete on public.products
for each row execute function public.protect_product_delete();

revoke all on function public.create_business_workspace(text, text) from public;
revoke all on function public.create_sale(uuid, timestamptz, uuid, text, text, text, jsonb) from public;
revoke all on function public.update_sale(uuid, timestamptz, uuid, text, text, text, jsonb) from public;
revoke all on function public.void_sale(uuid) from public;
revoke all on function public.write_expense_contributions(uuid, uuid, public.expense_payer, numeric, jsonb) from public;
revoke all on function public.create_expense(uuid, timestamptz, uuid, text, text, numeric, numeric, public.expense_payer, text, jsonb) from public;
revoke all on function public.update_expense(uuid, timestamptz, uuid, text, text, numeric, numeric, public.expense_payer, text, jsonb) from public;
revoke all on function public.void_expense(uuid) from public;
revoke all on function public.record_inventory_movement(uuid, uuid, public.inventory_movement_type, numeric, text, timestamptz) from public;

grant execute on function public.create_business_workspace(text, text) to authenticated;
grant execute on function public.create_sale(uuid, timestamptz, uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.update_sale(uuid, timestamptz, uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.void_sale(uuid) to authenticated;
grant execute on function public.create_expense(uuid, timestamptz, uuid, text, text, numeric, numeric, public.expense_payer, text, jsonb) to authenticated;
grant execute on function public.update_expense(uuid, timestamptz, uuid, text, text, numeric, numeric, public.expense_payer, text, jsonb) to authenticated;
grant execute on function public.void_expense(uuid) to authenticated;
grant execute on function public.record_inventory_movement(uuid, uuid, public.inventory_movement_type, numeric, text, timestamptz) to authenticated;

comment on policy sales_select_members on public.sales is
'Un usuario autenticado solo puede leer ventas de workspaces donde business_members contiene su auth.uid().';
comment on policy products_update_members on public.products is
'Los integrantes de KOVA pueden mantener el catálogo; business_id no puede apuntar a un workspace ajeno.';
comment on policy settings_update_admins on public.settings is
'Solo owner/admin puede permitir stock negativo u otras opciones sensibles.';
comment on function public.create_sale is
'Crea cabecera e ítems, valida stock, descuenta inventario y audita en una única transacción.';
comment on function public.create_expense is
'Registra un único egreso y separa quién lo financió sin duplicar el gasto.';
