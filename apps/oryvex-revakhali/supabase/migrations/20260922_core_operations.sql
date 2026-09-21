-- ORYVEX ŞANTİYE OS
-- Çekirdek operasyon veri modeli
-- Mevcut tablolara dokunmaz; destructive işlem içermez.

create table if not exists public.santiye_work_program (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  company_id uuid not null,
  work_code text,
  work_name text not null,
  work_amount numeric(18,2) not null default 0 check (work_amount >= 0),
  pursantaj_percent numeric(8,4) not null default 0 check (pursantaj_percent between 0 and 100),
  month_no integer not null check (month_no between 1 and 12),
  planned_percent numeric(8,4) not null default 0 check (planned_percent between 0 and 100),
  planned_amount numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.santiye_employer_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  company_id uuid not null,
  payment_no integer,
  period_label text,
  contract_amount numeric(18,2) not null default 0,
  period_progress_percent numeric(8,4) not null default 0,
  cumulative_progress_percent numeric(8,4) not null default 0,
  gross_amount numeric(18,2) not null default 0,
  vat_percent numeric(8,4) not null default 20,
  vat_withholding_percent numeric(8,4) not null default 0,
  retention_percent numeric(8,4) not null default 5,
  ssk_percent numeric(8,4) not null default 0,
  tax_percent numeric(8,4) not null default 0,
  other_cut_percent numeric(8,4) not null default 0,
  advance_offset numeric(18,2) not null default 0,
  previous_payment numeric(18,2) not null default 0,
  net_amount numeric(18,2) not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.santiye_subcontractor_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  company_id uuid not null,
  subcontractor_name text not null,
  work_code text,
  work_name text,
  contract_amount numeric(18,2) not null default 0,
  employer_work_amount numeric(18,2) not null default 0,
  field_progress_percent numeric(8,4) not null default 0,
  period_progress_percent numeric(8,4) not null default 0,
  cumulative_progress_percent numeric(8,4) not null default 0,
  vat_percent numeric(8,4) not null default 20,
  vat_withholding_percent numeric(8,4) not null default 0,
  retention_percent numeric(8,4) not null default 5,
  ssk_percent numeric(8,4) not null default 0,
  tax_percent numeric(8,4) not null default 0,
  other_cut_percent numeric(8,4) not null default 0,
  advance_offset numeric(18,2) not null default 0,
  gross_amount numeric(18,2) not null default 0,
  total_cuts numeric(18,2) not null default 0,
  net_amount numeric(18,2) not null default 0,
  employer_earned numeric(18,2) not null default 0,
  gross_margin numeric(18,2) not null default 0,
  cash_difference numeric(18,2) not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.santiye_finance_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  company_id uuid not null,
  employer_earned numeric(18,2) not null default 0,
  subcontractor_net numeric(18,2) not null default 0,
  collected_amount numeric(18,2) not null default 0,
  paid_amount numeric(18,2) not null default 0,
  gross_margin numeric(18,2) not null default 0,
  cash_difference numeric(18,2) not null default 0,
  snapshot_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_work_program_project
on public.santiye_work_program(project_id,company_id);

create index if not exists idx_employer_payment_project
on public.santiye_employer_payments(project_id,company_id);

create index if not exists idx_subcontract_payment_project
on public.santiye_subcontractor_payments(project_id,company_id);

create index if not exists idx_finance_snapshot_project
on public.santiye_finance_snapshots(project_id,company_id);

alter table public.santiye_work_program enable row level security;
alter table public.santiye_employer_payments enable row level security;
alter table public.santiye_subcontractor_payments enable row level security;
alter table public.santiye_finance_snapshots enable row level security;

-- RLS policy mevcut ORYVEX company/profile modeli doğrulandıktan sonra
-- ayrı migration ile eklenecek. service_role/anon bypass yapılmayacak.
