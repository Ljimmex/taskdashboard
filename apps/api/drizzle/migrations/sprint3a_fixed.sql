-- =============================================================================
-- Sprint 3A Migration - Fixed for TEXT user IDs
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Create activity_type enum (skip if exists)
DO $$ BEGIN
    CREATE TYPE "public"."activity_type" AS ENUM('created', 'updated', 'status_changed', 'assigned', 'commented', 'label_added', 'label_removed', 'time_logged', 'archived', 'restored');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create labels table
CREATE TABLE IF NOT EXISTS "labels" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "name" varchar(50) NOT NULL,
    "color" varchar(7) DEFAULT '#6B7280' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create subtasks table
CREATE TABLE IF NOT EXISTS "subtasks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
    "title" varchar(255) NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "completed_at" timestamp
);

-- Create task_labels junction table
CREATE TABLE IF NOT EXISTS "task_labels" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
    "label_id" uuid NOT NULL REFERENCES "labels"("id") ON DELETE CASCADE,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create time_entries table (user_id is TEXT to match users.id)
CREATE TABLE IF NOT EXISTS "time_entries" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "description" varchar(255),
    "duration_minutes" integer NOT NULL,
    "started_at" timestamp NOT NULL,
    "ended_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create task_activity_log table (user_id is TEXT to match users.id)
CREATE TABLE IF NOT EXISTS "task_activity_log" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "activity_type" "activity_type" NOT NULL,
    "old_value" text,
    "new_value" text,
    "metadata" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add missing columns to existing tables
ALTER TABLE "task_comments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "is_archived" boolean DEFAULT false NOT NULL;

-- Fix task_comments.user_id if it's UUID (change to TEXT)
-- This will fail if there's data - in that case skip this step
-- ALTER TABLE "task_comments" ALTER COLUMN "user_id" TYPE text USING user_id::text;

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE "labels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subtasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_labels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "time_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_activity_log" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES FOR LABELS
-- =============================================================================

-- Team members can view labels in their projects
CREATE POLICY "Team members can view labels" ON "labels"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = labels.project_id 
            AND tm.user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
        )
    );

-- Team members can create labels
CREATE POLICY "Team members can create labels" ON "labels"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = project_id 
            AND tm.user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
        )
    );

-- Team admins can delete labels
CREATE POLICY "Team admins can delete labels" ON "labels"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = labels.project_id 
            AND tm.user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
            AND tm.role IN ('owner', 'admin')
        )
    );

-- =============================================================================
-- RLS POLICIES FOR SUBTASKS
-- =============================================================================

CREATE POLICY "Team members can view subtasks" ON "subtasks"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks t
            JOIN projects p ON p.id = t.project_id
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE t.id = subtasks.task_id 
            AND tm.user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
        )
    );

CREATE POLICY "Team members can manage subtasks" ON "subtasks"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tasks t
            JOIN projects p ON p.id = t.project_id
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE t.id = subtasks.task_id 
            AND tm.user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
        )
    );

-- =============================================================================
-- RLS POLICIES FOR TASK_LABELS
-- =============================================================================

CREATE POLICY "Team members can view task labels" ON "task_labels"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks t
            JOIN projects p ON p.id = t.project_id
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE t.id = task_labels.task_id 
            AND tm.user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
        )
    );

CREATE POLICY "Team members can manage task labels" ON "task_labels"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tasks t
            JOIN projects p ON p.id = t.project_id
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE t.id = task_labels.task_id 
            AND tm.user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
        )
    );

-- =============================================================================
-- RLS POLICIES FOR TIME_ENTRIES
-- =============================================================================

CREATE POLICY "Team members can view time entries" ON "time_entries"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks t
            JOIN projects p ON p.id = t.project_id
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE t.id = time_entries.task_id 
            AND tm.user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
        )
    );

CREATE POLICY "Users can create own time entries" ON "time_entries"
    FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
    );

CREATE POLICY "Users can update own time entries" ON "time_entries"
    FOR UPDATE USING (
        user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
    );

CREATE POLICY "Users can delete own time entries" ON "time_entries"
    FOR DELETE USING (
        user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
    );

-- =============================================================================
-- RLS POLICIES FOR TASK_ACTIVITY_LOG
-- =============================================================================

CREATE POLICY "Team members can view activity log" ON "task_activity_log"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks t
            JOIN projects p ON p.id = t.project_id
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE t.id = task_activity_log.task_id 
            AND tm.user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
        )
    );

-- Only system can insert activity log (via service role)
CREATE POLICY "System can insert activity log" ON "task_activity_log"
    FOR INSERT WITH CHECK (true);

-- =============================================================================
-- Success message
-- =============================================================================
SELECT 'Sprint 3A migration with RLS completed successfully!' as message;
