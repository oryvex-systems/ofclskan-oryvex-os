-- Keep notification helper and trigger functions non-callable from client roles.
-- This mirrors the production migration already applied in Supabase.

revoke all on function public.santiye_notify_project_roles(uuid,text,text,text,text[]) from public;
revoke all on function public.santiye_notify_project_roles(uuid,text,text,text,text[]) from anon;
revoke all on function public.santiye_notify_project_roles(uuid,text,text,text,text[]) from authenticated;
grant execute on function public.santiye_notify_project_roles(uuid,text,text,text,text[]) to service_role;

revoke all on function public.santiye_material_request_notify() from public;
revoke all on function public.santiye_material_request_notify() from anon;
revoke all on function public.santiye_material_request_notify() from authenticated;
grant execute on function public.santiye_material_request_notify() to service_role;

revoke all on function public.santiye_purchase_request_notify() from public;
revoke all on function public.santiye_purchase_request_notify() from anon;
revoke all on function public.santiye_purchase_request_notify() from authenticated;
grant execute on function public.santiye_purchase_request_notify() to service_role;

revoke all on function public.santiye_progress_payment_notify() from public;
revoke all on function public.santiye_progress_payment_notify() from anon;
revoke all on function public.santiye_progress_payment_notify() from authenticated;
grant execute on function public.santiye_progress_payment_notify() to service_role;
