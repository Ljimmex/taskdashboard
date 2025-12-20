-- =============================================================================
-- RLS POLICIES FOR AUTH TABLES
-- Run this in Supabase SQL Editor after migration
-- =============================================================================

-- Enable RLS on auth tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SESSIONS POLICIES
-- Sessions are managed by the backend with service_role key
-- =============================================================================

-- Users can only view their own sessions
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (user_id = auth.uid());

-- Users can delete their own sessions (logout)
CREATE POLICY "Users can delete own sessions" ON sessions
  FOR DELETE USING (user_id = auth.uid());

-- Backend inserts sessions (using service_role key bypasses RLS)
-- No INSERT policy needed - handled by service_role

-- =============================================================================
-- ACCOUNTS POLICIES
-- OAuth accounts linked to users
-- =============================================================================

-- Users can view their own accounts
CREATE POLICY "Users can view own accounts" ON accounts
  FOR SELECT USING (user_id = auth.uid());

-- Users can delete their own OAuth connections
CREATE POLICY "Users can delete own accounts" ON accounts
  FOR DELETE USING (user_id = auth.uid());

-- =============================================================================
-- VERIFICATIONS POLICIES
-- Email verification and password reset tokens
-- These are temporary and handled by backend
-- =============================================================================

-- Verifications are managed entirely by backend
-- No direct user access needed
-- Service role key will bypass RLS for all operations

-- Optional: Allow backend to clean up expired verifications
CREATE POLICY "Backend can manage verifications" ON verifications
  FOR ALL USING (true);
