alter table public.meal_polls
  add column if not exists votes jsonb default '{}'::jsonb;
