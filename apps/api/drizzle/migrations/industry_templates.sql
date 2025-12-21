-- =============================================================================
-- INDUSTRY TEMPLATES & PROJECT STAGES MIGRATION
-- Zadano.app - Version 1.0
-- =============================================================================

-- ============================================================================
-- STEP 1: Create industry_templates table
-- ============================================================================
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

-- ============================================================================
-- STEP 2: Create industry_template_stages table
-- ============================================================================
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

-- ============================================================================
-- STEP 3: Create project_stages table
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    position INTEGER NOT NULL,
    is_final BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- STEP 4: Add industry_template_id to projects table
-- ============================================================================
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS industry_template_id UUID REFERENCES industry_templates(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 5: Create indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_industry_template_stages_template ON industry_template_stages(template_id);
CREATE INDEX IF NOT EXISTS idx_project_stages_project ON project_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_industry_template ON projects(industry_template_id);

-- ============================================================================
-- STEP 6: Enable RLS
-- ============================================================================
ALTER TABLE industry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_template_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: RLS Policies - industry_templates (public read)
-- ============================================================================
DROP POLICY IF EXISTS "Industry templates are viewable by everyone" ON industry_templates;
CREATE POLICY "Industry templates are viewable by everyone" ON industry_templates
    FOR SELECT USING (true);

-- ============================================================================
-- STEP 8: RLS Policies - industry_template_stages (public read)
-- ============================================================================
DROP POLICY IF EXISTS "Industry template stages are viewable by everyone" ON industry_template_stages;
CREATE POLICY "Industry template stages are viewable by everyone" ON industry_template_stages
    FOR SELECT USING (true);

-- ============================================================================
-- STEP 9: RLS Policies - project_stages (team members)
-- ============================================================================
DROP POLICY IF EXISTS "Project stages are viewable by team members" ON project_stages;
CREATE POLICY "Project stages are viewable by team members" ON project_stages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = project_stages.project_id
            AND tm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Project stages are editable by team members" ON project_stages;
CREATE POLICY "Project stages are editable by team members" ON project_stages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = project_stages.project_id
            AND tm.user_id = auth.uid()
        )
    );

-- ============================================================================
-- STEP 10: SEED DATA using DO block with variables
-- ============================================================================
DO $$
DECLARE
    template_id UUID;
