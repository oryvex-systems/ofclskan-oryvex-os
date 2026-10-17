-- Applied to Supabase PROJECTS OS as harita_tracking_core_v1.
-- All public tables are tenant scoped and RLS protected.
create table if not exists public.harita_workspaces (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.harita_members (
 workspace_id uuid not null references public.harita_workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'owner' check (role in ('owner','admin','surveyor','viewer')),
 created_at timestamptz not null default now(),
 primary key (workspace_id,user_id)
);
create table if not exists public.harita_customers (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.harita_workspaces(id) on delete cascade,
 name text not null, contact_name text, email text, phone text, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.harita_projects (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.harita_workspaces(id) on delete cascade,
 customer_id uuid references public.harita_customers(id) on delete set null,
 name text not null, block_number text, parcel_number text, location text, site_os_project_id text,
 status text not null default 'active' check (status in ('active','on_hold','completed','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.harita_service_requests (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.harita_workspaces(id) on delete cascade,
 project_id uuid not null references public.harita_projects(id) on delete cascade,
 requested_at timestamptz not null default now(), requested_by text, description text not null default '',
 status text not null default 'open' check (status in ('open','scheduled','in_progress','completed','cancelled')),
 created_at timestamptz not null default now()
);
create table if not exists public.harita_site_visits (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.harita_workspaces(id) on delete cascade,
 project_id uuid not null references public.harita_projects(id) on delete cascade,
 request_id uuid references public.harita_service_requests(id) on delete set null,
 correction_of_visit_id uuid references public.harita_site_visits(id) on delete set null,
 visited_at timestamptz, visit_date date,
 visit_period text not null default 'unspecified' check (visit_period in ('morning','daytime','afternoon','late_afternoon','evening','unspecified')),
 assigned_person text, operation_type text not null, description text not null default '',
 work_status text not null default 'completed' check (work_status in ('planned','in_progress','completed','needs_revision','cancelled')),
 site_approval text not null default 'pending' check (site_approval in ('pending','approved','rejected')),
 unit_price numeric(12,2), service_fee numeric(12,2),
 invoice_status text not null default 'unspecified' check (invoice_status in ('unspecified','not_issued','issued')),
 payment_status text not null default 'unspecified' check (payment_status in ('unspecified','unpaid','partial','paid')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.harita_survey_points (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.harita_workspaces(id) on delete cascade,
 project_id uuid not null references public.harita_projects(id) on delete cascade,
 visit_id uuid references public.harita_site_visits(id) on delete set null,
 point_type text not null check (point_type in ('level','coordinate','axis','building_corner','parcel_corner','stake','jet_grout','other')),
 point_code text, x numeric(14,4), y numeric(14,4), z numeric(12,4), coordinate_system text,
 unit text not null default 'm', notes text, created_at timestamptz not null default now()
);
create table if not exists public.harita_cubage_measurements (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.harita_workspaces(id) on delete cascade,
 project_id uuid not null references public.harita_projects(id) on delete cascade,
 visit_id uuid references public.harita_site_visits(id) on delete set null,
 measurement_name text not null default 'Kubaj', quantity numeric(14,3), unit text not null default 'm3',
 method text, notes text, created_at timestamptz not null default now()
);
create table if not exists public.harita_files (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.harita_workspaces(id) on delete cascade,
 project_id uuid not null references public.harita_projects(id) on delete cascade,
 visit_id uuid references public.harita_site_visits(id) on delete set null,
 file_name text not null, storage_path text not null, file_type text,
 version integer not null default 1 check (version > 0), uploaded_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists harita_members_user_idx on public.harita_members(user_id);
create index if not exists harita_customers_workspace_idx on public.harita_customers(workspace_id);
create index if not exists harita_projects_workspace_idx on public.harita_projects(workspace_id);
create index if not exists harita_visits_project_date_idx on public.harita_site_visits(project_id,visited_at);
create index if not exists harita_points_project_idx on public.harita_survey_points(project_id);
create index if not exists harita_files_project_idx on public.harita_files(project_id);
alter table public.harita_workspaces enable row level security;
alter table public.harita_members enable row level security;
alter table public.harita_customers enable row level security;
alter table public.harita_projects enable row level security;
alter table public.harita_service_requests enable row level security;
alter table public.harita_site_visits enable row level security;
alter table public.harita_survey_points enable row level security;
alter table public.harita_cubage_measurements enable row level security;
alter table public.harita_files enable row level security;
drop policy if exists harita_workspaces_select on public.harita_workspaces;
create policy harita_workspaces_select on public.harita_workspaces for select to authenticated using (owner_user_id = auth.uid() or exists (select 1 from public.harita_members m where m.workspace_id=id and m.user_id=auth.uid()));
drop policy if exists harita_workspaces_insert on public.harita_workspaces;
create policy harita_workspaces_insert on public.harita_workspaces for insert to authenticated with check (owner_user_id = auth.uid());
drop policy if exists harita_workspaces_update on public.harita_workspaces;
create policy harita_workspaces_update on public.harita_workspaces for update to authenticated using (owner_user_id=auth.uid()) with check (owner_user_id=auth.uid());
drop policy if exists harita_workspaces_delete on public.harita_workspaces;
create policy harita_workspaces_delete on public.harita_workspaces for delete to authenticated using (owner_user_id=auth.uid());
drop policy if exists harita_members_select_self on public.harita_members;
create policy harita_members_select_self on public.harita_members for select to authenticated using (user_id=auth.uid());
drop policy if exists harita_members_insert_owner on public.harita_members;
create policy harita_members_insert_owner on public.harita_members for insert to authenticated with check (user_id=auth.uid() and role='owner' and exists(select 1 from public.harita_workspaces w where w.id=workspace_id and w.owner_user_id=auth.uid()));
drop policy if exists harita_members_update_owner on public.harita_members;
create policy harita_members_update_owner on public.harita_members for update to authenticated using (user_id=auth.uid() and role='owner') with check (user_id=auth.uid() and role='owner');
drop policy if exists harita_members_delete_owner on public.harita_members;
create policy harita_members_delete_owner on public.harita_members for delete to authenticated using (user_id=auth.uid() and role='owner');
drop policy if exists harita_customers_tenant_access on public.harita_customers;
create policy harita_customers_tenant_access on public.harita_customers for all to authenticated using (exists (select 1 from public.harita_members m where m.workspace_id=harita_customers.workspace_id and m.user_id=auth.uid())) with check (exists (select 1 from public.harita_members m where m.workspace_id=harita_customers.workspace_id and m.user_id=auth.uid()));
drop policy if exists harita_projects_tenant_access on public.harita_projects;
create policy harita_projects_tenant_access on public.harita_projects for all to authenticated using (exists (select 1 from public.harita_members m where m.workspace_id=harita_projects.workspace_id and m.user_id=auth.uid())) with check (exists (select 1 from public.harita_members m where m.workspace_id=harita_projects.workspace_id and m.user_id=auth.uid()));
drop policy if exists harita_service_requests_tenant_access on public.harita_service_requests;
create policy harita_service_requests_tenant_access on public.harita_service_requests for all to authenticated using (exists (select 1 from public.harita_members m where m.workspace_id=harita_service_requests.workspace_id and m.user_id=auth.uid())) with check (exists (select 1 from public.harita_members m where m.workspace_id=harita_service_requests.workspace_id and m.user_id=auth.uid()));
drop policy if exists harita_site_visits_tenant_access on public.harita_site_visits;
create policy harita_site_visits_tenant_access on public.harita_site_visits for all to authenticated using (exists (select 1 from public.harita_members m where m.workspace_id=harita_site_visits.workspace_id and m.user_id=auth.uid())) with check (exists (select 1 from public.harita_members m where m.workspace_id=harita_site_visits.workspace_id and m.user_id=auth.uid()));
drop policy if exists harita_survey_points_tenant_access on public.harita_survey_points;
create policy harita_survey_points_tenant_access on public.harita_survey_points for all to authenticated using (exists (select 1 from public.harita_members m where m.workspace_id=harita_survey_points.workspace_id and m.user_id=auth.uid())) with check (exists (select 1 from public.harita_members m where m.workspace_id=harita_survey_points.workspace_id and m.user_id=auth.uid()));
drop policy if exists harita_cubage_measurements_tenant_access on public.harita_cubage_measurements;
create policy harita_cubage_measurements_tenant_access on public.harita_cubage_measurements for all to authenticated using (exists (select 1 from public.harita_members m where m.workspace_id=harita_cubage_measurements.workspace_id and m.user_id=auth.uid())) with check (exists (select 1 from public.harita_members m where m.workspace_id=harita_cubage_measurements.workspace_id and m.user_id=auth.uid()));
drop policy if exists harita_files_tenant_access on public.harita_files;
create policy harita_files_tenant_access on public.harita_files for all to authenticated using (exists (select 1 from public.harita_members m where m.workspace_id=harita_files.workspace_id and m.user_id=auth.uid())) with check (exists (select 1 from public.harita_members m where m.workspace_id=harita_files.workspace_id and m.user_id=auth.uid()));
