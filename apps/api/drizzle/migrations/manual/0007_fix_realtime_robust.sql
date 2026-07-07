-- Aggressive Realtime enablement for notification_inboxes
begin;
  -- Ensure RLS is enabled (Realtime works better with RLS enabled and policies)
  alter table public.notification_inboxes enable row level security;
  
  -- Add policy for the user to select their own row
  drop policy if exists "Users can see their own notifications" on public.notification_inboxes;
  create policy "Users can see their own notifications"
    on public.notification_inboxes
    for select
    using (auth.uid()::text = user_id);

  -- Set replica identity to FULL to ensure the entire JSONB payload is sent
  -- This is often required for filtering to work reliably on text/PK columns in Realtime
  alter table public.notification_inboxes replica identity full;

  -- Ensure it's in the publication
  do $$
  begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
      if not exists (
        select 1 from pg_publication_tables 
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notification_inboxes'
      ) then
        alter publication supabase_realtime add table public.notification_inboxes;
      end if;
    end if;
  end $$;
commit;
