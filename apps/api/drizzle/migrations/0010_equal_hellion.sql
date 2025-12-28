-- =============================================================================
-- MIGRATION: 0010_sprint_2b_teams_fix.sql
-- Purpose: Implement Sprint 2B.4 & 2B.5 changes safely
-- FINAL VERSION: Aggressively cleans dependencies
-- =============================================================================

-- 1. ROBUSTLY DROP ALL POLICIES on ALL business tables
-- This ensures no RLS dependency blocks the type change
DO $$ 
DECLARE 
    r RECORD;
    tables text[] := ARRAY[
        'teams', 'team_members', 
        'projects', 'project_stages',
        'tasks', 'subtasks', 'task_labels', 'labels', 'task_comments', 'task_activity_log', 'time_entries',
        'files', 'conversations', 'messages', 'calendar_events'
    ];
BEGIN 
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE tablename = ANY(tables)
    ) LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename); 
    END LOOP; 
END $$;

-- 2. Alter column types to match users.id (text)
ALTER TABLE "team_members" ALTER COLUMN "user_id" SET DATA TYPE text;
ALTER TABLE "teams" ALTER COLUMN "owner_id" SET DATA TYPE text;

-- 3. Add workspace_id hierarchy
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "workspace_id" text;

-- Backfill existing teams with a default workspace if needed
DO $$
DECLARE
    default_ws_id text;
BEGIN
    SELECT id INTO default_ws_id FROM workspaces LIMIT 1;
    IF default_ws_id IS NOT NULL THEN
        UPDATE "teams" SET "workspace_id" = default_ws_id WHERE "workspace_id" IS NULL;
    END IF;
END $$;

-- Update valid constraints
ALTER TABLE "teams" ALTER COLUMN "workspace_id" SET NOT NULL;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_workspace_id_workspaces_id_fk') THEN
        ALTER TABLE "teams" ADD CONSTRAINT "teams_workspace_id_workspaces_id_fk" 
            FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

-- 4. Recreate Core RLS policies (adjust as needed for specific logic)

-- Teams policies
CREATE POLICY "Team members can view team" ON teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Team owners can update team" ON teams
    FOR UPDATE USING (owner_id = auth.uid()::text);

-- Team members policies
CREATE POLICY "Team members can view members" ON team_members
    FOR SELECT USING (
        user_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Team owners can manage members" ON team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = team_members.team_id
            AND teams.owner_id = auth.uid()::text
        )
    );

-- Projects policies
CREATE POLICY "Team members can view projects" ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = projects.team_id
            AND team_members.user_id = auth.uid()::text
        )
    );

-- Labels policies
CREATE POLICY "Team members can view labels" ON labels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = labels.project_id
            AND tm.user_id = auth.uid()::text
        )
    );
    
-- Tasks policies
CREATE POLICY "Team members can view tasks" ON tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = tasks.project_id
            AND tm.user_id = auth.uid()::text
        )
    );

-- Subtasks policies (re-added)
CREATE POLICY "Team members can view subtasks" ON subtasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks t
            INNER JOIN projects p ON p.id = t.project_id
            INNER JOIN team_members tm ON tm.team_id = p.team_id
            WHERE t.id = subtasks.task_id
            AND tm.user_id = auth.uid()::text
        )
    );
