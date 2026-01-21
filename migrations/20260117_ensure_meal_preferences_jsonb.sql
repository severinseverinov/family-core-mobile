-- Ensure meal_preferences column exists and is JSONB type
-- This column stores meal preferences including diet information
-- If the column doesn't exist, create it
-- If it exists but is not JSONB, this will need manual migration

-- Check and add meal_preferences column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'meal_preferences'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN meal_preferences JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Ensure meal_preferences is JSONB type (if it exists but is not JSONB, manual migration needed)
-- Note: If meal_preferences exists as a different type, you'll need to manually convert it

-- Add comment to document the structure
COMMENT ON COLUMN profiles.meal_preferences IS 'JSONB field storing meal preferences. Structure: {
  "cuisine": string,
  "calories": string,
  "avoid": string,
  "diet": string (standard, vegetarian, vegan, weight_loss, weight_gain),
  "notes": string,
  "diet_start_date": string (ISO date),
  "diet_active": boolean
}';
