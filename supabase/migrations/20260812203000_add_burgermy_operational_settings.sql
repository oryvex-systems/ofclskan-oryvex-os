-- BURGERMY operational switches, payment controls and legal-document registry.
create table if not exists public.seller_settings (
  seller_id uuid primary key references public.sellers(id) on delete cascade,
  delivery_enabled boolean not null default true,
  pickup_enabled boolean not null default true,
  online_card_enabled boolean not null default true,
  door_pos_enabled boolean not null default false,
  cash_enabled boolean not null default false,
  minimum_order numeric not null default 0 check (minimum_order >= 0),
  free_delivery_threshold numeric check (free_delivery_threshold is null or free_delivery_threshold >= 0),
  support_phone text,
  order_notifications_enabled boolean not null default true,
  customer_notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_legal_documents (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  document_type text not null check (document_type in ('privacy','kvkk','distance_sales','pre_information','returns','terms')),
  title text not null,
  content text not null default '',
  version text not null default '1.0',
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, document_type)
);

alter table public.seller_settings enable row level security;
alter table public.seller_legal_documents enable row level security;

create policy "public read seller settings"
on public.seller_settings for select to anon, authenticated
using (true);

create policy "public read published seller legal documents"
on public.seller_legal_documents for select to anon, authenticated
using (is_published = true);

grant select on public.seller_settings to anon, authenticated;
grant select on public.seller_legal_documents to anon, authenticated;
grant select, insert, update, delete on public.seller_settings, public.seller_legal_documents to service_role;

insert into public.seller_settings (
  seller_id, delivery_enabled, pickup_enabled,
  online_card_enabled, door_pos_enabled, cash_enabled,
  minimum_order, order_notifications_enabled, customer_notifications_enabled
)
select id, true, true, true, false, false, 150, true, true
from public.sellers
where slug = 'burgermy'
on conflict (seller_id) do update set
  delivery_enabled = excluded.delivery_enabled,
  pickup_enabled = excluded.pickup_enabled,
  online_card_enabled = excluded.online_card_enabled,
  cash_enabled = false,
  updated_at = now();

insert into public.seller_legal_documents (seller_id, document_type, title, content, is_published)
select s.id, d.document_type, d.title, '', false
from public.sellers s
cross join (values
  ('privacy','Gizlilik Politikası'),
  ('kvkk','KVKK Aydınlatma Metni'),
  ('distance_sales','Mesafeli Satış Sözleşmesi'),
  ('pre_information','Ön Bilgilendirme Formu'),
  ('returns','İptal ve İade Koşulları'),
  ('terms','Kullanım Koşulları')
) as d(document_type,title)
where s.slug = 'burgermy'
on conflict (seller_id, document_type) do nothing;
