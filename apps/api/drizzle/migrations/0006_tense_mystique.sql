CREATE TABLE "project_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ALTER COLUMN "team_ids" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "calendar_events" ALTER COLUMN "team_ids" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "attendee_ids" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "project_teams" ADD CONSTRAINT "project_teams_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_teams" ADD CONSTRAINT "project_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER POLICY "Team members can view events" ON "calendar_events" TO public USING (team_ids && ARRAY(SELECT team_id FROM team_members WHERE user_id = auth.uid()::text) OR auth.uid()::text = ANY(attendee_ids) OR created_by = auth.uid()::text);--> statement-breakpoint
ALTER POLICY "roles_admin_policy" ON "roles" TO authenticated USING (auth.uid()::text IN (SELECT user_id FROM workspace_members WHERE role = 'owner'));--> statement-breakpoint
ALTER POLICY "audit_read" ON "audit_logs" TO authenticated USING (exists (
            select 1 from workspace_members 
            where workspace_id = "audit_logs"."workspace_id" 
            and user_id = auth.uid()::text
            and (role = 'owner' or role = 'admin')
        ));