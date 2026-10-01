begin;

create table if not exists public.santiye_concrete_price_list (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  project_id uuid null,
  concrete_class text not null,
  normalized_class text not null,
  unit_price numeric(14,2) not null check (unit_price > 0),
  currency text not null default 'TRY',
  valid_from date not null default current_date,
  valid_to date null,
  active boolean not null default true,
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  idx_concrete_price_company
on public.santiye_concrete_price_list(company_id);

create index if not exists
  idx_concrete_price_project
on public.santiye_concrete_price_list(project_id);

create index if not exists
  idx_concrete_price_class
on public.santiye_concrete_price_list(normalized_class);

create unique index if not exists
  uq_concrete_price_active
on public.santiye_concrete_price_list(
  company_id,
  coalesce(project_id,'00000000-0000-0000-0000-000000000000'::uuid),
  normalized_class,
  valid_from
);

alter table public.santiye_concrete_price_list
enable row level security;

drop policy if exists
  concrete_price_project_members
on public.santiye_concrete_price_list;

create policy concrete_price_project_members
on public.santiye_concrete_price_list
for all
to authenticated
using (
  exists (
    select 1
    from public.santiye_company_members m
    where m.company_id =
      santiye_concrete_price_list.company_id
      and m.user_id = auth.uid()
      and m.active = true
  )
)
with check (
  exists (
    select 1
    from public.santiye_company_members m
    where m.company_id =
      santiye_concrete_price_list.company_id
      and m.user_id = auth.uid()
      and m.active = true
  )
);

insert into public.santiye_concrete_price_list (
  company_id,
  project_id,
  concrete_class,
  normalized_class,
  unit_price,
  currency,
  valid_from,
  active
)
select
  p.company_id,
  p.id,
  'C16',
  'C16',
  2600.00,
  'TRY',
  current_date,
  true
from public.santiye_projects p
where p.id='62e1d67f-c1c5-47e1-9aec-e2d79e6c08cf'::uuid
on conflict do nothing;

insert into public.santiye_concrete_price_list (
  company_id,
  project_id,
  concrete_class,
  normalized_class,
  unit_price,
  currency,
  valid_from,
  active
)
select
  p.company_id,
  p.id,
  'C20/25',
  'C20/25',
  2700.00,
  'TRY',
  current_date,
  true
from public.santiye_projects p
where p.id='62e1d67f-c1c5-47e1-9aec-e2d79e6c08cf'::uuid
on conflict do nothing;

insert into public.santiye_concrete_price_list (
  company_id,
  project_id,
  concrete_class,
  normalized_class,
  unit_price,
  currency,
  valid_from,
  active
)
select
  p.company_id,
  p.id,
  'C30/35',
  'C30/35',
  2800.00,
  'TRY',
  current_date,
  true
from public.santiye_projects p
where p.id='62e1d67f-c1c5-47e1-9aec-e2d79e6c08cf'::uuid
on conflict do nothing;


create or replace function public.santiye_normalize_concrete_class(
  p_class text
)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  v := upper(trim(coalesce(p_class,'')));

  v := replace(v,' ','');
  v := replace(v,'-','/');
  v := replace(v,'_','/');

  if v like 'C16%' then
    return 'C16';
  end if;

  if v like 'C20/25%' or v like 'C20%25%' then
    return 'C20/25';
  end if;

  if v like 'C30/35%' or v like 'C30%35%' then
    return 'C30/35';
  end if;

  return v;
end;
$$;


create or replace function public.santiye_concrete_unit_price(
  p_project_id uuid,
  p_concrete_class text,
  p_date date default current_date
)
returns numeric
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_company uuid;
  v_class text;
  v_price numeric;
begin

  select company_id
  into v_company
  from public.santiye_projects
  where id=p_project_id;

  if v_company is null then
    raise exception 'PROJECT_NOT_FOUND';
  end if;

  v_class :=
    public.santiye_normalize_concrete_class(
      p_concrete_class
    );

  select pl.unit_price
  into v_price
  from public.santiye_concrete_price_list pl
  where pl.company_id=v_company
    and pl.active=true
    and pl.normalized_class=v_class
    and (
      pl.project_id=p_project_id
      or pl.project_id is null
    )
    and pl.valid_from <= coalesce(p_date,current_date)
    and (
      pl.valid_to is null
      or pl.valid_to >= coalesce(p_date,current_date)
    )
  order by
    case
      when pl.project_id=p_project_id then 0
      else 1
    end,
    pl.valid_from desc
  limit 1;

  return v_price;
end;
$$;


create or replace function public.santiye_transfer_concrete_slips_to_cari(
  p_project_id uuid,
  p_slip_ids uuid[]
)
returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_uid uuid;
  v_company uuid;
  v_slip record;
  v_pour record;
  v_account_id uuid;
  v_price numeric;
  v_amount numeric;
  v_count integer := 0;
  v_total numeric := 0;
  v_class text;
begin

  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_project_id is null then
    raise exception 'PROJECT_REQUIRED';
  end if;

  if p_slip_ids is null
     or cardinality(p_slip_ids)=0 then
    raise exception 'SLIP_REQUIRED';
  end if;

  select p.company_id
  into v_company
  from public.santiye_projects p
  where p.id=p_project_id;

  if v_company is null then
    raise exception 'PROJECT_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.santiye_company_members m
    where m.company_id=v_company
      and m.user_id=v_uid
      and m.active=true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;


  for v_slip in

    select s.*
    from public.santiye_concrete_slips s
    where s.project_id=p_project_id
      and s.id=any(p_slip_ids)
    order by s.slip_date,s.created_at
    for update

  loop

    if exists (
      select 1
      from public.santiye_account_transactions t
      where t.source_type='CONCRETE_SLIP'
        and t.source_id=v_slip.id
    ) then
      raise exception
        'SLIP_ALREADY_TRANSFERRED:%',
        v_slip.slip_no;
    end if;


    if v_slip.pour_id is null then
      raise exception
        'SLIP_NOT_CLASSIFIED:%',
        v_slip.slip_no;
    end if;


    select *
    into v_pour
    from public.santiye_concrete_pours
    where id=v_slip.pour_id
      and project_id=p_project_id;

    if not found then
      raise exception
        'POUR_NOT_FOUND:%',
        v_slip.slip_no;
    end if;


    if upper(coalesce(v_pour.scope_type,'')) not in (
      'PROJECT',
      'NON_PROJECT'
    ) then
      raise exception
        'SLIP_NOT_CLASSIFIED:%',
        v_slip.slip_no;
    end if;


    if trim(coalesce(v_slip.supplier_name,''))='' then
      raise exception
        'SUPPLIER_REQUIRED:%',
        v_slip.slip_no;
    end if;


    v_class :=
      public.santiye_normalize_concrete_class(
        coalesce(
          nullif(v_slip.concrete_class,''),
          v_pour.concrete_class
        )
      );


    v_price :=
      public.santiye_concrete_unit_price(
        p_project_id,
        v_class,
        v_slip.slip_date
      );


    if v_price is null or v_price <= 0 then
      raise exception
        'PRICE_NOT_DEFINED:%:%',
        v_slip.slip_no,
        v_class;
    end if;


    v_amount :=
      round(
        v_slip.quantity_m3 * v_price,
        2
      );


    select a.id
    into v_account_id
    from public.santiye_accounts a
    where a.company_id=v_company
      and lower(trim(a.name))=
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
        v_company,
        v_slip.supplier_name,
        'supplier',
        v_uid
      )
      returning id
      into v_account_id;

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
      v_company,
      v_slip.slip_date,
      'debit',
      v_amount,

      'Beton Fişi '||
      v_slip.slip_no||
      ' · '||
      v_class||
      ' · '||
      v_slip.quantity_m3||
      ' m³ × '||
      v_price||
      ' TL/m³',

      v_uid,
      'CONCRETE_SLIP',
      v_slip.id,
      v_slip.slip_no,
      coalesce(
        nullif(v_pour.cost_center,''),
        'Genel Gider'
      ),
      v_slip.quantity_m3,
      'm³',
      v_price,
      v_slip.supplier_name
    );


    v_count := v_count + 1;
    v_total := v_total + v_amount;

  end loop;


  if v_count <> cardinality(p_slip_ids) then
    raise exception 'SLIP_COUNT_MISMATCH';
  end if;


  return jsonb_build_object(
    'success',true,
    'transferred_count',v_count,
    'total_amount',v_total,
    'currency','TRY'
  );

end;
$$;


revoke all
on function public.santiye_transfer_concrete_slips_to_cari(
  uuid,
  uuid[]
)
from public;

grant execute
on function public.santiye_transfer_concrete_slips_to_cari(
  uuid,
  uuid[]
)
to authenticated;


grant execute
on function public.santiye_concrete_unit_price(
  uuid,
  text,
  date
)
to authenticated;

grant execute
on function public.santiye_normalize_concrete_class(
  text
)
to authenticated;

commit;
