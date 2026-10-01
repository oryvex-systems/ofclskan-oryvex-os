begin;

alter table public.santiye_account_transactions
  add column if not exists company_id uuid,
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists source_no text,
  add column if not exists cost_center text,
  add column if not exists quantity numeric,
  add column if not exists unit text,
  add column if not exists unit_price numeric,
  add column if not exists supplier_name text;

create index if not exists
  idx_account_transactions_company
on public.santiye_account_transactions(company_id);

create index if not exists
  idx_account_transactions_source
on public.santiye_account_transactions(source_type,source_id);

create unique index if not exists
  uq_account_transactions_concrete_slip
on public.santiye_account_transactions(source_type,source_id)
where source_type='CONCRETE_SLIP'
  and source_id is not null;

create or replace function
public.santiye_transfer_concrete_slips_to_cari(
  p_project_id uuid,
  p_slip_ids uuid[]
)
returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_company_id uuid;
  v_slip record;
  v_account_id uuid;
  v_price numeric;
  v_amount numeric;
  v_count integer := 0;
  v_total numeric := 0;
begin

  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_project_id is null then
    raise exception 'PROJECT_REQUIRED';
  end if;

  if p_slip_ids is null
     or coalesce(array_length(p_slip_ids,1),0)=0 then
    raise exception 'SLIP_REQUIRED';
  end if;

  select company_id
  into v_company_id
  from public.santiye_projects
  where id=p_project_id;

  if v_company_id is null then
    raise exception 'PROJECT_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.santiye_company_members m
    where m.company_id=v_company_id
      and m.user_id=v_uid
      and coalesce(m.active,true)=true
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  for v_slip in
    select
      s.id,
      s.slip_no,
      s.slip_date,
      s.quantity_m3,
      s.concrete_class,
      s.supplier_name,
      s.pour_id,
      p.scope_type,
      p.work_group,
      p.work_item,
      p.cost_center,
      p.unit_price
    from public.santiye_concrete_slips s
    join public.santiye_concrete_pours p
      on p.id=s.pour_id
    where s.project_id=p_project_id
      and s.id=any(p_slip_ids)
    order by s.slip_date,s.created_at
    for update of s
  loop

    if v_slip.scope_type not in ('PROJECT','NON_PROJECT') then
      raise exception
        'SLIP_NOT_CLASSIFIED:%',
        v_slip.slip_no;
    end if;

    if nullif(trim(coalesce(v_slip.supplier_name,'')),'') is null then
      raise exception
        'SUPPLIER_REQUIRED:%',
        v_slip.slip_no;
    end if;

    v_price := coalesce(v_slip.unit_price,0);

    if v_price <= 0 then
      raise exception
        'UNIT_PRICE_REQUIRED:%',
        v_slip.slip_no;
    end if;

    if exists (
      select 1
      from public.santiye_account_transactions t
      where t.source_type='CONCRETE_SLIP'
        and t.source_id=v_slip.id
    ) then
      raise exception
        'ALREADY_TRANSFERRED:%',
        v_slip.slip_no;
    end if;

    select a.id
    into v_account_id
    from public.santiye_accounts a
    where a.company_id=v_company_id
      and lower(trim(a.name)) =
          lower(trim(v_slip.supplier_name))
    order by a.created_at
    limit 1;

    if v_account_id is null then
      insert into public.santiye_accounts (
        company_id,
        name,
        type,
        created_by
      )
      values (
        v_company_id,
        trim(v_slip.supplier_name),
        'supplier',
        v_uid
      )
      returning id into v_account_id;
    end if;

    v_amount :=
      round(
        coalesce(v_slip.quantity_m3,0) *
        v_price,
        2
      );

    if v_amount <= 0 then
      raise exception
        'INVALID_AMOUNT:%',
        v_slip.slip_no;
    end if;

    insert into public.santiye_account_transactions (
      account_id,
      project_id,
      company_id,
      txn_date,
      type,
      amount,
      description,
      created_by,
      source_type,
      source_id,
      source_no,
      cost_center,
      quantity,
      unit,
      unit_price,
      supplier_name
    )
    values (
      v_account_id,
      p_project_id,
      v_company_id,
      v_slip.slip_date,
      'debit',
      v_amount,
      concat(
        'Hazır Beton Fişi ',
        v_slip.slip_no,
        ' · ',
        coalesce(v_slip.concrete_class,'Beton'),
        ' · ',
        trim(
          to_char(
            v_slip.quantity_m3,
            'FM999999990.###'
          )
        ),
        ' m³',
        case
          when nullif(
            trim(coalesce(v_slip.work_item,'')),
            ''
          ) is not null
          then ' · ' || v_slip.work_item
          else ''
        end,
        case
          when nullif(
            trim(coalesce(v_slip.cost_center,'')),
            ''
          ) is not null
          then
            ' · Masraf Merkezi: ' ||
            v_slip.cost_center
          else ''
        end
      ),
      v_uid,
      'CONCRETE_SLIP',
      v_slip.id,
      v_slip.slip_no,
      v_slip.cost_center,
      v_slip.quantity_m3,
      'm³',
      v_price,
      v_slip.supplier_name
    );

    v_count := v_count + 1;
    v_total := v_total + v_amount;

  end loop;

  if v_count=0 then
    raise exception 'NO_TRANSFERABLE_SLIPS';
  end if;

  return jsonb_build_object(
    'ok',true,
    'transferred_count',v_count,
    'total_amount',round(v_total,2),
    'project_id',p_project_id
  );

end;
$$;

revoke all
on function
public.santiye_transfer_concrete_slips_to_cari(uuid,uuid[])
from public;

grant execute
on function
public.santiye_transfer_concrete_slips_to_cari(uuid,uuid[])
to authenticated;

commit;
