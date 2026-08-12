-- Shared operating/tracking layer for TIKLADOY + BURGERMY.
create table if not exists public.ops_tasks (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.sellers(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'operation' check (category in ('operation','stock','quality','delivery','finance','support','marketing','maintenance')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','done','cancelled')),
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ops_incidents (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.sellers(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  type text not null check (type in ('customer','delivery','payment','product','quality','system','other')),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  title text not null,
  details text,
  status text not null default 'open' check (status in ('open','investigating','resolved','closed')),
  resolved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ops_stock_items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  name text not null,
  unit text not null default 'adet',
  current_qty numeric not null default 0,
  minimum_qty numeric not null default 0,
  target_qty numeric not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (seller_id, branch_id, name)
);

create table if not exists public.ops_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null default current_date,
  seller_id uuid references public.sellers(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  orders_count integer not null default 0,
  delivered_count integer not null default 0,
  cancelled_count integer not null default 0,
  gross_revenue numeric not null default 0,
  avg_order_value numeric not null default 0,
  avg_delivery_minutes numeric,
  open_incidents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (metric_date, seller_id, branch_id)
);

create index if not exists ops_tasks_status_due_idx on public.ops_tasks(status,due_at);
create index if not exists ops_tasks_seller_branch_idx on public.ops_tasks(seller_id,branch_id);
create index if not exists ops_incidents_status_idx on public.ops_incidents(status,severity);
create index if not exists ops_incidents_seller_branch_idx on public.ops_incidents(seller_id,branch_id);
create index if not exists ops_stock_low_idx on public.ops_stock_items(seller_id,branch_id,current_qty,minimum_qty);
create index if not exists ops_daily_metrics_date_idx on public.ops_daily_metrics(metric_date desc,seller_id,branch_id);

alter table public.ops_tasks enable row level security;
alter table public.ops_incidents enable row level security;
alter table public.ops_stock_items enable row level security;
alter table public.ops_daily_metrics enable row level security;

create policy "ops members read tasks" on public.ops_tasks for select to authenticated using (
  seller_id is null or exists(select 1 from public.seller_members sm where sm.seller_id=ops_tasks.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true)
);
create policy "ops managers manage tasks" on public.ops_tasks for all to authenticated using (
  seller_id is null or exists(select 1 from public.seller_members sm where sm.seller_id=ops_tasks.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager'))
) with check (
  seller_id is null or exists(select 1 from public.seller_members sm where sm.seller_id=ops_tasks.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager'))
);

create policy "ops members read incidents" on public.ops_incidents for select to authenticated using (
  seller_id is null or exists(select 1 from public.seller_members sm where sm.seller_id=ops_incidents.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true)
);
create policy "ops managers manage incidents" on public.ops_incidents for all to authenticated using (
  seller_id is null or exists(select 1 from public.seller_members sm where sm.seller_id=ops_incidents.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager'))
) with check (
  seller_id is null or exists(select 1 from public.seller_members sm where sm.seller_id=ops_incidents.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager'))
);

create policy "ops members read stock" on public.ops_stock_items for select to authenticated using (
  exists(select 1 from public.seller_members sm where sm.seller_id=ops_stock_items.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true)
);
create policy "ops managers manage stock" on public.ops_stock_items for all to authenticated using (
  exists(select 1 from public.seller_members sm where sm.seller_id=ops_stock_items.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager'))
) with check (
  exists(select 1 from public.seller_members sm where sm.seller_id=ops_stock_items.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true and sm.role in ('owner','manager'))
);

create policy "ops members read daily metrics" on public.ops_daily_metrics for select to authenticated using (
  seller_id is null or exists(select 1 from public.seller_members sm where sm.seller_id=ops_daily_metrics.seller_id and sm.user_id=(select auth.uid()) and sm.is_active=true)
);
