create or replace function public.santiye_classify_concrete_slips(
  p_project_id uuid,
  p_slip_ids uuid[],
  p_scope_type text,
  p_work_group text,
  p_work_item text,
  p_cost_center text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_pour_id uuid;
  v_total_m3 numeric := 0;
  v_count integer := 0;
  v_concrete_class text;
  v_supplier_name text;
  v_pour_date date;
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;

  if p_project_id is null then
    raise exception 'Proje gerekli';
  end if;

  if p_slip_ids is null or cardinality(p_slip_ids) = 0 then
    raise exception 'En az bir beton fişi seçilmeli';
  end if;

  if p_scope_type not in ('PROJECT','NON_PROJECT') then
    raise exception 'Geçersiz beton sınıflandırması';
  end if;

  if nullif(trim(p_work_group),'') is null then
    raise exception 'İş grubu gerekli';
  end if;

  if nullif(trim(p_work_item),'') is null then
    raise exception 'İmalat / kullanım yeri gerekli';
  end if;

  if nullif(trim(p_cost_center),'') is null then
    raise exception 'Masraf merkezi gerekli';
  end if;

  select company_id
    into v_company_id
  from public.santiye_projects
  where id = p_project_id;

  if v_company_id is null then
    raise exception 'Proje bulunamadı';
  end if;

  select
    count(*),
    coalesce(sum(quantity_m3),0),
    min(slip_date),
    string_agg(
      distinct concrete_class,
      ', '
      order by concrete_class
    ),
    string_agg(
      distinct supplier_name,
      ', '
      order by supplier_name
    )
  into
    v_count,
    v_total_m3,
    v_pour_date,
    v_concrete_class,
    v_supplier_name
  from public.santiye_concrete_slips
  where project_id = p_project_id
    and company_id = v_company_id
    and id = any(p_slip_ids);

  if v_count <> cardinality(p_slip_ids) then
    raise exception
      'Seçilen fişlerin tamamı bu projeye ait değil';
  end if;

  insert into public.santiye_concrete_pours(
    company_id,
    project_id,
    pour_date,
    scope_type,
    work_group,
    work_item,
    cost_center,
    concrete_class,
    total_m3,
    supplier_name,
    location_name,
    note,
    created_by
  )
  values(
    v_company_id,
    p_project_id,
    coalesce(v_pour_date,current_date),
    p_scope_type,
    trim(p_work_group),
    trim(p_work_item),
    trim(p_cost_center),
    coalesce(v_concrete_class,'Atanacak'),
    v_total_m3,
    v_supplier_name,
    'TAŞPAZAR CAMİİ ŞANTİYESİ',
    'Beton fişlerinden atomik sınıflandırma ile oluşturuldu.',
    auth.uid()
  )
  returning id into v_pour_id;

  update public.santiye_concrete_slips
  set pour_id = v_pour_id
  where project_id = p_project_id
    and company_id = v_company_id
    and id = any(p_slip_ids);

  if not found then
    raise exception 'Beton fişleri döküme bağlanamadı';
  end if;

  return jsonb_build_object(
    'ok', true,
    'pour_id', v_pour_id,
    'project_id', p_project_id,
    'company_id', v_company_id,
    'slip_count', v_count,
    'total_m3', v_total_m3,
    'scope_type', p_scope_type,
    'work_group', trim(p_work_group),
    'work_item', trim(p_work_item),
    'cost_center', trim(p_cost_center)
  );
end;
$$;

revoke all
on function public.santiye_classify_concrete_slips(
  uuid,uuid[],text,text,text,text
)
from public;

grant execute
on function public.santiye_classify_concrete_slips(
  uuid,uuid[],text,text,text,text
)
to authenticated;
