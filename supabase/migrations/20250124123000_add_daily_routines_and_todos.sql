-- Günlük rutinler (çalışma/okul programı dahil) ve yapılacaklar (todo) tabloları
-- Supabase Dashboard > SQL Editor'da bu dosyayı çalıştırın veya:
-- npx supabase db push (Supabase CLI kullanıyorsanız)

CREATE TABLE IF NOT EXISTS public.daily_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text DEFAULT 'routine', -- routine | work | school
  shift_type text DEFAULT 'morning', -- morning | evening | night
  visibility_scope text DEFAULT 'family', -- family | spouse
  recurrence_type text DEFAULT 'daily', -- daily | weekly | monthly
  days_of_week text[] DEFAULT '{}', -- weekly için örn: ['Mon','Tue']
  day_of_months integer[] DEFAULT '{}', -- monthly için çoklu gün (1-31)
  start_date date DEFAULT current_date,
  end_date date,
  start_time time,
  end_time time,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.todo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id),
  assigned_to uuid REFERENCES public.profiles(id),
  created_by uuid REFERENCES public.profiles(id),
  title text NOT NULL,
  is_completed boolean DEFAULT false,
  requires_approval boolean DEFAULT false,
  status text DEFAULT 'approved', -- approved | pending_approval
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Var olan tabloya kolon ekleme (daha önce oluşturulduysa güvenli)
ALTER TABLE public.daily_routines
  ADD COLUMN IF NOT EXISTS recurrence_type text DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS shift_type text DEFAULT 'morning',
  ADD COLUMN IF NOT EXISTS visibility_scope text DEFAULT 'family',
  ADD COLUMN IF NOT EXISTS day_of_months integer[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS start_date date DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS end_date date;

-- Var olan todo tablosuna kolon ekleme
ALTER TABLE public.todo_items
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- İndeksler (kolonlar garantilendikten sonra)
CREATE INDEX IF NOT EXISTS idx_daily_routines_family ON public.daily_routines(family_id);
CREATE INDEX IF NOT EXISTS idx_todo_items_family ON public.todo_items(family_id);
CREATE INDEX IF NOT EXISTS idx_todo_items_profile ON public.todo_items(profile_id);
CREATE INDEX IF NOT EXISTS idx_todo_items_completed ON public.todo_items(is_completed);
CREATE INDEX IF NOT EXISTS idx_todo_items_status ON public.todo_items(status);