BEGIN
    -- 1. HR & Hiring
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('hr_hiring', 'Rekrutacja (HR & Hiring)', 'HR & Hiring', 'Proces śledzenia kandydata od CV do zatrudnienia', '👔')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO template_id;
    
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (template_id, 'Nowe aplikacje', 'New Applications', '#6366f1', 0, false),
    (template_id, 'Wstępna selekcja', 'Screening', '#8b5cf6', 1, false),
    (template_id, 'Rozmowa kwalifikacyjna', 'Interview', '#f59e0b', 2, false),
    (template_id, 'Zadanie rekrutacyjne', 'Assignment', '#14b8a6', 3, false),
    (template_id, 'Decyzja / Oferta', 'Offer Sent', '#3b82f6', 4, false),
    (template_id, 'Zatrudniony', 'Hired', '#10b981', 5, true),
    (template_id, 'Odrzucony', 'Rejected', '#ef4444', 6, true);

    -- 2. Video Production
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('video_production', 'Produkcja Wideo / YouTube', 'Video Production', 'Proces tworzenia wideo', '🎬')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO template_id;
    
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (template_id, 'Pomysły', 'Ideas/Backlog', '#6366f1', 0, false),
    (template_id, 'Pisanie scenariusza', 'Scripting', '#8b5cf6', 1, false),
    (template_id, 'Pre-produkcja', 'Pre-production', '#f59e0b', 2, false),
    (template_id, 'Nagrywanie', 'Shooting', '#ec4899', 3, false),
    (template_id, 'Montaż wstępny', 'Rough Cut', '#14b8a6', 4, false),
    (template_id, 'Post-produkcja', 'Post-production', '#3b82f6', 5, false),
    (template_id, 'Publikacja', 'Published', '#10b981', 6, true);

    -- 3. Real Estate
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('real_estate', 'Sprzedaż Nieruchomości', 'Real Estate', 'Dla agentów nieruchomości', '🏠')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO template_id;
    
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (template_id, 'Nowy obiekt', 'New Listing', '#6366f1', 0, false),
    (template_id, 'Przygotowanie', 'Preparation', '#8b5cf6', 1, false),
    (template_id, 'Wystawione na rynek', 'Listed', '#f59e0b', 2, false),
    (template_id, 'Prezentacje', 'Showings', '#ec4899', 3, false),
    (template_id, 'Otrzymana oferta', 'Offer Received', '#14b8a6', 4, false),
    (template_id, 'Umowa przedwstępna', 'Under Contract', '#3b82f6', 5, false),
    (template_id, 'Sprzedane', 'Sold', '#10b981', 6, true);

    -- 4. IT Helpdesk
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('it_helpdesk', 'Obsługa Klienta / Helpdesk', 'IT Support', 'Rozwiązywanie zgłoszeń', '🎧')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO template_id;
    
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (template_id, 'Nowe zgłoszenie', 'New Ticket', '#6366f1', 0, false),
    (template_id, 'Analiza', 'Triage', '#8b5cf6', 1, false),
    (template_id, 'W trakcie naprawy', 'Investigating', '#f59e0b', 2, false),
    (template_id, 'Czekam na klienta', 'Waiting for Customer', '#ec4899', 3, false),
    (template_id, 'Czekam na dostawcę', 'Waiting for Vendor', '#14b8a6', 4, false),
    (template_id, 'Rozwiązane', 'Resolved', '#10b981', 5, true);

    -- 5. Accounting
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('accounting', 'Księgowość / Biuro Rachunkowe', 'Accounting', 'Proces cykliczny dla klientów', '📊')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO template_id;
    
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (template_id, 'Oczekiwanie na dokumenty', 'Waiting for Docs', '#6366f1', 0, false),
    (template_id, 'Dokumenty otrzymane', 'Docs Received', '#8b5cf6', 1, false),
    (template_id, 'Księgowanie', 'In Progress', '#f59e0b', 2, false),
    (template_id, 'Weryfikacja', 'Review', '#ec4899', 3, false),
    (template_id, 'Deklaracje wysłane', 'Filed', '#14b8a6', 4, false),
    (template_id, 'Informacja wysłana', 'Client Notified', '#3b82f6', 5, false),
    (template_id, 'Zamknięcie miesiąca', 'Done', '#10b981', 6, true);

    -- 6. Construction
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('construction', 'Budownictwo / Remonty', 'Construction', 'Etapy budowlane', '🏗️')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO template_id;
    
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (template_id, 'Planowanie i Kosztorys', 'Planning', '#6366f1', 0, false),
    (template_id, 'Zakupy materiałów', 'Procurement', '#8b5cf6', 1, false),
    (template_id, 'Prace rozbiórkowe', 'Demolition', '#f59e0b', 2, false),
    (template_id, 'Instalacje', 'Installations', '#ec4899', 3, false),
    (template_id, 'Wykończenie', 'Finishing', '#14b8a6', 4, false),
    (template_id, 'Odbiór techniczny', 'Inspection', '#3b82f6', 5, false),
    (template_id, 'Oddane klientowi', 'Handover', '#10b981', 6, true);

    -- 7. Marketing Agency
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('marketing_agency', 'Agencja Marketingowa', 'Marketing Agency', 'Tworzenie postów social media', '📱')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO template_id;
    
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (template_id, 'Harmonogram / Tematy', 'Content Plan', '#6366f1', 0, false),
    (template_id, 'Copywriting', 'Copywriting', '#8b5cf6', 1, false),
    (template_id, 'Grafika / Wideo', 'Visuals', '#f59e0b', 2, false),
    (template_id, 'Akceptacja wewnętrzna', 'Internal Review', '#ec4899', 3, false),
    (template_id, 'Akceptacja klienta', 'Client Approval', '#14b8a6', 4, false),
    (template_id, 'Zaplanowane', 'Scheduled', '#3b82f6', 5, false),
    (template_id, 'Opublikowane', 'Live', '#10b981', 6, true);

    -- 8. E-commerce
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('ecommerce', 'Sklep Internetowy (E-commerce)', 'E-commerce', 'Logistyka zamówień', '🛒')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO template_id;
    
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (template_id, 'Nowe zamówienie', 'New Order', '#6366f1', 0, false),
    (template_id, 'Opłacone', 'Paid', '#8b5cf6', 1, false),
    (template_id, 'Kompletowanie', 'Picking', '#f59e0b', 2, false),
    (template_id, 'Pakowanie', 'Packing', '#ec4899', 3, false),
    (template_id, 'Etykieta wygenerowana', 'Label Created', '#14b8a6', 4, false),
    (template_id, 'Wysłane', 'Shipped', '#10b981', 5, true),
    (template_id, 'Zwroty / Reklamacje', 'Returns', '#ef4444', 6, false);

    -- 9. Legal
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('legal', 'Prawo / Kancelaria', 'Legal', 'Śledzenie postępów w sprawach', '⚖️')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO template_id;
    
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (template_id, 'Konsultacja wstępna', 'Intake', '#6366f1', 0, false),
    (template_id, 'Zbieranie dowodów', 'Discovery', '#8b5cf6', 1, false),
    (template_id, 'Sporządzanie pism', 'Drafting', '#f59e0b', 2, false),
    (template_id, 'W sądzie', 'In Court', '#ec4899', 3, false),
    (template_id, 'Oczekiwanie na wyrok', 'Awaiting Ruling', '#14b8a6', 4, false),
    (template_id, 'Apelacja', 'Appeal', '#3b82f6', 5, false),
    (template_id, 'Sprawa zamknięta', 'Case Closed', '#10b981', 6, true);

    -- 10. Event Management
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('event_management', 'Organizacja Wydarzeń', 'Event Management', 'Planowanie wydarzeń', '🎉')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO template_id;
    
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (template_id, 'Koncepcja', 'Concept', '#6366f1', 0, false),
    (template_id, 'Rezerwacja miejsca', 'Venue & Date', '#8b5cf6', 1, false),
    (template_id, 'Dostawcy', 'Vendors', '#f59e0b', 2, false),
    (template_id, 'Marketing / Zaproszenia', 'Promo & Guestlist', '#ec4899', 3, false),
    (template_id, 'Agenda dopięta', 'Final Schedule', '#14b8a6', 4, false),
    (template_id, 'Wydarzenie', 'Event Day', '#3b82f6', 5, false),
    (template_id, 'Rozliczenie', 'Post-Event', '#10b981', 6, true);

    -- 11. Software Development
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('software_dev', 'Rozwój Oprogramowania', 'Software Development', 'Proces z kontrolą jakości', '💻')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO template_id;
    
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (template_id, 'Backlog', 'Backlog', '#6366f1', 0, false),
    (template_id, 'Selected for Development', 'Selected', '#8b5cf6', 1, false),
    (template_id, 'Code Review', 'Code Review', '#f59e0b', 2, false),
    (template_id, 'QA / Testing', 'QA Testing', '#ec4899', 3, false),
    (template_id, 'Ready for Deploy', 'Ready to Deploy', '#14b8a6', 4, false),
    (template_id, 'Deployed', 'Deployed', '#10b981', 5, true);

    -- 12. Standard (Default)
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('standard', 'Standardowy (Kanban)', 'Standard Kanban', 'Domyślny szablon', '📋')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO template_id;
    
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (template_id, 'Do zrobienia', 'To Do', '#6366f1', 0, false),
    (template_id, 'W trakcie', 'In Progress', '#f59e0b', 1, false),
    (template_id, 'Przegląd', 'Review', '#8b5cf6', 2, false),
    (template_id, 'Gotowe', 'Done', '#10b981', 3, true);

END $$;
