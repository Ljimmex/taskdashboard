-- Enable RLS on project_members
ALTER TABLE "project_members" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PROJECT MEMBERS POLICIES
-- =============================================================================

-- 1. Users can view project members if they are in the same workspace
-- Path: project_members -> projects -> teams -> workspaces -> workspace_members
CREATE POLICY "Users can view project members in their workspace" ON "project_members"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "projects" p
            JOIN "teams" t ON p."team_id" = t."id"
            JOIN "workspace_members" wm ON t."workspace_id" = wm."workspace_id"
            WHERE p."id" = "project_members"."project_id"
            AND wm."user_id" = auth.uid()::text
        )
    );

-- 2. Workspace Admins/Owners can manage project members
CREATE POLICY "Admins can manage project members" ON "project_members"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "projects" p
            JOIN "teams" t ON p."team_id" = t."id"
            JOIN "workspace_members" wm ON t."workspace_id" = wm."workspace_id"
            WHERE p."id" = "project_members"."project_id"
            AND wm."user_id" = auth.uid()::text
            AND wm."role" IN ('owner', 'admin')
        )
    );

-- 3. Project self-management (optional): Members can leave project?
--    Keeping it simple for now: only admins manage membership.
