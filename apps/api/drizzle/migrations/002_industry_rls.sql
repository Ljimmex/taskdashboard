-- =============================================================================
-- PART 2: RLS POLICIES (Fixed UUID casting)
-- =============================================================================

-- Enable RLS
ALTER TABLE industry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_template_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;

-- Industry Templates - public read
DROP POLICY IF EXISTS "industry_templates_select" ON industry_templates;
CREATE POLICY "industry_templates_select" ON industry_templates
    FOR SELECT USING (true);

-- Industry Template Stages - public read
DROP POLICY IF EXISTS "industry_template_stages_select" ON industry_template_stages;
CREATE POLICY "industry_template_stages_select" ON industry_template_stages
    FOR SELECT USING (true);

-- Project Stages - team members can view
DROP POLICY IF EXISTS "project_stages_select" ON project_stages;
CREATE POLICY "project_stages_select" ON project_stages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = project_stages.project_id
            AND tm.user_id::text = auth.uid()::text
        )
    );

-- Project Stages - team members can insert/update/delete
DROP POLICY IF EXISTS "project_stages_all" ON project_stages;
CREATE POLICY "project_stages_all" ON project_stages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = project_stages.project_id
            AND tm.user_id::text = auth.uid()::text
        )
    );
