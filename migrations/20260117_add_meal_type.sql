-- Add meal_type column to meal_polls table
alter table public.meal_polls
  add column if not exists meal_type text default 'cook'::text;

-- Add constraint for meal_type values
alter table public.meal_polls
  add constraint meal_polls_meal_type_check check (
    meal_type = any (array['cook'::text, 'delivery'::text, 'restaurant'::text])
  );
