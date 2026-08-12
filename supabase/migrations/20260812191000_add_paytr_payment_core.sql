-- PayTR payment core for TIKLADOY / BURGERMY
create table if not exists public.payment_sessions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  merchant_oid text not null unique,
  provider text not null default 'paytr',
  amount numeric not null check (amount >= 0),
  currency text not null default 'TL',
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled')),
  iframe_token text,
  callback_payload jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_sessions_order_idx on public.payment_sessions(order_id);
create index if not exists payment_sessions_user_idx on public.payment_sessions(user_id);
create index if not exists payment_sessions_status_idx on public.payment_sessions(status);

alter table public.payment_sessions enable row level security;

create policy "users read own payment sessions"
on public.payment_sessions for select to authenticated
using ((select auth.uid()) = user_id);

grant select on public.payment_sessions to authenticated;
grant select, insert, update, delete on public.payment_sessions to service_role;

alter table public.orders
  add column if not exists payment_provider text,
  add column if not exists payment_reference text;
