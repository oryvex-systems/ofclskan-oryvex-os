create table if not exists public.oryvex_workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active','development','paused','archived')),
  app_url text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.oryvex_workspace_members (
  workspace_id uuid not null references public.oryvex_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.oryvex_workspaces enable row level security;
alter table public.oryvex_workspace_members enable row level security;

create policy "oryvex members can read workspaces"
on public.oryvex_workspaces for select
to authenticated
using (
  exists (
    select 1 from public.oryvex_workspace_members m
    where m.workspace_id = oryvex_workspaces.id
      and m.user_id = auth.uid()
  )
);

create policy "oryvex users can read own memberships"
on public.oryvex_workspace_members for select
to authenticated
using (user_id = auth.uid());

insert into public.oryvex_workspaces (slug,name,description,status,app_url)
values
  ('tikladoy','TIKLADOY','Çevrim içi paket yemek platformu','active','https://tikladoy.tr'),
  ('burgermy','BURGERMY','Sipariş ve operasyon sistemi','active','https://burgermy-v1.ofrkcaliskan.chatgpt.site'),
  ('teknom-yapi','TEKNOM YAPI','Yapı ve şantiye yönetim sistemi','development',null),
  ('woodlife','WOODLIFE','Satış, teklif ve CRM sistemi','development',null),
  ('dome-lighting','DOME LIGHTING','Teklif ve proje yönetimi','development',null),
  ('kaynasalim','KAYNAŞALIM','Topluluk platformu','development',null)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  app_url = excluded.app_url,
  updated_at = now();
