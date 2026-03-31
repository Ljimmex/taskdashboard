-- Migration: Add pause/resume support to time_entries
ALTER TABLE time_entries ADD COLUMN is_paused BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE time_entries ADD COLUMN paused_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE time_entries ADD COLUMN total_paused_minutes INTEGER NOT NULL DEFAULT 0;
