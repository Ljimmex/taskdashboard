-- Hardware RLS for notification_inboxes
begin;
  -- Enable RLS
  alter table public.notification_inboxes enable row level security;
  
  -- Drop existing temporary policies
  drop policy if exists "Users can see their own notifications" on public.notification_inboxes;
  drop policy if exists "notification_inboxes_select_policy" on public.notification_inboxes;
  drop policy if exists "notification_inboxes_insert_policy" on public.notification_inboxes;
  drop policy if exists "notification_inboxes_update_policy" on public.notification_inboxes;
  drop policy if exists "notification_inboxes_delete_policy" on public.notification_inboxes;

  -- Create formal policies
  create policy "notification_inboxes_select_policy"
    on public.notification_inboxes
    for select
    to authenticated
    using (auth.uid()::text = user_id);

  create policy "notification_inboxes_insert_policy"
    on public.notification_inboxes
    for insert
    to authenticated
    with check (auth.uid()::text = user_id);

  create policy "notification_inboxes_update_policy"
    on public.notification_inboxes
    for update
    to authenticated
    using (auth.uid()::text = user_id)
    with check (auth.uid()::text = user_id);

  create policy "notification_inboxes_delete_policy"
    on public.notification_inboxes
    for delete
    to authenticated
    using (auth.uid()::text = user_id);

  -- Ensure replica identity is full (for JSONB Realtime filtering)
  alter table public.notification_inboxes replica identity full;
commit;
