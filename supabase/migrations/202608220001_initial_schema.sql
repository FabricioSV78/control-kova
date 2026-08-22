-- KOVA Control — esquema inicial multi-negocio.
-- El dinero se almacena como NUMERIC; nunca como float ni texto.

create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'admin', 'member');
create type public.product_status as enum ('active', 'inactive');
create type public.record_status as enum ('active', 'voided');
create type public.expense_payer as enum ('Fabricio', 'Daniela', 'Negocio', 'Compartido');
create type public.partner_name as enum ('Fabricio', 'Daniela');
create type public.inventory_movement_type as enum (
  'Entrada', 'Ajuste', 'Pérdida', 'Devolución', 'Venta', 'Anulación de venta'
);
create type public.activity_entity_type as enum ('sale', 'expense', 'inventory', 'product', 'import', 'settings');
create type public.activity_action as enum ('created', 'updated', 'voided', 'deactivated', 'imported');
create type public.import_type as enum ('sales', 'expenses');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 2 and 100),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  currency char(3) not null default 'PEN' check (currency = 'PEN'),
  timezone text not null default 'America/Lima',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  display_name text not null check (length(trim(display_name)) between 2 and 100),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  primary key (business_id, profile_id)
);

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 80),
  color text not null default '#737373' check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 80),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 150),
  sku text,
  category text not null default 'Pulseras' check (length(trim(category)) between 2 and 80),
  sale_price numeric(12,2) not null check (sale_price >= 0),
  estimated_cost numeric(12,2) not null default 0 check (estimated_cost >= 0),
  stock numeric(12,3) not null default 0,
  minimum_stock numeric(12,3) not null default 0 check (minimum_stock >= 0),
  status public.product_status not null default 'active',
  image_url text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (business_id, sku)
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sale_number bigint not null check (sale_number > 0),
  sold_at timestamptz not null,
  payment_method_id uuid references public.payment_methods(id) on delete restrict,
  payment_method_name text not null check (length(trim(payment_method_name)) between 2 and 80),
  customer_name text,
  notes text,
  total numeric(12,2) not null check (total >= 0),
  status public.record_status not null default 'active',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id),
  unique (business_id, sale_number)
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  line_total numeric(12,2) generated always as (round(quantity * unit_price, 2)) stored,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  spent_at timestamptz not null,
  category_id uuid references public.expense_categories(id) on delete restrict,
  category_name text not null check (length(trim(category_name)) between 2 and 80),
  concept text not null check (length(trim(concept)) between 2 and 180),
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total numeric(12,2) generated always as (round(quantity * unit_price, 2)) stored,
  paid_by public.expense_payer not null,
  notes text,
  status public.record_status not null default 'active',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id)
);

-- Las contribuciones describen quién financió el gasto; no son egresos adicionales.
create table public.expense_contributions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  expense_id uuid not null references public.expenses(id) on delete cascade,
  partner public.partner_name not null,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (expense_id, partner)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  quantity_delta numeric(12,3) not null check (quantity_delta <> 0),
  stock_after numeric(12,3) not null,
  reference_type text,
  reference_id uuid,
  notes text,
  occurred_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  entity_type public.activity_entity_type not null,
  action public.activity_action not null,
  entity_id uuid not null,
  title text not null,
  description text not null,
  amount numeric(12,2),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  allow_negative_stock boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  import_type public.import_type not null,
  file_name text not null,
  file_hash text not null check (length(file_hash) >= 32),
  row_count integer not null check (row_count > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (business_id, import_type, file_hash)
);

create index business_members_profile_idx on public.business_members(profile_id, business_id);
create index products_business_status_idx on public.products(business_id, status, name);
create index sales_business_date_idx on public.sales(business_id, sold_at desc) where status = 'active';
create index sale_items_sale_idx on public.sale_items(sale_id);
create index sale_items_product_idx on public.sale_items(business_id, product_id);
create index expenses_business_date_idx on public.expenses(business_id, spent_at desc) where status = 'active';
create index expenses_category_idx on public.expenses(business_id, category_id, spent_at desc);
create index expense_contributions_partner_idx on public.expense_contributions(business_id, partner);
create index inventory_movements_product_idx on public.inventory_movements(business_id, product_id, occurred_at desc);
create index activity_log_business_date_idx on public.activity_log(business_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger businesses_updated_at before update on public.businesses
for each row execute function public.set_updated_at();
create trigger expense_categories_updated_at before update on public.expense_categories
for each row execute function public.set_updated_at();
create trigger payment_methods_updated_at before update on public.payment_methods
for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger sales_updated_at before update on public.sales
for each row execute function public.set_updated_at();
create trigger expenses_updated_at before update on public.expenses
for each row execute function public.set_updated_at();
create trigger settings_updated_at before update on public.settings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

comment on table public.expense_contributions is
'Detalle de financiación del gasto. Sus importes nunca se suman a egresos; el egreso vive una sola vez en expenses.';
comment on column public.sale_items.product_name is 'Nombre histórico del producto al momento de la venta.';
comment on column public.sales.status is 'Las anulaciones conservan auditoría y restituyen stock; no se borran ventas físicamente.';
