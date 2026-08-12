-- ORYVEX FOOD OPS phase 2 modules for TIKLADOY + BURGERMY.
create table if not exists public.ops_shifts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role text not null default 'staff',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check(status in ('scheduled','active','completed','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ops_couriers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  phone text,
  vehicle_type text not null default 'motorcycle' check(vehicle_type in ('motorcycle','car','bicycle','walking','other')),
  status text not null default 'offline' check(status in ('offline','available','busy','break')),
  active_order_id uuid references public.orders(id) on delete set null,
  last_seen_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ops_suppliers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  tax_no text,
  payment_terms_days integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(seller_id,name)
);

create table if not exists public.ops_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  supplier_id uuid references public.ops_suppliers(id) on delete set null,
  po_no text not null,
  status text not null default 'draft' check(status in ('draft','sent','approved','partially_received','received','cancelled')),
  total_amount numeric not null default 0,
  expected_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(seller_id,po_no)
);

create table if not exists public.ops_cash_entries (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  entry_date date not null default current_date,
  type text not null check(type in ('income','expense')),
  category text not null default 'other',
  amount numeric not null check(amount >= 0),
  description text,
  reference text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ops_support_tickets (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.sellers(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  customer_user_id uuid references auth.users(id) on delete set null,
  channel text not null default 'app' check(channel in ('app','phone','whatsapp','email','social','other')),
  subject text not null,
  details text,
  priority text not null default 'medium' check(priority in ('low','medium','high','critical')),
  status text not null default 'open' check(status in ('open','waiting_customer','in_progress','resolved','closed')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ops_campaigns (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.sellers(id) on delete cascade,
  name text not null,
  channel text not null default 'app' check(channel in ('app','push','sms','whatsapp','email','social','all')),
  starts_at timestamptz,
  ends_at timestamptz,
  budget numeric not null default 0,
  status text not null default 'draft' check(status in ('draft','scheduled','active','paused','completed','cancelled')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ops_shifts_seller_start_idx on public.ops_shifts(seller_id,starts_at);
create index if not exists ops_couriers_status_idx on public.ops_couriers(seller_id,branch_id,status);
create index if not exists ops_purchase_orders_status_idx on public.ops_purchase_orders(seller_id,status,created_at desc);
create index if not exists ops_cash_entries_date_idx on public.ops_cash_entries(seller_id,entry_date desc);
create index if not exists ops_support_tickets_status_idx on public.ops_support_tickets(seller_id,status,priority);
create index if not exists ops_campaigns_status_idx on public.ops_campaigns(seller_id,status,starts_at);

alter table public.ops_shifts enable row level security;
alter table public.ops_couriers enable row level security;
alter table public.ops_suppliers enable row level security;
alter table public.ops_purchase_orders enable row level security;
alter table public.ops_cash_entries enable row level security;
alter table public.ops_support_tickets enable row level security;
alter table public.ops_campaigns enable row level security;

-- Shared membership-based read policies.
create policy "ops members read shifts" on public.ops_shifts for select to authenticated using (exists(select 1 from public.seller_members sm where sm.seller_id=ops_shifts.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true));
create policy "ops members read couriers" on public.ops_couriers for select to authenticated using (exists(select 1 from public.seller_members sm where sm.seller_id=ops_couriers.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true));
create policy "ops members read suppliers" on public.ops_suppliers for select to authenticated using (exists(select 1 from public.seller_members sm where sm.seller_id=ops_suppliers.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true));
create policy "ops members read purchase orders" on public.ops_purchase_orders for select to authenticated using (exists(select 1 from public.seller_members sm where sm.seller_id=ops_purchase_orders.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true));
create policy "ops members read cash" on public.ops_cash_entries for select to authenticated using (exists(select 1 from public.seller_members sm where sm.seller_id=ops_cash_entries.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true));
create policy "ops members read support" on public.ops_support_tickets for select to authenticated using (ops_support_tickets.seller_id is null or exists(select 1 from public.seller_members sm where sm.seller_id=ops_support_tickets.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true));
create policy "ops members read campaigns" on public.ops_campaigns for select to authenticated using (ops_campaigns.seller_id is null or exists(select 1 from public.seller_members sm where sm.seller_id=ops_campaigns.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true));

-- Owner/manager write policies.
create policy "ops managers manage shifts" on public.ops_shifts for all to authenticated using (exists(select 1 from public.seller_members sm where sm.seller_id=ops_shifts.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager'))) with check (exists(select 1 from public.seller_members sm where sm.seller_id=ops_shifts.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager')));
create policy "ops managers manage couriers" on public.ops_couriers for all to authenticated using (exists(select 1 from public.seller_members sm where sm.seller_id=ops_couriers.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager'))) with check (exists(select 1 from public.seller_members sm where sm.seller_id=ops_couriers.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager')));
create policy "ops managers manage suppliers" on public.ops_suppliers for all to authenticated using (exists(select 1 from public.seller_members sm where sm.seller_id=ops_suppliers.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager'))) with check (exists(select 1 from public.seller_members sm where sm.seller_id=ops_suppliers.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager')));
create policy "ops managers manage purchase orders" on public.ops_purchase_orders for all to authenticated using (exists(select 1 from public.seller_members sm where sm.seller_id=ops_purchase_orders.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager'))) with check (exists(select 1 from public.seller_members sm where sm.seller_id=ops_purchase_orders.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager')));
create policy "ops managers manage cash" on public.ops_cash_entries for all to authenticated using (exists(select 1 from public.seller_members sm where sm.seller_id=ops_cash_entries.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager'))) with check (exists(select 1 from public.seller_members sm where sm.seller_id=ops_cash_entries.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager')));
create policy "ops managers manage support" on public.ops_support_tickets for all to authenticated using (ops_support_tickets.seller_id is null or exists(select 1 from public.seller_members sm where sm.seller_id=ops_support_tickets.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager'))) with check (ops_support_tickets.seller_id is null or exists(select 1 from public.seller_members sm where sm.seller_id=ops_support_tickets.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager')));
create policy "ops managers manage campaigns" on public.ops_campaigns for all to authenticated using (ops_campaigns.seller_id is null or exists(select 1 from public.seller_members sm where sm.seller_id=ops_campaigns.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager'))) with check (ops_campaigns.seller_id is null or exists(select 1 from public.seller_members sm where sm.seller_id=ops_campaigns.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager')));
