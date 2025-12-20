-- Migration: Add new user registration fields
-- Run this SQL on your Neon database to add missing columns

-- Add birth_date column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS birth_date TIMESTAMP;

-- Add gender column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gender VARCHAR(50);

-- Add phone column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Add first_name column (if not exists)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);

-- Add last_name column (if not exists)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;
