import { supabase } from "./supabase";

export async function getPreferences() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select(
      "preferred_language, preferred_currency, theme_color, gender, meal_settings, meal_preferences, water_reminder_enabled, notification_settings"
    )
    .eq("id", user.id)
    .single();

  return data;
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

  const updatePayload: any = {
    preferred_language: updates.language,
    preferred_currency: updates.currency,
    theme_color: updates.themeColor,
    gender: updates.gender,
    meal_settings: updates.mealSettings,
    meal_preferences: updates.mealPreferences,
    water_reminder_enabled: updates.waterReminderEnabled,
  };

  if (updates.notificationSettings !== undefined) {
    updatePayload.notification_settings = updates.notificationSettings;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", targetUserId);

  return { success: !error, error };
}
