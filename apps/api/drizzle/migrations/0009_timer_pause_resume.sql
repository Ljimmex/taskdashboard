-- Migration: Add pause/resume support to time_entries (idempotent)
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS total_paused_minutes INTEGER NOT NULL DEFAULT 0;
