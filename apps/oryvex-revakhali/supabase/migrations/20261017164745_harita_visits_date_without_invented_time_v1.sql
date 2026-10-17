-- Preserve date-only field records without fabricating an exact clock time.
alter table public.harita_site_visits add column if not exists visit_date date;
alter table public.harita_site_visits alter column visited_at drop not null;

