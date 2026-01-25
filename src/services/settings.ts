import { supabase } from "./supabase";

const PREFS_COLS =
  "preferred_language, preferred_currency, theme_color, gender, meal_settings, meal_preferences, water_reminder_enabled";

export async function getPreferences() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(`${PREFS_COLS}, notification_settings`)
    .eq("id", user.id)
    .single();

  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("notification_settings") || msg.includes("could not find")) {
      const { data: fallback } = await supabase
        .from("profiles")
        .select(PREFS_COLS)
        .eq("id", user.id)
        .single();
      if (fallback) return { ...fallback, notification_settings: {} };
    }
    return null;
  }

  return { ...data, notification_settings: data?.notification_settings ?? {} };
}

export async function updatePreferences(updates: {
  language?: string;
  currency?: string;
  themeColor?: string;
  gender?: string;
  mealSettings?: any;
  mealPreferences?: any;
  waterReminderEnabled?: boolean;
  notificationSettings?: {
    sound?: "default" | "soft" | "loud" | "silent";
    icon?: "users" | "heart" | "home" | "activity" | "heart-pulse" | "shopping-cart" | "shopping-bag" | "app-icon";
    vibration?: boolean;
    badge?: boolean;
  };
  userIdOverride?: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const targetUserId = updates.userIdOverride || user?.id;
  if (!targetUserId) return { error: "Oturum bulunamadı" };

  const updatePayload: any = {};

  // Sadece tanımlı (undefined olmayan) alanları ekle
  if (updates.language !== undefined) {
    updatePayload.preferred_language = updates.language;
  }
  if (updates.currency !== undefined) {
    updatePayload.preferred_currency = updates.currency;
  }
  if (updates.themeColor !== undefined) {
    updatePayload.theme_color = updates.themeColor;
  }
  if (updates.gender !== undefined) {
    updatePayload.gender = updates.gender;
  }
  if (updates.mealSettings !== undefined) {
    updatePayload.meal_settings = updates.mealSettings;
  }
  if (updates.mealPreferences !== undefined) {
    updatePayload.meal_preferences = updates.mealPreferences;
  }
  if (updates.waterReminderEnabled !== undefined) {
    updatePayload.water_reminder_enabled = updates.waterReminderEnabled;
  }
  const hasNotif = updates.notificationSettings !== undefined;
  if (hasNotif) {
    updatePayload.notification_settings = updates.notificationSettings;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", targetUserId);

  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (hasNotif && (msg.includes("notification_settings") || msg.includes("could not find"))) {
      delete updatePayload.notification_settings;
      const { error: retryError } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", targetUserId);
      if (!retryError) {
        return {
          success: false,
          partialSuccess: true,
          error:
            "Bildirim ayarları kaydedilemedi: veritabanında notification_settings sütunu yok. Diğer ayarlar kaydedildi. Supabase Dashboard > SQL Editor'da supabase/migrations klasöründeki ilgili .sql dosyasını çalıştırın.",
        };
      }
    }
    return { success: false, error: error?.message || null };
  }

  return { success: true, error: null };
}
