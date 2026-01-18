-- Meal polls for kitchen suggestions
create table if not exists public.meal_polls (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  created_by uuid not null,
  title text not null,
  suggestions jsonb null,
  missing_items text[] null,
  extra_notes text null,
  end_at timestamptz null,
  audience text not null default 'parents',
  member_ids uuid[] null,
  is_approved boolean not null default false,
  is_active boolean not null default true,
  approved_meal text null,
  approved_by uuid null references public.profiles(id),
  approved_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint meal_polls_family_id_fkey foreign key (family_id) references families (id),
  constraint meal_polls_created_by_fkey foreign key (created_by) references profiles (id)
);
