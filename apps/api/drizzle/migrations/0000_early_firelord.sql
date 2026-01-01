CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'member');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'pending');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'starter', 'professional', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trial', 'expired', 'cancelled', 'past_due');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'project_manager', 'hr_manager', 'member', 'guest');--> statement-breakpoint
CREATE TYPE "public"."team_level" AS ENUM('team_lead', 'senior', 'mid', 'junior', 'intern');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('pending', 'active', 'on_hold', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('created', 'updated', 'status_changed', 'assigned', 'commented', 'label_added', 'label_removed', 'time_logged', 'archived', 'restored', 'subtask_created', 'subtask_updated', 'subtask_deleted');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'review', 'done');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('task', 'meeting');--> statement-breakpoint
CREATE TYPE "public"."conversation_type" AS ENUM('direct', 'group', 'channel');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" varchar(255),
	"image" text,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"birth_date" timestamp,
	"gender" varchar(50),
	"position" varchar(100),
	"city" varchar(100),
	"country" varchar(100),
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"status" "user_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_role" DEFAULT 'member' NOT NULL,
	"invited_by" text,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"logo" text,
	"website" varchar(500),
	"industry" varchar(100),
	"team_size" varchar(50),
	"owner_id" text NOT NULL,
	"subscription_plan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"subscription_status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp,
	"billing_email" varchar(255),
	"max_members" integer DEFAULT 5 NOT NULL,
	"max_projects" integer DEFAULT 3 NOT NULL,
	"max_storage_gb" integer DEFAULT 1 NOT NULL,
	"features" jsonb DEFAULT '{"customBranding":false,"advancedReporting":false,"apiAccess":false,"ssoEnabled":false,"prioritySupport":false}'::jsonb,
	"settings" jsonb DEFAULT '{"defaultLanguage":"pl","timezone":"Europe/Warsaw","dateFormat":"DD/MM/YYYY","timeFormat":"24h","weekStartsOn":"monday","currency":"PLN","notifications":{"email":true,"inApp":true}}'::jsonb,
	"labels" jsonb DEFAULT '[{"id":"bug","name":"Bug","color":"#ef4444"},{"id":"feature","name":"Feature","color":"#10b981"},{"id":"frontend","name":"Frontend","color":"#3b82f6"},{"id":"backend","name":"Backend","color":"#8b5cf6"},{"id":"urgent","name":"Pilne","color":"#f97316"},{"id":"docs","name":"Dokumentacja","color":"#6b7280"}]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"team_level" "team_level" DEFAULT 'junior' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"avatar_url" text,
	"color" varchar(7) DEFAULT '#3B82F6' NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "industry_template_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_en" varchar(100),
	"color" varchar(7) DEFAULT '#6B7280' NOT NULL,
	"position" integer NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "industry_template_stages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "industry_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_en" varchar(100),
	"description" text,
	"icon" varchar(10),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "industry_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "industry_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) DEFAULT '#6B7280' NOT NULL,
	"position" integer NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_stages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"industry_template_id" uuid,
	"name" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(7) DEFAULT '#F87171' NOT NULL,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"start_date" timestamp,
	"deadline" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "subtasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "task_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"old_value" text,
	"new_value" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" uuid,
	"content" text NOT NULL,
	"likes" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "task_comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" "task_type" DEFAULT 'task' NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"assignee_id" text,
	"reporter_id" text NOT NULL,
	"start_date" timestamp,
	"due_date" timestamp,
	"meeting_link" varchar(512),
	"estimated_hours" integer,
	"progress" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"labels" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"description" varchar(255),
	"duration_minutes" integer NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"path" text NOT NULL,
	"size" integer NOT NULL,
	"mime_type" varchar(127) NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"task_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" varchar(100),
	"type" "conversation_type" DEFAULT 'direct' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"recurrence" jsonb,
	"task_id" uuid,
	"team_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industry_template_stages" ADD CONSTRAINT "industry_template_stages_template_id_industry_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."industry_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_industry_template_id_industry_templates_id_fk" FOREIGN KEY ("industry_template_id") REFERENCES "public"."industry_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity_log" ADD CONSTRAINT "task_activity_log_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity_log" ADD CONSTRAINT "task_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "Users can view own accounts" ON "accounts" AS PERMISSIVE FOR SELECT TO public USING (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Users can delete own accounts" ON "accounts" AS PERMISSIVE FOR DELETE TO public USING (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Users can view own sessions" ON "sessions" AS PERMISSIVE FOR SELECT TO public USING (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Users can delete own sessions" ON "sessions" AS PERMISSIVE FOR DELETE TO public USING (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Backend can manage verifications" ON "verifications" AS PERMISSIVE FOR ALL TO public USING (true);--> statement-breakpoint
CREATE POLICY "Users can view own profile" ON "users" AS PERMISSIVE FOR SELECT TO public USING (auth.uid()::text = id);--> statement-breakpoint
CREATE POLICY "Users can update own profile" ON "users" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid()::text = id);--> statement-breakpoint
CREATE POLICY "Members can view team members" ON "team_members" AS PERMISSIVE FOR SELECT TO public USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Admins can insert members" ON "team_members" AS PERMISSIVE FOR INSERT TO public WITH CHECK (team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()::text
            UNION
            SELECT team_id FROM team_members WHERE user_id = auth.uid()::text AND team_level IN ('team_lead', 'senior')
        ));--> statement-breakpoint
