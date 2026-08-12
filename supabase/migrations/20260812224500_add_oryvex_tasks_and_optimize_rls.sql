create index if not exists oryvex_workspace_members_user_idx on public.oryvex_workspace_members(user_id);

drop policy if exists "oryvex members can read workspaces" on public.oryvex_workspaces;
create policy "oryvex members can read workspaces"
on public.oryvex_workspaces for select
to authenticated
using (
  exists (
    select 1 from public.oryvex_workspace_members m
    where m.workspace_id = oryvex_workspaces.id
      and m.user_id = (select auth.uid())
  )
);

drop policy if exists "oryvex users can read own memberships" on public.oryvex_workspace_members;
create policy "oryvex users can read own memberships"
on public.oryvex_workspace_members for select
to authenticated
using (user_id = (select auth.uid()));

create table if not exists public.oryvex_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.oryvex_workspaces(id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo','in_progress','done','overdue')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  due_date date,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists oryvex_tasks_workspace_idx on public.oryvex_tasks(workspace_id);
create index if not exists oryvex_tasks_assigned_idx on public.oryvex_tasks(assigned_to);
alter table public.oryvex_tasks enable row level security;

create policy "oryvex members can read tasks"
on public.oryvex_tasks for select
to authenticated
using (
  exists (
    select 1 from public.oryvex_workspace_members m
    where m.workspace_id = oryvex_tasks.workspace_id
      and m.user_id = (select auth.uid())
  )
);

insert into public.oryvex_tasks (workspace_id,title,status,priority,due_date)
select id,'ORYVEX ana çatı yayına hazırlığı','in_progress','high','2026-08-14'::date from public.oryvex_workspaces where slug='tikladoy';
insert into public.oryvex_tasks (workspace_id,title,status,priority,due_date)
select id,'TIKLADOY sistem geçiş testi','todo','high','2026-08-15'::date from public.oryvex_workspaces where slug='tikladoy';
insert into public.oryvex_tasks (workspace_id,title,status,priority,due_date)
select id,'BURGERMY entegrasyon kontrolü','todo','medium','2026-08-16'::date from public.oryvex_workspaces where slug='burgermy';
insert into public.oryvex_tasks (workspace_id,title,status,priority,due_date)
select id,'WOODLIFE çalışma alanı bağlantısı','todo','medium','2026-08-20'::date from public.oryvex_workspaces where slug='woodlife';

revoke execute on function public.log_order_status_change() from anon, authenticated;
