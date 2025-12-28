-- =============================================================================
-- MIGRATION: 0012_onboarding_fields.sql
-- Purpose: Support new onboarding flow (Step 2: Position, Step 3: Workspace details)
-- 1. Users: Replace 'phone' with 'position'
-- 2. Workspaces: Add 'industry' and 'team_size'
-- =============================================================================

-- 1. USERS TABLE CHANGES
-- Remove phone (if exists) and add position
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE "users" DROP COLUMN "phone";
    END IF;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "position" varchar(100);

-- 2. WORKSPACES TABLE CHANGES
-- Add industry and team_size
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "industry" varchar(100);
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "team_size" varchar(50);