CREATE POLICY "Admins can delete members" ON "team_members" AS PERMISSIVE FOR DELETE TO public USING (team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()::text
            UNION
            SELECT team_id FROM team_members WHERE user_id = auth.uid()::text AND team_level IN ('team_lead', 'senior')
        ));--> statement-breakpoint
CREATE POLICY "Team members can view teams" ON "teams" AS PERMISSIVE FOR SELECT TO public USING (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text) OR owner_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Owners can update teams" ON "teams" AS PERMISSIVE FOR UPDATE TO public USING (owner_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Owners can delete teams" ON "teams" AS PERMISSIVE FOR DELETE TO public USING (owner_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Authenticated users can create teams" ON "teams" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() IS NOT NULL);--> statement-breakpoint
CREATE POLICY "Anyone can view template stages" ON "industry_template_stages" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "Anyone can view templates" ON "industry_templates" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "Team members can view project stages" ON "project_stages" AS PERMISSIVE FOR SELECT TO public USING (project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        ));--> statement-breakpoint
CREATE POLICY "Team members can create project stages" ON "project_stages" AS PERMISSIVE FOR INSERT TO public WITH CHECK (project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        ));--> statement-breakpoint
CREATE POLICY "Team members can update project stages" ON "project_stages" AS PERMISSIVE FOR UPDATE TO public USING (project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        ));--> statement-breakpoint
CREATE POLICY "Team members can view projects" ON "projects" AS PERMISSIVE FOR SELECT TO public USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Team members can create projects" ON "projects" AS PERMISSIVE FOR INSERT TO public WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Team members can update projects" ON "projects" AS PERMISSIVE FOR UPDATE TO public USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Team members can view comments" ON "task_comments" AS PERMISSIVE FOR SELECT TO public USING (task_id IN (SELECT id FROM tasks WHERE project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        )));--> statement-breakpoint
CREATE POLICY "Team members can create comments" ON "task_comments" AS PERMISSIVE FOR INSERT TO public WITH CHECK (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Users can delete own comments" ON "task_comments" AS PERMISSIVE FOR DELETE TO public USING (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Team members can view tasks" ON "tasks" AS PERMISSIVE FOR SELECT TO public USING (project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        ));--> statement-breakpoint
CREATE POLICY "Team members can create tasks" ON "tasks" AS PERMISSIVE FOR INSERT TO public WITH CHECK (project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        ));--> statement-breakpoint
CREATE POLICY "Team members can update tasks" ON "tasks" AS PERMISSIVE FOR UPDATE TO public USING (project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        ));--> statement-breakpoint
CREATE POLICY "Assignee or reporter can delete tasks" ON "tasks" AS PERMISSIVE FOR DELETE TO public USING (assignee_id = auth.uid()::text OR reporter_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Team members can view files" ON "files" AS PERMISSIVE FOR SELECT TO public USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Team members can upload files" ON "files" AS PERMISSIVE FOR INSERT TO public WITH CHECK (uploaded_by = auth.uid()::text AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Uploader can delete files" ON "files" AS PERMISSIVE FOR DELETE TO public USING (uploaded_by = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Team members can view conversations" ON "conversations" AS PERMISSIVE FOR SELECT TO public USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Team members can create conversations" ON "conversations" AS PERMISSIVE FOR INSERT TO public WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Team members can view messages" ON "messages" AS PERMISSIVE FOR SELECT TO public USING (conversation_id IN (
            SELECT id FROM conversations WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        ));--> statement-breakpoint
CREATE POLICY "Team members can send messages" ON "messages" AS PERMISSIVE FOR INSERT TO public WITH CHECK (sender_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Sender can delete own messages" ON "messages" AS PERMISSIVE FOR DELETE TO public USING (sender_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Team members can view events" ON "calendar_events" AS PERMISSIVE FOR SELECT TO public USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Team members can create events" ON "calendar_events" AS PERMISSIVE FOR INSERT TO public WITH CHECK (created_by = auth.uid()::text AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Creator can update events" ON "calendar_events" AS PERMISSIVE FOR UPDATE TO public USING (created_by = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Creator can delete events" ON "calendar_events" AS PERMISSIVE FOR DELETE TO public USING (created_by = auth.uid()::text);