-- =============================================================================
-- PART 3: SEED DATA - 12 Industry Templates
-- =============================================================================

DO $$
DECLARE
    tid UUID;
BEGIN
    -- 1. HR & Hiring
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('hr_hiring', 'Rekrutacja (HR & Hiring)', 'HR & Hiring', 'Proces śledzenia kandydata', '👔')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO tid;
    DELETE FROM industry_template_stages WHERE template_id = tid;
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (tid, 'Nowe aplikacje', 'New Applications', '#6366f1', 0, false),
    (tid, 'Wstępna selekcja', 'Screening', '#8b5cf6', 1, false),
    (tid, 'Rozmowa kwalifikacyjna', 'Interview', '#f59e0b', 2, false),
    (tid, 'Zadanie rekrutacyjne', 'Assignment', '#14b8a6', 3, false),
    (tid, 'Decyzja / Oferta', 'Offer Sent', '#3b82f6', 4, false),
    (tid, 'Zatrudniony', 'Hired', '#10b981', 5, true),
    (tid, 'Odrzucony', 'Rejected', '#ef4444', 6, true);

    -- 2. Video Production
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('video_production', 'Produkcja Wideo / YouTube', 'Video Production', 'Proces tworzenia wideo', '🎬')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO tid;
    DELETE FROM industry_template_stages WHERE template_id = tid;
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (tid, 'Pomysły', 'Ideas/Backlog', '#6366f1', 0, false),
    (tid, 'Pisanie scenariusza', 'Scripting', '#8b5cf6', 1, false),
    (tid, 'Pre-produkcja', 'Pre-production', '#f59e0b', 2, false),
    (tid, 'Nagrywanie', 'Shooting', '#ec4899', 3, false),
    (tid, 'Montaż wstępny', 'Rough Cut', '#14b8a6', 4, false),
    (tid, 'Post-produkcja', 'Post-production', '#3b82f6', 5, false),
    (tid, 'Publikacja', 'Published', '#10b981', 6, true);

    -- 3. Real Estate
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('real_estate', 'Sprzedaż Nieruchomości', 'Real Estate', 'Dla agentów nieruchomości', '🏠')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO tid;
    DELETE FROM industry_template_stages WHERE template_id = tid;
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (tid, 'Nowy obiekt', 'New Listing', '#6366f1', 0, false),
    (tid, 'Przygotowanie', 'Preparation', '#8b5cf6', 1, false),
    (tid, 'Wystawione na rynek', 'Listed', '#f59e0b', 2, false),
    (tid, 'Prezentacje', 'Showings', '#ec4899', 3, false),
    (tid, 'Otrzymana oferta', 'Offer Received', '#14b8a6', 4, false),
    (tid, 'Umowa przedwstępna', 'Under Contract', '#3b82f6', 5, false),
    (tid, 'Sprzedane', 'Sold', '#10b981', 6, true);

    -- 4. IT Helpdesk
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('it_helpdesk', 'Obsługa Klienta / Helpdesk', 'IT Support', 'Rozwiązywanie zgłoszeń', '🎧')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO tid;
    DELETE FROM industry_template_stages WHERE template_id = tid;
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (tid, 'Nowe zgłoszenie', 'New Ticket', '#6366f1', 0, false),
    (tid, 'Analiza', 'Triage', '#8b5cf6', 1, false),
    (tid, 'W trakcie naprawy', 'Investigating', '#f59e0b', 2, false),
    (tid, 'Czekam na klienta', 'Waiting for Customer', '#ec4899', 3, false),
    (tid, 'Czekam na dostawcę', 'Waiting for Vendor', '#14b8a6', 4, false),
    (tid, 'Rozwiązane', 'Resolved', '#10b981', 5, true);

    -- 5. Accounting
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('accounting', 'Księgowość / Biuro Rachunkowe', 'Accounting', 'Proces cykliczny', '📊')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO tid;
    DELETE FROM industry_template_stages WHERE template_id = tid;
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (tid, 'Oczekiwanie na dokumenty', 'Waiting for Docs', '#6366f1', 0, false),
    (tid, 'Dokumenty otrzymane', 'Docs Received', '#8b5cf6', 1, false),
    (tid, 'Księgowanie', 'In Progress', '#f59e0b', 2, false),
    (tid, 'Weryfikacja', 'Review', '#ec4899', 3, false),
    (tid, 'Deklaracje wysłane', 'Filed', '#14b8a6', 4, false),
    (tid, 'Informacja wysłana', 'Client Notified', '#3b82f6', 5, false),
    (tid, 'Zamknięcie miesiąca', 'Done', '#10b981', 6, true);

    -- 6. Construction
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('construction', 'Budownictwo / Remonty', 'Construction', 'Etapy budowlane', '🏗️')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO tid;
    DELETE FROM industry_template_stages WHERE template_id = tid;
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (tid, 'Planowanie i Kosztorys', 'Planning', '#6366f1', 0, false),
    (tid, 'Zakupy materiałów', 'Procurement', '#8b5cf6', 1, false),
    (tid, 'Prace rozbiórkowe', 'Demolition', '#f59e0b', 2, false),
    (tid, 'Instalacje', 'Installations', '#ec4899', 3, false),
    (tid, 'Wykończenie', 'Finishing', '#14b8a6', 4, false),
    (tid, 'Odbiór techniczny', 'Inspection', '#3b82f6', 5, false),
    (tid, 'Oddane klientowi', 'Handover', '#10b981', 6, true);

    -- 7. Marketing Agency
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('marketing_agency', 'Agencja Marketingowa', 'Marketing Agency', 'Tworzenie postów', '📱')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO tid;
    DELETE FROM industry_template_stages WHERE template_id = tid;
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (tid, 'Harmonogram / Tematy', 'Content Plan', '#6366f1', 0, false),
    (tid, 'Copywriting', 'Copywriting', '#8b5cf6', 1, false),
    (tid, 'Grafika / Wideo', 'Visuals', '#f59e0b', 2, false),
    (tid, 'Akceptacja wewnętrzna', 'Internal Review', '#ec4899', 3, false),
    (tid, 'Akceptacja klienta', 'Client Approval', '#14b8a6', 4, false),
    (tid, 'Zaplanowane', 'Scheduled', '#3b82f6', 5, false),
    (tid, 'Opublikowane', 'Live', '#10b981', 6, true);

    -- 8. E-commerce
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('ecommerce', 'Sklep Internetowy', 'E-commerce', 'Logistyka zamówień', '🛒')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO tid;
    DELETE FROM industry_template_stages WHERE template_id = tid;
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (tid, 'Nowe zamówienie', 'New Order', '#6366f1', 0, false),
    (tid, 'Opłacone', 'Paid', '#8b5cf6', 1, false),
    (tid, 'Kompletowanie', 'Picking', '#f59e0b', 2, false),
    (tid, 'Pakowanie', 'Packing', '#ec4899', 3, false),
    (tid, 'Etykieta wygenerowana', 'Label Created', '#14b8a6', 4, false),
    (tid, 'Wysłane', 'Shipped', '#10b981', 5, true),
    (tid, 'Zwroty / Reklamacje', 'Returns', '#ef4444', 6, false);

    -- 9. Legal
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('legal', 'Prawo / Kancelaria', 'Legal', 'Śledzenie spraw', '⚖️')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO tid;
    DELETE FROM industry_template_stages WHERE template_id = tid;
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (tid, 'Konsultacja wstępna', 'Intake', '#6366f1', 0, false),
    (tid, 'Zbieranie dowodów', 'Discovery', '#8b5cf6', 1, false),
    (tid, 'Sporządzanie pism', 'Drafting', '#f59e0b', 2, false),
    (tid, 'W sądzie', 'In Court', '#ec4899', 3, false),
    (tid, 'Oczekiwanie na wyrok', 'Awaiting Ruling', '#14b8a6', 4, false),
    (tid, 'Apelacja', 'Appeal', '#3b82f6', 5, false),
    (tid, 'Sprawa zamknięta', 'Case Closed', '#10b981', 6, true);

    -- 10. Event Management
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('event_management', 'Organizacja Wydarzeń', 'Event Management', 'Planowanie wydarzeń', '🎉')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO tid;
    DELETE FROM industry_template_stages WHERE template_id = tid;
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (tid, 'Koncepcja', 'Concept', '#6366f1', 0, false),
    (tid, 'Rezerwacja miejsca', 'Venue & Date', '#8b5cf6', 1, false),
    (tid, 'Dostawcy', 'Vendors', '#f59e0b', 2, false),
    (tid, 'Marketing / Zaproszenia', 'Promo & Guestlist', '#ec4899', 3, false),
    (tid, 'Agenda dopięta', 'Final Schedule', '#14b8a6', 4, false),
    (tid, 'Wydarzenie', 'Event Day', '#3b82f6', 5, false),
    (tid, 'Rozliczenie', 'Post-Event', '#10b981', 6, true);

    -- 11. Software Development
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('software_dev', 'Rozwój Oprogramowania', 'Software Development', 'Proces z QA', '💻')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO tid;
    DELETE FROM industry_template_stages WHERE template_id = tid;
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (tid, 'Backlog', 'Backlog', '#6366f1', 0, false),
    (tid, 'Selected for Development', 'Selected', '#8b5cf6', 1, false),
    (tid, 'Code Review', 'Code Review', '#f59e0b', 2, false),
    (tid, 'QA / Testing', 'QA Testing', '#ec4899', 3, false),
    (tid, 'Ready for Deploy', 'Ready to Deploy', '#14b8a6', 4, false),
    (tid, 'Deployed', 'Deployed', '#10b981', 5, true);

    -- 12. Standard (Default)
    INSERT INTO industry_templates (slug, name, name_en, description, icon) 
    VALUES ('standard', 'Standardowy (Kanban)', 'Standard Kanban', 'Domyślny szablon', '📋')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO tid;
    DELETE FROM industry_template_stages WHERE template_id = tid;
    INSERT INTO industry_template_stages (template_id, name, name_en, color, position, is_final) VALUES
    (tid, 'Do zrobienia', 'To Do', '#6366f1', 0, false),
    (tid, 'W trakcie', 'In Progress', '#f59e0b', 1, false),
    (tid, 'Przegląd', 'Review', '#8b5cf6', 2, false),
    (tid, 'Gotowe', 'Done', '#10b981', 3, true);
END $$;
