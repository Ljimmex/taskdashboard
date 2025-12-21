-- =============================================================================
-- PART 1: CREATE TABLES ONLY (no RLS, no seed)
-- =============================================================================

-- 1. Industry Templates
CREATE TABLE IF NOT EXISTS industry_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description TEXT,
    icon VARCHAR(10),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Industry Template Stages
CREATE TABLE IF NOT EXISTS industry_template_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES industry_templates(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    position INTEGER NOT NULL,
    is_final BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Project Stages
CREATE TABLE IF NOT EXISTS project_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    position INTEGER NOT NULL,
    is_final BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. Add column to projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS industry_template_id UUID REFERENCES industry_templates(id) ON DELETE SET NULL;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_industry_template_stages_template ON industry_template_stages(template_id);
CREATE INDEX IF NOT EXISTS idx_project_stages_project ON project_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_industry_template ON projects(industry_template_id);
