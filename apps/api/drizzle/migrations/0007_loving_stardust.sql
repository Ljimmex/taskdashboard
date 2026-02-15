ALTER TABLE "project_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_teams" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "Project members can view members" ON "project_members";--> statement-breakpoint
CREATE POLICY "Project members can view members" ON "project_members" AS PERMISSIVE FOR SELECT TO public USING (project_id IN (SELECT id FROM projects WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)) OR project_id IN (SELECT project_id FROM project_teams WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)));--> statement-breakpoint
DROP POLICY IF EXISTS "Project members can manage memberships" ON "project_members";--> statement-breakpoint
CREATE POLICY "Project members can manage memberships" ON "project_members" AS PERMISSIVE FOR ALL TO public USING (project_id IN (SELECT id FROM projects WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)) OR project_id IN (SELECT project_id FROM project_teams WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)));--> statement-breakpoint
DROP POLICY IF EXISTS "Team members can view project teams" ON "project_teams";--> statement-breakpoint
CREATE POLICY "Team members can view project teams" ON "project_teams" AS PERMISSIVE FOR SELECT TO public USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
DROP POLICY IF EXISTS "Team members can manage project teams" ON "project_teams";--> statement-breakpoint
CREATE POLICY "Team members can manage project teams" ON "project_teams" AS PERMISSIVE FOR ALL TO public USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));
--> statement-breakpoint
DROP POLICY IF EXISTS "Team members can view projects" ON "projects";--> statement-breakpoint
CREATE POLICY "Team members can view projects" ON "projects" AS PERMISSIVE FOR SELECT TO public USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text) OR id IN (SELECT project_id FROM project_teams WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)));--> statement-breakpoint
DROP POLICY IF EXISTS "Team members can update projects" ON "projects";--> statement-breakpoint
CREATE POLICY "Team members can update projects" ON "projects" AS PERMISSIVE FOR UPDATE TO public USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text) OR id IN (SELECT project_id FROM project_teams WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)));