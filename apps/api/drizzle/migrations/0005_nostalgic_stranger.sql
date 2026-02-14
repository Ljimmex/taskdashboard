ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "permissions_read_policy" ON "permissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "role_permissions_read_policy" ON "role_permissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "roles_read_policy" ON "roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "roles_admin_policy" ON "roles" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid()::text IN (SELECT user_id FROM workspace_members WHERE role = 'owner'));--> statement-breakpoint
CREATE POLICY "audit_insert" ON "audit_logs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "audit_read" ON "audit_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
            select 1 from workspace_members 
            where workspace_id = "audit_logs"."workspace_id" 
            and user_id = auth.uid()::text 
            and (role = 'owner' or role = 'admin')
        ));