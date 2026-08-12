-- Keep BURGERMY/TIKLADOY order status history synchronized automatically.
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history(order_id, status, note)
    values (new.id, new.status, 'Sipariş oluşturuldu');
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.order_status_history(order_id, status, note)
    values (new.id, new.status, null);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_status_history on public.orders;
create trigger trg_orders_status_history
after insert or update of status on public.orders
for each row execute function public.log_order_status_change();
