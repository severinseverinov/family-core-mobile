import { supabase } from "./supabase";

/**
 * Tüm aile harcamalarını getirir
 */
// src/services/finance.ts

export async function getExpenses(monthKey?: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Oturum yok" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) return { data: [], error: "Aile bulunamadı" };

  let query = supabase
    .from("expenses")
    .select(`*, profiles (full_name)`)
    .eq("family_id", profile.family_id)
    .order("created_at", { ascending: false });

  if (monthKey) {
    // Ayın başlangıcı ve bir sonraki ayın başlangıcı arasında filtrele
    const start = new Date(`${monthKey}-01T00:00:00.000Z`);
    const next = new Date(start);
    next.setMonth(next.getMonth() + 1);
    query = query
      .gte("created_at", start.toISOString())
      .lt("created_at", next.toISOString());
  }

  const { data, error } = await query;
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
export async function getMonthlyFinanceData(monthKey: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { expenses: [], configs: [], role: null, error: "Oturum yok" };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, role")
    .eq("id", user?.id)
    .single();
  if (!profile?.family_id) {
    return { expenses: [], configs: [], role: null, error: "Aile yok" };
  }

  // 1. O aya ait harcamalar
  const expensesQuery = supabase
    .from("expenses")
    .select("*, profiles(full_name)")
    .eq("family_id", profile.family_id)
    .filter("created_at", "gte", `${monthKey}-01`)
    .filter("created_at", "lt", `${monthKey}-32`);

  // 2. O aya ait bütçe ve gelir ayarları
  const configQuery = supabase
    .from("monthly_config")
    .select("*")
    .eq("family_id", profile.family_id)
    .eq("month_key", monthKey);

  const [expenses, configs] = await Promise.all([expensesQuery, configQuery]);

  return {
    expenses: expenses.data || [],
    configs: configs.data || [],
    role: profile.role,
  };
}

// Çocuk harcaması: Kendi bakiyesinden düşer
export async function addPocketMoneyExpense(
  amount: number,
  description: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum yok" };

  // Önce bakiyeyi kontrol et ve düş
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_balance, family_id")
    .eq("id", user?.id)
    .single();
  if (!profile) return { error: "Profil bulunamadı" };
  if (!profile.family_id) return { error: "Aile yok" };

  if (profile.current_balance < amount) return { error: "Yetersiz harçlık!" };

  const newBalance = profile.current_balance - amount;

  await supabase
    .from("profiles")
    .update({ current_balance: newBalance })
    .eq("id", user?.id);

  // Harcamayı kaydet
  return await supabase.from("expenses").insert({
    family_id: profile.family_id,
    user_id: user?.id,
    amount,
    category: "Harçlık",
    description,
    is_pocket_money: true,
  });
}
export async function getMonthlyConfigs(monthKey: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Oturum yok" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user?.id)
    .single();
  if (!profile?.family_id) return { data: [], error: "Aile yok" };

  const { data, error } = await supabase
    .from("monthly_config")
    .select("*")
    .eq("family_id", profile.family_id)
    .eq("month_key", monthKey);

  return { data: data || [], error: error?.message };
}

/**
 * Gelir veya Kategori Bütçesini günceller/oluşturur
 */
export async function upsertMonthlyConfig(
  monthKey: string,
  type: "income" | "budget",
  amount: number,
  category?: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Oturum yok" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user?.id)
    .single();
  if (!profile?.family_id) return { success: false, error: "Aile yok" };

  const { error } = await supabase.from("monthly_config").upsert(
    {
      family_id: profile.family_id,
      month_key: monthKey,
      type: type,
      category: category || null,
      amount: amount,
    },
    { onConflict: "family_id, month_key, type, category" }
  );

  return { success: !error, error: error?.message };
}
