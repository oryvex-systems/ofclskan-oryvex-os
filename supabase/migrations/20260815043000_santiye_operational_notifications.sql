create or replace function public.santiye_notify_project_roles(
  p_project_id uuid,
  p_title text,
  p_body text,
  p_type text,
  p_roles text[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id
  from public.santiye_projects
  where id = p_project_id;

  if v_company_id is null then
    return;
  end if;

  insert into public.santiye_notifications(user_id,title,body,type)
  select distinct
    m.user_id,
    left(coalesce(p_title,'ŞANTİYE OS'),200),
    left(coalesce(p_body,''),1000),
    coalesce(nullif(p_type,''),'info')
  from public.santiye_company_members m
  where m.company_id = v_company_id
    and m.active = true
    and m.role = any(p_roles)
    and m.user_id is not null;
end;
$$;

revoke all on function public.santiye_notify_project_roles(uuid,text,text,text,text[]) from public;

create or replace function public.santiye_material_request_notify() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.santiye_notify_project_roles(
      new.project_id,
      'Yeni malzeme talebi',
      coalesce(new.material_name,'Malzeme') || ' · ' || coalesce(new.quantity,0)::text || ' ' || coalesce(new.unit,''),
      'material',
      array['owner','project_manager','purchasing']
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.created_by is not null then
    insert into public.santiye_notifications(user_id,title,body,type)
    values(
      new.created_by,
      'Malzeme talebi güncellendi',
      coalesce(new.material_name,'Malzeme') || ' · ' || coalesce(old.status,'') || ' → ' || coalesce(new.status,''),
      'material'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_santiye_material_request_notify on public.santiye_material_requests;
create trigger trg_santiye_material_request_notify
after insert or update of status on public.santiye_material_requests
for each row execute function public.santiye_material_request_notify();

create or replace function public.santiye_purchase_request_notify() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.santiye_notify_project_roles(
      new.project_id,
      'Yeni satın alma talebi',
      coalesce(new.title,'Satın alma') || ' · ₺' || coalesce(new.amount,0)::text,
      'purchase',
      array['owner','project_manager','purchasing']
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.requested_by is not null then
    insert into public.santiye_notifications(user_id,title,body,type)
    values(
      new.requested_by,
      'Satın alma talebi güncellendi',
      coalesce(new.title,'Satın alma') || ' · ' || coalesce(old.status,'') || ' → ' || coalesce(new.status,''),
      'purchase'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_santiye_purchase_request_notify on public.santiye_purchase_requests;
create trigger trg_santiye_purchase_request_notify
after insert or update of status on public.santiye_purchase_requests
for each row execute function public.santiye_purchase_request_notify();

create or replace function public.santiye_progress_payment_notify() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.santiye_notify_project_roles(
      new.project_id,
      'Yeni hakediş',
      coalesce(new.title,'Hakediş') || ' · ₺' || coalesce(new.amount,0)::text,
      'payment',
      array['owner','project_manager','accounting']
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.created_by is not null then
    insert into public.santiye_notifications(user_id,title,body,type)
    values(
      new.created_by,
      'Hakediş durumu güncellendi',
      coalesce(new.title,'Hakediş') || ' · ' || coalesce(old.status,'') || ' → ' || coalesce(new.status,''),
      'payment'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_santiye_progress_payment_notify on public.santiye_progress_payments;
create trigger trg_santiye_progress_payment_notify
after insert or update of status on public.santiye_progress_payments
for each row execute function public.santiye_progress_payment_notify();
