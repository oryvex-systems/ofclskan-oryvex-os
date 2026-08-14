create policy "oryvex members can create tasks"
on public.oryvex_tasks for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.oryvex_workspace_members m
    where m.workspace_id = oryvex_tasks.workspace_id
      and m.user_id = (select auth.uid())
  )
);

create policy "oryvex task owners can update tasks"
on public.oryvex_tasks for update
to authenticated
using (
  created_by = (select auth.uid())
  or assigned_to = (select auth.uid())
  or exists (
    select 1 from public.oryvex_workspace_members m
    where m.workspace_id = oryvex_tasks.workspace_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.oryvex_workspace_members m
    where m.workspace_id = oryvex_tasks.workspace_id
      and m.user_id = (select auth.uid())
  )
);

create policy "oryvex task owners can delete tasks"
on public.oryvex_tasks for delete
to authenticated
using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.oryvex_workspace_members m
    where m.workspace_id = oryvex_tasks.workspace_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner','admin')
  )
);
