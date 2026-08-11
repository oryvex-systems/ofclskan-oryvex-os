-- RLS and index follow-up for BURGERMY order access.
-- Applied to production as Supabase migration 20260811230319.

create index if not exists orders_address_idx on public.orders(address_id);

drop policy if exists "own orders read" on public.orders;
drop policy if exists "seller staff read orders" on public.orders;
create policy "customers and seller staff read orders"
on public.orders for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.seller_members sm
    where sm.seller_id = orders.seller_id
      and sm.user_id = (select auth.uid())
      and sm.is_active = true
  )
);

drop policy if exists "own order items read" on public.order_items;
drop policy if exists "seller staff read order items" on public.order_items;
create policy "customers and seller staff read order items"
on public.order_items for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        o.user_id = (select auth.uid())
        or exists (
          select 1
          from public.seller_members sm
          where sm.seller_id = o.seller_id
            and sm.user_id = (select auth.uid())
            and sm.is_active = true
        )
      )
  )
);

drop policy if exists "own order status read" on public.order_status_history;
drop policy if exists "seller staff read order status" on public.order_status_history;
create policy "customers and seller staff read order status"
on public.order_status_history for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_status_history.order_id
      and (
        o.user_id = (select auth.uid())
        or exists (
          select 1
          from public.seller_members sm
          where sm.seller_id = o.seller_id
            and sm.user_id = (select auth.uid())
            and sm.is_active = true
        )
      )
  )
);
