CREATE TABLE "saved_filters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"filters" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_filters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "task_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"template_data" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "Users can view own filters or shared filters" ON "saved_filters" AS PERMISSIVE FOR SELECT TO public USING (user_id = auth.uid()::text OR is_shared = true);--> statement-breakpoint
CREATE POLICY "Users can create own filters" ON "saved_filters" AS PERMISSIVE FOR INSERT TO public WITH CHECK (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Users can update own filters" ON "saved_filters" AS PERMISSIVE FOR UPDATE TO public USING (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Users can delete own filters" ON "saved_filters" AS PERMISSIVE FOR DELETE TO public USING (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Workspace members can view templates" ON "task_templates" AS PERMISSIVE FOR SELECT TO public USING (workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
        ));--> statement-breakpoint
CREATE POLICY "Workspace members can create templates" ON "task_templates" AS PERMISSIVE FOR INSERT TO public WITH CHECK (workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
        ));--> statement-breakpoint
CREATE POLICY "Template creators can update templates" ON "task_templates" AS PERMISSIVE FOR UPDATE TO public USING (created_by = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Template creators can delete templates" ON "task_templates" AS PERMISSIVE FOR DELETE TO public USING (created_by = auth.uid()::text);