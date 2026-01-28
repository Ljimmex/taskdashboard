-- =============================================================================
-- Sprint 6C: Enable Supabase Realtime for Conversations
-- =============================================================================
-- This migration enables real-time subscriptions on the conversations table
-- and adds necessary RLS policies for secure real-time access.
-- =============================================================================

-- Step 1: Enable Row Level Security on conversations (if not already enabled)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Step 2: Add conversations to Supabase Realtime publication
-- This allows clients to subscribe to real-time changes on this table
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Step 3: Drop existing policies (if any)
DROP POLICY IF EXISTS "Members can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Members can add messages to their conversations" ON conversations;
DROP POLICY IF EXISTS "Workspace members can create conversations" ON conversations;

-- Step 4: Create RLS policies for real-time access
-- Members can view conversations they're part of
CREATE POLICY "Members can view their conversations" 
ON conversations FOR SELECT 
USING (
    -- User is in participants array OR user is creator
    auth.uid()::text = ANY(
        SELECT jsonb_array_elements_text(participants)
    )
    OR 
    created_by = auth.uid()::text
);

-- Members can insert messages to conversations they're part of
CREATE POLICY "Members can add messages to their conversations" 
ON conversations FOR UPDATE
USING (
    auth.uid()::text = ANY(
        SELECT jsonb_array_elements_text(participants)
    )
    OR 
    created_by = auth.uid()::text
);

-- Workspace members can create new conversations
CREATE POLICY "Workspace members can create conversations" 
ON conversations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = conversations.workspace_id 
        AND user_id = auth.uid()::text
    )
);

-- Step 5: Create index on participants for RLS performance
CREATE INDEX IF NOT EXISTS idx_conversations_participants_gin 
ON conversations USING GIN (participants jsonb_path_ops);

-- Step 6: Grant necessary permissions for realtime
GRANT SELECT, INSERT, UPDATE ON conversations TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =============================================================================
-- Verification Query (run separately to test)
-- =============================================================================
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- Should show 'conversations' in tablename column
