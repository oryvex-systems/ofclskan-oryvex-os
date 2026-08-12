-- TIKLADOY production checkout fields shared by marketplace sellers.
alter table public.orders
  add column if not exists delivery_address text,
  add column if not exists customer_note text;

alter table public.order_items
  add column if not exists selected_options jsonb not null default '[]'::jsonb;

create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists orders_payment_status_idx on public.orders(payment_status, created_at desc);

-- Do not expose write access beyond existing RLS policies; these columns follow the table's current RLS.
