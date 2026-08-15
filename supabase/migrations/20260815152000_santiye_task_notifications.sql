-- Notify active project management when important task events occur.
-- Production migration applied to Supabase project wdimzayfvtlrxljpsvza.

create or replace function public.santiye_notify_task_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_project_name text;
  v_title text;
  v_body text;
  v_type text;
begin
  select p.company_id, p.name into v_company_id, v_project_name
  from public.santiye_projects p where p.id = new.project_id;

  if tg_op = 'INSERT' then
    v_title := case when new.priority = 'critical' then 'Kritik iş oluşturuldu' else 'Yeni iş programı kaydı' end;
    v_body := coalesce(v_project_name,'Proje') || ' · ' || coalesce(new.title,'İş') ||
      case when new.due_date is not null then ' · Termin: ' || to_char(new.due_date,'DD.MM.YYYY') else '' end;
    v_type := case when new.priority = 'critical' then 'task_critical' else 'task_created' end;
  elsif old.status is distinct from new.status then
    v_title := case when new.status = 'done' then 'İş tamamlandı' else 'İş durumu güncellendi' end;
    v_body := coalesce(v_project_name,'Proje') || ' · ' || coalesce(new.title,'İş') || ' · ' || coalesce(new.status,'');
    v_type := case when new.status = 'done' then 'task_done' else 'task_status' end;
  elsif old.due_date is distinct from new.due_date or old.priority is distinct from new.priority then
    v_title := 'İş programı güncellendi';
    v_body := coalesce(v_project_name,'Proje') || ' · ' || coalesce(new.title,'İş') ||
      case when new.due_date is not null then ' · Termin: ' || to_char(new.due_date,'DD.MM.YYYY') else '' end ||
      case when new.priority is not null then ' · Öncelik: ' || new.priority else '' end;
    v_type := 'task_updated';
  else
    return new;
  end if;

  insert into public.santiye_notifications(user_id,title,body,type,is_read)
  select distinct m.user_id, v_title, v_body, v_type, false
  from public.santiye_company_members m
  where m.company_id = v_company_id
    and m.active = true
    and (m.role in ('owner','admin','project_manager','site_manager') or m.user_id = new.created_by)
    and m.user_id is not null;

  return new;
end;
$$;

drop trigger if exists trg_santiye_task_notify on public.santiye_tasks;
create trigger trg_santiye_task_notify
after insert or update of status,due_date,priority on public.santiye_tasks
for each row execute function public.santiye_notify_task_change();

revoke all on function public.santiye_notify_task_change() from public;
revoke all on function public.santiye_notify_task_change() from anon;
revoke all on function public.santiye_notify_task_change() from authenticated;
grant execute on function public.santiye_notify_task_change() to service_role;
