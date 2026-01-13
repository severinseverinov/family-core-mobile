import { supabase } from "./supabase";

/**
 * Tüm aile harcamalarını getirir
 */
export async function getExpenses() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Oturum yok" };

  // Kullanıcının ailesini bul
  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) return { data: [], error: "Aile bulunamadı" };

  // Harcamaları ve harcamayı yapan kişinin adını getir
  const { data, error } = await supabase
    .from("expenses")
    .select(
      `
      *,
      profiles (full_name)
    `
    )
    .eq("family_id", profile.family_id)
    .order("created_at", { ascending: false });

  return { data: data || [], error: error?.message };
}

/**
 * Yeni bir harcama ekler
 */
export async function addExpense(
  amount: number,
  category: string,
  description: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Oturum açın" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) return { success: false, error: "Aile yok" };

  // 1. Harcamayı 'expenses' tablosuna kaydet
  const { error: expError } = await supabase.from("expenses").insert({
    family_id: profile.family_id,
    user_id: user.id,
    amount,
    category,
    description,
    created_at: new Date().toISOString(),
  });

  if (expError) return { success: false, error: expError.message };

  // 2. Eğer kategori 'Mutfak' ise mutfak bütçesini de güncelle
  if (category === "Mutfak") {
    const monthKey = new Date().toISOString().slice(0, 7); // Örn: "2026-01"

    // Mevcut bütçe verisini al
    const { data: currentBudget } = await supabase
      .from("kitchen_budgets")
      .select("spent_amount")
      .eq("family_id", profile.family_id)
      .eq("month_key", monthKey)
      .maybeSingle();

    const newSpent = (currentBudget?.spent_amount || 0) + amount;

    // Bütçeyi güncelle
    await supabase.from("kitchen_budgets").upsert(
      {
        family_id: profile.family_id,
        month_key: monthKey,
        spent_amount: newSpent,
      },
      { onConflict: "family_id, month_key" }
    );
  }

  return { success: true };
}
