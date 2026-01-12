import { supabase } from "./supabase";

export async function getPreferences() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("preferred_language, preferred_currency, theme_color, gender")
    .eq("id", user.id)
    .single();

  return data;
}

export async function updatePreferences(updates: {
  language?: string;
  currency?: string;
  themeColor?: string;
  gender?: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı" };

  const { error } = await supabase
    .from("profiles")
    .update({
      preferred_language: updates.language,
      preferred_currency: updates.currency,
      theme_color: updates.themeColor,
      gender: updates.gender,
    })
    .eq("id", user.id);

  return { success: !error, error };
}
