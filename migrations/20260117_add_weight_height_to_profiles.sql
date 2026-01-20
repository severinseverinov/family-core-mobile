-- Add weight and height columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS weight NUMERIC,
ADD COLUMN IF NOT EXISTS height NUMERIC;

-- Add water_reminder_enabled column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS water_reminder_enabled BOOLEAN DEFAULT false;
