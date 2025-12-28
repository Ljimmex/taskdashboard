-- =============================================================================
-- CONSOLIDATED MIGRATION: Sprint 2B - Workspaces, Teams & RBAC
-- Merges migrations: 0006, 0007, 0008, 0009
-- Idempotent - safe to run multiple times
-- =============================================================================

-- =============================================================================
-- 1. CREATE ENUMS (with existence check)
-- =============================================================================

-- Workspace enums
DO $$ BEGIN
    CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'starter', 'professional', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trial', 'expired', 'cancelled', 'past_due');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'member', 'guest');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Role system enums
DO $$ BEGIN
    CREATE TYPE "public"."role_type" AS ENUM('global', 'team');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."role_level" AS ENUM('owner', 'admin', 'project_manager', 'hr_manager', 'member', 'team_lead', 'senior', 'mid', 'junior', 'intern');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- 2. CREATE TABLES (with IF NOT EXISTS)
-- =============================================================================

-- Workspace Members (M:N between workspaces and users)
CREATE TABLE IF NOT EXISTS "workspace_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_role" DEFAULT 'member' NOT NULL,
	"invited_by" text,
	"joined_at" timestamp DEFAULT now() NOT NULL
);

-- Roles (global and team-specific)
CREATE TABLE IF NOT EXISTS "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"type" "role_type" NOT NULL,
	"level" "role_level" NOT NULL,
	"workspace_id" text NOT NULL,
	"team_id" uuid,
	"permissions" jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- User Roles (assigns roles to users)
CREATE TABLE IF NOT EXISTS "user_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"team_id" uuid,
	"assigned_by" text,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);

-- =============================================================================
-- 3. MODIFY EXISTING TABLES (with existence checks)
-- =============================================================================

-- Update workspaces settings default
DO $$ BEGIN
    ALTER TABLE "workspaces" ALTER COLUMN "settings" SET DEFAULT '{"defaultLanguage":"pl","timezone":"Europe/Warsaw","dateFormat":"DD/MM/YYYY","timeFormat":"24h","weekStartsOn":"monday","currency":"PLN","notifications":{"email":true,"inApp":true}}'::jsonb;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

-- Add columns to workspaces (with existence checks)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'description') THEN
        ALTER TABLE "workspaces" ADD COLUMN "description" text;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'logo') THEN
        ALTER TABLE "workspaces" ADD COLUMN "logo" text;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'website') THEN
        ALTER TABLE "workspaces" ADD COLUMN "website" varchar(500);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'subscription_plan') THEN
        ALTER TABLE "workspaces" ADD COLUMN "subscription_plan" "subscription_plan" DEFAULT 'free' NOT NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'subscription_status') THEN
        ALTER TABLE "workspaces" ADD COLUMN "subscription_status" "subscription_status" DEFAULT 'trial' NOT NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'trial_ends_at') THEN
        ALTER TABLE "workspaces" ADD COLUMN "trial_ends_at" timestamp;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'billing_email') THEN
        ALTER TABLE "workspaces" ADD COLUMN "billing_email" varchar(255);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'max_members') THEN
        ALTER TABLE "workspaces" ADD COLUMN "max_members" integer DEFAULT 5 NOT NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'max_projects') THEN
        ALTER TABLE "workspaces" ADD COLUMN "max_projects" integer DEFAULT 3 NOT NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'max_storage_gb') THEN
        ALTER TABLE "workspaces" ADD COLUMN "max_storage_gb" integer DEFAULT 1 NOT NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'features') THEN
        ALTER TABLE "workspaces" ADD COLUMN "features" jsonb DEFAULT '{"customBranding":false,"advancedReporting":false,"apiAccess":false,"ssoEnabled":false,"prioritySupport":false}'::jsonb;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'is_active') THEN
        ALTER TABLE "workspaces" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
    END IF;
END $$;

-- =============================================================================
-- 4. ADD FOREIGN KEY CONSTRAINTS (with existence checks)
-- =============================================================================

-- Workspace Members constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_workspace_id_workspaces_id_fk') THEN
        ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" 
            FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_user_id_users_id_fk') THEN
        ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" 
            FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_invited_by_users_id_fk') THEN
        ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_invited_by_users_id_fk" 
            FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;

-- Roles constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_workspace_id_workspaces_id_fk') THEN
        ALTER TABLE "roles" ADD CONSTRAINT "roles_workspace_id_workspaces_id_fk" 
            FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_team_id_teams_id_fk') THEN
        ALTER TABLE "roles" ADD CONSTRAINT "roles_team_id_teams_id_fk" 
            FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

-- User Roles constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_role_id_roles_id_fk') THEN
        ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" 
            FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_workspace_id_workspaces_id_fk') THEN
        ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_workspace_id_workspaces_id_fk" 
            FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_team_id_teams_id_fk') THEN
        ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_team_id_teams_id_fk" 
            FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
