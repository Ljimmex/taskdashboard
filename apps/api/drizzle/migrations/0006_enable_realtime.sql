-- Enable Realtime for specific tables
begin;
  -- Remove existing if any (to avoid duplicates, though Supabase handles it usually)
  -- But adding to publication is the standard way.
  
  -- Check if tables are already in the publication to avoid errors
  -- However, in a migration script, we can just try to add them.
  -- If the publication doesn't exist, this might fail, but in Supabase it's always there.
  
  alter publication supabase_realtime add table notification_inboxes;
  alter publication supabase_realtime add table files;
  alter publication supabase_realtime add table folders;
commit;
