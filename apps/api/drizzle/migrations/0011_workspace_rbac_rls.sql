-- =============================================================================
-- MIGRATION: 0011_workspace_rbac_rls.sql
-- Purpose: Implement RLS policies for Workspaces, Members, and RBAC tables
-- Dependencies: 0010_equal_hellion.sql
-- =============================================================================

-- Enable RLS on tables
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- WORKSPACES POLICIES
-- =============================================================================

-- Users can view workspaces they are a member of
CREATE POLICY "Users can view joined workspaces" ON "workspaces"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "workspace_members"
            WHERE "workspace_members"."workspace_id" = "workspaces"."id"
            AND "workspace_members"."user_id" = auth.uid()::text
        )
    );

-- Workspace owners can update their workspaces
CREATE POLICY "Workspace owners can update workspace" ON "workspaces"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "workspace_members"
            WHERE "workspace_members"."workspace_id" = "workspaces"."id"
            AND "workspace_members"."user_id" = auth.uid()::text
            AND "workspace_members"."role" = 'owner'
        )
    );

-- =============================================================================
-- WORKSPACE MEMBERS POLICIES
-- =============================================================================

-- Members can view other members in their workspace
CREATE POLICY "Members can view workspace colleagues" ON "workspace_members"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "workspace_members" as "my_membership"
            WHERE "my_membership"."workspace_id" = "workspace_members"."workspace_id"
            AND "my_membership"."user_id" = auth.uid()::text
        )
    );

-- Admins/Owners can manage members
CREATE POLICY "Admins can manage workspace members" ON "workspace_members"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "workspace_members" as "requester"
            WHERE "requester"."workspace_id" = "workspace_members"."workspace_id"
            AND "requester"."user_id" = auth.uid()::text
            AND "requester"."role" IN ('owner', 'admin')
        )
    );

-- =============================================================================
-- ROLES POLICIES (RBAC definitions)
-- =============================================================================

-- Members can view roles defined in their workspace
CREATE POLICY "Members can view workspace roles" ON "roles"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "workspace_members"
            WHERE "workspace_members"."workspace_id" = "roles"."workspace_id"
            AND "workspace_members"."user_id" = auth.uid()::text
        )
    );

-- Admins/Owners can manage roles
CREATE POLICY "Admins can manage workspace roles" ON "roles"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "workspace_members"
            WHERE "workspace_members"."workspace_id" = "roles"."workspace_id"
            AND "workspace_members"."user_id" = auth.uid()::text
            AND "workspace_members"."role" IN ('owner', 'admin')
        )
    );

-- =============================================================================
-- USER ROLES POLICIES (Assignments)
-- =============================================================================

-- Members can view user roles in their workspace
CREATE POLICY "Members can view assigned roles" ON "user_roles"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "workspace_members"
            WHERE "workspace_members"."workspace_id" = "user_roles"."workspace_id"
            AND "workspace_members"."user_id" = auth.uid()::text
        )
    );

-- Admins/Owners can assign/revoke roles
CREATE POLICY "Admins can manage user roles" ON "user_roles"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "workspace_members"
            WHERE "workspace_members"."workspace_id" = "user_roles"."workspace_id"
            AND "workspace_members"."user_id" = auth.uid()::text
            AND "workspace_members"."role" IN ('owner', 'admin')
        )
    );
