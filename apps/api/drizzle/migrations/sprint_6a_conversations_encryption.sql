-- ============================================================================= 
-- Sprint 6A: Conversations & Encryption Keys Migration
-- =============================================================================
-- Run this migration manually using your PostgreSQL client
-- DO NOT run drizzle-kit push - apply this SQL directly
-- =============================================================================

-- Step 1: Add new columns to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL REFERENCES users(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP;

-- Step 2: Add foreign key constraint for created_by if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversations_created_by_fkey'
    ) THEN
        ALTER TABLE conversations 
        ADD CONSTRAINT conversations_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id);
    END IF;
END $$;

-- Step 3: Create encryption_keys table
CREATE TABLE IF NOT EXISTS encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    rotated_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_id ON conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversations_team_id ON conversations(team_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);

-- JSONB indexes for participants array
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN(participants);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_workspace_id ON encryption_keys(workspace_id);

-- Step 5: Update RLS policies for conversations
-- Note: Adjust these based on your auth setup

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Team members can view conversations" ON conversations;
DROP POLICY IF EXISTS "Team members can create conversations" ON conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;

-- Recreate policies
CREATE POLICY "Team members can view conversations" ON conversations
    FOR SELECT
    USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "Team members can create conversations" ON conversations
    FOR INSERT
    WITH CHECK (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "Participants can update conversations" ON conversations
    FOR UPDATE
    USING (
        participants @> to_jsonb(ARRAY[auth.uid()::text])
    );

-- Step 6: Comments for documentation
COMMENT ON TABLE conversations IS 'Stores conversations with JSONB-based message storage for encrypted messaging';
COMMENT ON COLUMN conversations.messages IS 'JSONB array containing encrypted message objects';
COMMENT ON COLUMN conversations.participants IS 'JSONB array of user IDs who are participants in the conversation';
COMMENT ON TABLE encryption_keys IS 'Stores workspace-level encryption keys for end-to-end encrypted messaging';

-- Step 7: Drop legacy messages table if requested
DROP TABLE IF EXISTS messages;

-- Step 8: Enable RLS and add policies for encryption_keys
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view encryption keys" ON encryption_keys
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "Workspace owners can manage encryption keys" ON encryption_keys
    FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()::text AND role = 'owner'
        )
    );

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- Next steps:
-- 1. Verify all tables and columns exist
-- 2. Test creating a conversation
-- 3. Test adding messages to JSONB array
-- 4. Generate encryption keys for existing workspaces (if needed)
-- =============================================================================
