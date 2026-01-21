-- Günlük takip tablosu (su, kalori, egzersiz özetleri)
CREATE TABLE IF NOT EXISTS daily_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  water NUMERIC DEFAULT 0, -- ml cinsinden
  calories NUMERIC DEFAULT 0, -- kcal cinsinden
  exercise_duration NUMERIC DEFAULT 0, -- dakika cinsinden
  exercise_calories NUMERIC DEFAULT 0, -- yakılan kalori
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, date)
);

-- Günlük takip logları tablosu (detaylı kayıtlar)
CREATE TABLE IF NOT EXISTS daily_tracking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id UUID REFERENCES daily_tracking(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('water', 'calories', 'exercise')), -- kayıt tipi
  amount NUMERIC NOT NULL, -- miktar (ml, kcal, dakika)
  calories_burned NUMERIC DEFAULT 0, -- egzersiz için yakılan kalori
  notes TEXT, -- ek notlar
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_daily_tracking_profile_date ON daily_tracking(profile_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_tracking_logs_profile_date ON daily_tracking_logs(profile_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_tracking_logs_tracking_id ON daily_tracking_logs(tracking_id);

-- updated_at otomatik güncelleme trigger'ı
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_tracking_updated_at
  BEFORE UPDATE ON daily_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) politikaları
ALTER TABLE daily_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tracking_logs ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi kayıtlarını görebilir
CREATE POLICY "Users can view their own daily tracking"
  ON daily_tracking FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own daily tracking"
  ON daily_tracking FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own daily tracking"
  ON daily_tracking FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can view their own daily tracking logs"
  ON daily_tracking_logs FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own daily tracking logs"
  ON daily_tracking_logs FOR INSERT
  WITH CHECK (auth.uid() = profile_id);
