-- =============================================================================
-- MIGRATION: Reset auth tables with TEXT type for Better Auth
-- ⚠️ This will DELETE all data in auth tables!
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Step 1: Drop all RLS policies
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON accounts;
DROP POLICY IF EXISTS "Backend can manage verifications" ON verifications;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Also drop policies from other tables that reference users
DROP POLICY IF EXISTS "Team members can view teams" ON teams;
DROP POLICY IF EXISTS "Owners can update teams" ON teams;
DROP POLICY IF EXISTS "Owners can delete teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON teams;
DROP POLICY IF EXISTS "Members can view team members" ON team_members;
DROP POLICY IF EXISTS "Admins can insert members" ON team_members;
DROP POLICY IF EXISTS "Admins can delete members" ON team_members;
DROP POLICY IF EXISTS "Team members can view projects" ON projects;
DROP POLICY IF EXISTS "Team members can create projects" ON projects;
DROP POLICY IF EXISTS "Team members can update projects" ON projects;
DROP POLICY IF EXISTS "Team members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Team members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Team members can update tasks" ON tasks;
DROP POLICY IF EXISTS "Assignee or reporter can delete tasks" ON tasks;
DROP POLICY IF EXISTS "Team members can view comments" ON task_comments;
DROP POLICY IF EXISTS "Team members can create comments" ON task_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON task_comments;
DROP POLICY IF EXISTS "Team members can view files" ON files;
DROP POLICY IF EXISTS "Team members can upload files" ON files;
DROP POLICY IF EXISTS "Uploader can delete files" ON files;
DROP POLICY IF EXISTS "Team members can view conversations" ON conversations;
DROP POLICY IF EXISTS "Team members can create conversations" ON conversations;
DROP POLICY IF EXISTS "Team members can view messages" ON messages;
DROP POLICY IF EXISTS "Team members can send messages" ON messages;
DROP POLICY IF EXISTS "Sender can delete own messages" ON messages;
DROP POLICY IF EXISTS "Team members can view events" ON calendar_events;
DROP POLICY IF EXISTS "Team members can create events" ON calendar_events;
DROP POLICY IF EXISTS "Creator can update events" ON calendar_events;
DROP POLICY IF EXISTS "Creator can delete events" ON calendar_events;

-- Step 2: Drop auth tables (they will be recreated)
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS verifications CASCADE;

-- Step 3: Drop foreign keys referencing users.id
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_user_id_users_id_fk;
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_owner_id_users_id_fk;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_users_id_fk;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_reporter_id_users_id_fk;
ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_user_id_users_id_fk;
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_uploaded_by_users_id_fk;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_users_id_fk;
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_created_by_users_id_fk;

-- Step 4: Alter users table id to text
ALTER TABLE users ALTER COLUMN id SET DATA TYPE text USING id::text;
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;

-- Step 5: Alter foreign key columns in other tables to text
ALTER TABLE team_members ALTER COLUMN user_id SET DATA TYPE text USING user_id::text;
ALTER TABLE teams ALTER COLUMN owner_id SET DATA TYPE text USING owner_id::text;
ALTER TABLE tasks ALTER COLUMN assignee_id SET DATA TYPE text USING assignee_id::text;
ALTER TABLE tasks ALTER COLUMN reporter_id SET DATA TYPE text USING reporter_id::text;
ALTER TABLE task_comments ALTER COLUMN user_id SET DATA TYPE text USING user_id::text;
ALTER TABLE files ALTER COLUMN uploaded_by SET DATA TYPE text USING uploaded_by::text;
ALTER TABLE messages ALTER COLUMN sender_id SET DATA TYPE text USING sender_id::text;
ALTER TABLE calendar_events ALTER COLUMN created_by SET DATA TYPE text USING created_by::text;

-- Step 6: Recreate auth tables with text IDs
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  access_token_expires_at TIMESTAMP,
  refresh_token_expires_at TIMESTAMP,
  scope TEXT,
  id_token TEXT,
  password TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE verifications (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Step 7: Recreate foreign keys with text type
ALTER TABLE team_members ADD CONSTRAINT team_members_user_id_users_id_fk 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  
ALTER TABLE teams ADD CONSTRAINT teams_owner_id_users_id_fk 
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
  
ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_id_users_id_fk 
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;
  
ALTER TABLE tasks ADD CONSTRAINT tasks_reporter_id_users_id_fk 
  FOREIGN KEY (reporter_id) REFERENCES users(id);
  
ALTER TABLE task_comments ADD CONSTRAINT task_comments_user_id_users_id_fk 
  FOREIGN KEY (user_id) REFERENCES users(id);
  
ALTER TABLE files ADD CONSTRAINT files_uploaded_by_users_id_fk 
  FOREIGN KEY (uploaded_by) REFERENCES users(id);
  
ALTER TABLE messages ADD CONSTRAINT messages_sender_id_users_id_fk 
  FOREIGN KEY (sender_id) REFERENCES users(id);
  
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_created_by_users_id_fk 
  FOREIGN KEY (created_by) REFERENCES users(id);

-- Step 8: Enable RLS on new tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- Step 9: Create basic RLS policies for auth tables
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

CREATE POLICY "Users can delete own sessions" ON sessions
  FOR DELETE USING (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

CREATE POLICY "Users can view own accounts" ON accounts
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

CREATE POLICY "Users can delete own accounts" ON accounts
  FOR DELETE USING (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

CREATE POLICY "Backend can manage verifications" ON verifications
  FOR ALL USING (true);

-- Basic user policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (true); -- Allow reading for now

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (email = current_setting('request.jwt.claims', true)::json->>'email');