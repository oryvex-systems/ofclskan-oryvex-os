-- BURGERMY brand/branch layer for the shared ORYVEX commerce database.
-- Applied to production as Supabase migration 20260811225831.

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  name text not null,
  slug text not null,
  phone text,
  full_address text,
  city text,
  district text,
  latitude numeric,
  longitude numeric,
  supports_delivery boolean not null default true,
  supports_pickup boolean not null default true,
  delivery_fee numeric not null default 0 check (delivery_fee >= 0),
  minimum_order numeric not null default 0 check (minimum_order >= 0),
  prep_minutes_min integer not null default 20 check (prep_minutes_min > 0),
  prep_minutes_max integer not null default 35 check (prep_minutes_max >= prep_minutes_min),
  opening_hours jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, slug)
);

create table if not exists public.seller_members (
  seller_id uuid not null references public.sellers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff'
    check (role in ('owner','manager','kitchen','courier','staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (seller_id, user_id)
);

alter table public.orders
  add column if not exists branch_id uuid references public.branches(id) on delete restrict,
  add column if not exists fulfillment_type text not null default 'delivery'
    check (fulfillment_type in ('delivery','pickup')),
  add column if not exists pickup_code text;

alter table public.carts
  add column if not exists seller_id uuid references public.sellers(id) on delete cascade;

create index if not exists branches_seller_idx on public.branches(seller_id);
create index if not exists seller_members_user_idx on public.seller_members(user_id);
create index if not exists orders_branch_idx on public.orders(branch_id);
create index if not exists carts_seller_idx on public.carts(seller_id);
create index if not exists cart_items_product_idx on public.cart_items(product_id);
create index if not exists favorites_product_idx on public.favorites(product_id);
create index if not exists order_items_product_idx on public.order_items(product_id);
create index if not exists order_status_history_order_idx on public.order_status_history(order_id);
create index if not exists product_options_product_idx on public.product_options(product_id);
create index if not exists product_option_values_option_idx on public.product_option_values(option_id);
create index if not exists orders_seller_status_created_idx
  on public.orders(seller_id, status, created_at desc);

alter table public.branches enable row level security;
alter table public.seller_members enable row level security;

create policy "public read active branches"
on public.branches for select to anon, authenticated
using (is_active = true);

create policy "members read own memberships"
on public.seller_members for select to authenticated
using ((select auth.uid()) = user_id);

grant select on public.branches to anon, authenticated;
grant select on public.seller_members to authenticated;
grant select, insert, update, delete
  on public.branches, public.seller_members to service_role;

insert into public.sellers (name, slug, is_active)
values ('BURGERMY', 'burgermy', true)
on conflict (slug) do update
set name = excluded.name, is_active = true;

insert into public.branches (
  seller_id, name, slug, full_address, city, district,
  supports_delivery, supports_pickup, delivery_fee, minimum_order,
  prep_minutes_min, prep_minutes_max, opening_hours
)
select s.id, v.name, v.slug, v.full_address, 'İstanbul', v.district,
       true, true, 29, 150, 20, 35,
       '{"mon":"10:00-23:00","tue":"10:00-23:00","wed":"10:00-23:00","thu":"10:00-23:00","fri":"10:00-00:00","sat":"10:00-00:00","sun":"10:00-23:00"}'::jsonb
from public.sellers s
cross join (values
  ('Kadıköy Şubesi','kadikoy','Rıhtım Cad., Kadıköy','Kadıköy'),
  ('Bostancı Şubesi','bostanci','Bağdat Cad., Bostancı','Kadıköy')
) as v(name,slug,full_address,district)
where s.slug = 'burgermy'
on conflict (seller_id, slug) do update set
  name = excluded.name,
  full_address = excluded.full_address,
  supports_delivery = excluded.supports_delivery,
  supports_pickup = excluded.supports_pickup,
  delivery_fee = excluded.delivery_fee,
  minimum_order = excluded.minimum_order,
  prep_minutes_min = excluded.prep_minutes_min,
  prep_minutes_max = excluded.prep_minutes_max,
  opening_hours = excluded.opening_hours,
  is_active = true,
  updated_at = now();

insert into public.categories (name, slug, sort_order, is_active)
values
  ('Burger Menüleri','burger-menuleri',10,true),
  ('Burgerler','burgerler',11,true),
  ('Çıtır Lezzetler','citir-lezzetler',12,true),
  ('İçecekler','icecekler',13,true)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.products (
  seller_id, category_id, name, slug, description, image_url, price,
  prep_minutes_min, prep_minutes_max, is_featured, is_new, is_active, metadata
)
select s.id, c.id, v.name, v.slug, v.description, v.image_url, v.price,
       15, 25, v.featured, false, true, v.metadata
from public.sellers s
join public.categories c on c.slug = 'burger-menuleri'
cross join (values
  ('Classic Burger Menü','burgermy-classic-menu','120 g dana köfte, cheddar, turşu, özel sos, patates ve içecek','/products/classic.png',245::numeric,true,'{"badge":"Çok Sevilen","brand":"burgermy"}'::jsonb),
  ('Duble Burger Menü','burgermy-double-menu','Tek ekmekte iki dana köfte, çift cheddar, patates ve içecek','/products/double.png',315::numeric,true,'{"badge":"Doyuran Menü","brand":"burgermy"}'::jsonb),
  ('Crispy Chicken Menü','burgermy-crispy-chicken-menu','Çıtır tavuk, taze marul, domates, özel sos, patates ve içecek','/products/chicken.png',225::numeric,false,'{"brand":"burgermy"}'::jsonb),
  ('Çift Burger Menü','burgermy-twin-menu','İki ayrı burger, büyük patates ve iki içecek','/products/twin.png',465::numeric,true,'{"badge":"Paylaşmalık","brand":"burgermy"}'::jsonb),
  ('BBQ Burger Menü','burgermy-bbq-menu','Dana köfte, isli barbekü sos, çıtır soğan, cheddar ve içecek','/products/bbq.png',275::numeric,false,'{"brand":"burgermy"}'::jsonb),
  ('Öğrenci Menü','burgermy-student-menu','Classic burger, patates ve içecek; tam porsiyon, net fiyat','/products/student.png',199::numeric,true,'{"badge":"Avantajlı","brand":"burgermy"}'::jsonb)
) as v(name,slug,description,image_url,price,featured,metadata)
where s.slug = 'burgermy'
on conflict (slug) do update set
  seller_id = excluded.seller_id,
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  price = excluded.price,
  prep_minutes_min = excluded.prep_minutes_min,
  prep_minutes_max = excluded.prep_minutes_max,
  is_featured = excluded.is_featured,
  is_active = true,
  metadata = excluded.metadata,
  updated_at = now();

do $$
declare
  p record;
  opt_id uuid;
begin
  for p in select id from public.products where slug like 'burgermy-%'
  loop
    if not exists (select 1 from public.product_options where product_id=p.id and name='Menü Boyutu') then
      insert into public.product_options(product_id,name,is_required,min_select,max_select,sort_order)
      values(p.id,'Menü Boyutu',true,1,1,10) returning id into opt_id;
      insert into public.product_option_values(option_id,name,price_delta,is_default,sort_order)
      values (opt_id,'Normal',0,true,10),(opt_id,'Büyük',35,false,20);
    end if;

    if not exists (select 1 from public.product_options where product_id=p.id and name='İçecek') then
      insert into public.product_options(product_id,name,is_required,min_select,max_select,sort_order)
      values(p.id,'İçecek',true,1,1,20) returning id into opt_id;
      insert into public.product_option_values(option_id,name,price_delta,is_default,sort_order)
      values (opt_id,'Kola',0,false,10),(opt_id,'Kola Zero',0,false,20),
             (opt_id,'Ayran',0,false,30),(opt_id,'Su',0,false,40);
    end if;

    if not exists (select 1 from public.product_options where product_id=p.id and name='Soslar') then
      insert into public.product_options(product_id,name,is_required,min_select,max_select,sort_order)
      values(p.id,'Soslar',false,0,4,30) returning id into opt_id;
      insert into public.product_option_values(option_id,name,price_delta,is_default,sort_order)
      values (opt_id,'BURGERMY Sos',0,true,10),(opt_id,'Ketçap',0,false,20),
             (opt_id,'Mayonez',0,false,30),(opt_id,'Acı Sos',0,false,40);
    end if;

    if not exists (select 1 from public.product_options where product_id=p.id and name='Ekstralar') then
      insert into public.product_options(product_id,name,is_required,min_select,max_select,sort_order)
      values(p.id,'Ekstralar',false,0,2,40) returning id into opt_id;
      insert into public.product_option_values(option_id,name,price_delta,is_default,sort_order)
      values (opt_id,'Ekstra cheddar',25,false,10),
             (opt_id,'Ekstra dana köfte',65,false,20);
    end if;

    if not exists (select 1 from public.product_options where product_id=p.id and name='Çıkarılacak Malzemeler') then
      insert into public.product_options(product_id,name,is_required,min_select,max_select,sort_order)
      values(p.id,'Çıkarılacak Malzemeler',false,0,4,50) returning id into opt_id;
      insert into public.product_option_values(option_id,name,price_delta,is_default,sort_order)
      values (opt_id,'Turşu',0,false,10),(opt_id,'Soğan',0,false,20),
             (opt_id,'Domates',0,false,30),(opt_id,'Marul',0,false,40);
    end if;
  end loop;
end $$;
