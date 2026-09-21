
-- santiye_subcontractor_payments mevcut rol bazli subpayments_* RLS
-- politikalarini korur. Company-membership genel policy bu tabloya
-- uygulanmaz; mevcut owner/project_manager/accounting yetki modeli devam eder.

-- ORYVEX ŞANTİYE OS
-- Company membership tabanlı RLS
-- Kullanıcı yalnızca aktif üyesi olduğu company_id verilerine erişebilir.

create or replace function public.oryvex_is_company_member(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.santiye_company_members m
    where m.company_id = target_company
      and m.user_id = auth.uid()
      and m.active = true
  );
$$;

revoke all on function public.oryvex_is_company_member(uuid) from public;
grant execute on function public.oryvex_is_company_member(uuid) to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'santiye_work_program',
    'santiye_employer_payments',

    'santiye_finance_snapshots'
  ]
  loop
    execute format('alter table public.%I enable row level security',t);

    execute format('drop policy if exists %I on public.%I',
      t || '_company_select',t);
    execute format('drop policy if exists %I on public.%I',
      t || '_company_insert',t);
    execute format('drop policy if exists %I on public.%I',
      t || '_company_update',t);
    execute format('drop policy if exists %I on public.%I',
      t || '_company_delete',t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.oryvex_is_company_member(company_id))',
      t || '_company_select',t
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.oryvex_is_company_member(company_id))',
      t || '_company_insert',t
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (public.oryvex_is_company_member(company_id)) with check (public.oryvex_is_company_member(company_id))',
      t || '_company_update',t
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.oryvex_is_company_member(company_id))',
      t || '_company_delete',t
    );
  end loop;
end $$;
