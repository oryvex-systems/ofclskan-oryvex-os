-- Analytics layer for TIKLADOY + BURGERMY FOOD OPS.
create or replace view public.ops_sales_daily as
select
  date(o.created_at) as metric_date,
  o.seller_id,
  o.branch_id,
  count(*) filter (where o.status <> 'cancelled')::int as orders_count,
  count(*) filter (where o.status = 'delivered')::int as delivered_count,
  count(*) filter (where o.status = 'cancelled')::int as cancelled_count,
  coalesce(sum(o.total_amount) filter (where o.status = 'delivered' or o.payment_status = 'paid'),0)::numeric as gross_revenue,
  coalesce(avg(o.total_amount) filter (where o.status <> 'cancelled'),0)::numeric as avg_order_value
from public.orders o
group by date(o.created_at),o.seller_id,o.branch_id;

create or replace view public.ops_product_sales_30d as
select
  o.seller_id,
  o.branch_id,
  oi.product_id,
  oi.product_name,
  sum(oi.quantity)::int as quantity_sold,
  sum(oi.line_total)::numeric as revenue,
  count(distinct o.id)::int as order_count
from public.order_items oi
join public.orders o on o.id=oi.order_id
where o.created_at >= now()-interval '30 days'
  and o.status <> 'cancelled'
group by o.seller_id,o.branch_id,oi.product_id,oi.product_name;

create or replace view public.ops_branch_finance_30d as
with sales as (
  select seller_id,branch_id,
    coalesce(sum(total_amount) filter (where status='delivered' or payment_status='paid'),0)::numeric revenue,
    count(*) filter (where status<>'cancelled')::int orders_count
  from public.orders
  where created_at>=now()-interval '30 days'
  group by seller_id,branch_id
), cash as (
  select seller_id,branch_id,
    coalesce(sum(case when type='income' then amount else 0 end),0)::numeric extra_income,
    coalesce(sum(case when type='expense' then amount else 0 end),0)::numeric expenses
  from public.ops_cash_entries
  where entry_date>=current_date-29
  group by seller_id,branch_id
)
select
  coalesce(s.seller_id,c.seller_id) seller_id,
  coalesce(s.branch_id,c.branch_id) branch_id,
  coalesce(s.orders_count,0) orders_count,
  coalesce(s.revenue,0) revenue,
  coalesce(c.extra_income,0) extra_income,
  coalesce(c.expenses,0) expenses,
  (coalesce(s.revenue,0)+coalesce(c.extra_income,0)-coalesce(c.expenses,0))::numeric net_operating_cash
from sales s
full join cash c on c.seller_id=s.seller_id and c.branch_id is not distinct from s.branch_id;

create or replace view public.ops_courier_performance_30d as
select
  c.id courier_id,
  c.seller_id,
  c.branch_id,
  c.display_name,
  count(distinct o.id) filter (where o.status='delivered')::int delivered_orders,
  count(distinct o.id) filter (where o.status='cancelled')::int cancelled_orders
from public.ops_couriers c
left join public.orders o on o.id=c.active_order_id and o.created_at>=now()-interval '30 days'
group by c.id,c.seller_id,c.branch_id,c.display_name;

grant select on public.ops_sales_daily, public.ops_product_sales_30d, public.ops_branch_finance_30d, public.ops_courier_performance_30d to authenticated;
