-- =============================================================================
-- Sprint 6D: Fix Schema Types Mismatch
-- =============================================================================
-- This migration fixes the column type for created_by which might have been 
-- incorrectly created as UUID via drizzle-kit push, causing 500 errors.
-- =============================================================================

-- 1. Drop conflicting policies
DROP POLICY IF EXISTS "Members can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Members can add messages to their conversations" ON conversations;

-- 2. Fix conversations.created_by type (UUID -> TEXT) and team_id (DROP NOT NULL)
ALTER TABLE conversations ALTER COLUMN created_by TYPE text USING created_by::text;
ALTER TABLE conversations ALTER COLUMN team_id DROP NOT NULL;

-- 3. Re-establish Foreign Key
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_created_by_fkey;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_created_by_users_id_fk;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversations_created_by_fkey'
    ) THEN
        ALTER TABLE conversations 
        ADD CONSTRAINT conversations_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Recreate Policies
CREATE POLICY "Members can view their conversations" 
ON conversations FOR SELECT 
USING (
    auth.uid()::text = ANY(SELECT jsonb_array_elements_text(participants))
    OR 
    created_by = auth.uid()::text
);

CREATE POLICY "Members can add messages to their conversations" 
ON conversations FOR UPDATE
USING (
    auth.uid()::text = ANY(SELECT jsonb_array_elements_text(participants))
    OR 
    created_by = auth.uid()::text
);
