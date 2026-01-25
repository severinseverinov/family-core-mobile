-- Bildirim ayarları (ses, ikon, titreşim, rozet) profiles tablosuna eklenir.
-- Supabase Dashboard > SQL Editor'da bu dosyayı çalıştırın veya:
-- npx supabase db push (Supabase CLI kullanıyorsanız)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}';

COMMENT ON COLUMN public.profiles.notification_settings IS 'Bildirim tercihleri: sound, icon, vibration, badge';
