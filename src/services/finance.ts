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
  if (!profile?.family_id) return { data: [], error: "Aile yok" };

  if (!profile?.family_id) return { data: [], error: "Aile bulunamadı" };

  let query = supabase
    .from("expenses")
    // profiles tablosunu 'expenses_user_id_fkey' kuralını kullanarak bağla diyoruz:
    .select("*, profiles (full_name)")
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
export async function deleteExpense(expenseId: string) {
  // 1. Önce silinecek harcamanın detaylarını al (Tutar ve kategori lazım)
  const { data: expense, error: fetchError } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", expenseId)
    .single();

  if (fetchError || !expense)
    return { success: false, error: "Harcama bulunamadı" };

  // 2. Harcamayı sil
  const { error: deleteError } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (deleteError) return { success: false, error: deleteError.message };

  // 3. Eğer Mutfak harcamasıysa, harcanan tutarı bütçeden geri düş
  if (expense.category === "Mutfak") {
    const monthKey = new Date(expense.created_at).toISOString().slice(0, 7);

    // Mevcut bütçeyi çek
    const { data: currentBudget } = await supabase
      .from("kitchen_budgets")
      .select("spent_amount")
      .eq("family_id", expense.family_id)
      .eq("month_key", monthKey)
      .maybeSingle();

    if (currentBudget) {
      const newSpent = Math.max(0, currentBudget.spent_amount - expense.amount);

      await supabase.from("kitchen_budgets").upsert(
        {
          family_id: expense.family_id,
          month_key: monthKey,
          spent_amount: newSpent,
        },
        { onConflict: "family_id, month_key" }
      );
    }
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

async function updateKitchenBudgetHelper(
  familyId: string,
  monthKey: string,
  amountToAdd: number
) {
  const { data: currentBudget } = await supabase
    .from("kitchen_budgets")
    .select("spent_amount")
    .eq("family_id", familyId)
    .eq("month_key", monthKey)
    .maybeSingle();

  const newSpent = Math.max(
    0,
    (currentBudget?.spent_amount || 0) + amountToAdd
  );

  await supabase.from("kitchen_budgets").upsert(
    {
      family_id: familyId,
      month_key: monthKey,
      spent_amount: newSpent,
    },
    { onConflict: "family_id, month_key" }
  );
}

export async function updateExpense(
  id: string,
  amount: number,
  category: string,
  description: string
) {
  // 1. Eski veriyi çek (Bütçe hesabı için lazım)
  const { data: oldExpense, error: fetchError } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !oldExpense)
    return { success: false, error: "Harcama bulunamadı" };

  // 2. Harcamayı güncelle
  const { error: updateError } = await supabase
    .from("expenses")
    .update({ amount, category, description })
    .eq("id", id);

  if (updateError) return { success: false, error: updateError.message };

  // 3. Mutfak Bütçesini Düzelt (Karmaşık Mantık)
  const monthKey = new Date(oldExpense.created_at).toISOString().slice(0, 7);
  let budgetDiff = 0;

  // Senaryo A: Mutfak'tı, hala Mutfak (Tutar değişmiş olabilir)
  if (oldExpense.category === "Mutfak" && category === "Mutfak") {
    budgetDiff = amount - oldExpense.amount;
  }
  // Senaryo B: Mutfak'tı, artık değil (Eski tutarı iade et)
  else if (oldExpense.category === "Mutfak" && category !== "Mutfak") {
    budgetDiff = -oldExpense.amount;
  }
  // Senaryo C: Değildi, şimdi Mutfak oldu (Yeni tutarı ekle)
  else if (oldExpense.category !== "Mutfak" && category === "Mutfak") {
    budgetDiff = amount;
  }

  if (budgetDiff !== 0) {
    await updateKitchenBudgetHelper(oldExpense.family_id, monthKey, budgetDiff);
  }

  return { success: true };
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

/**
 * Yıllık Gelir/Gider Raporunu Getirir
 */
export async function getAnnualStats(year: number) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Oturum yok" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) return { data: [], error: "Aile yok" };

  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  // 1. Giderleri Çek
  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount, created_at")
    .eq("family_id", profile.family_id)
    .gte("created_at", startOfYear)
    .lte("created_at", endOfYear);

  // 2. Gelirleri (Config tablosundan) Çek
  const { data: incomes } = await supabase
    .from("monthly_config")
    .select("amount, month_key")
    .eq("family_id", profile.family_id)
    .eq("type", "income")
    .gte("month_key", `${year}-01`)
    .lte("month_key", `${year}-12`);

  // Aylara göre grupla (0-11 index)
  const monthlyStats = Array(12)
    .fill(0)
    .map(() => ({ income: 0, expense: 0 }));

  expenses?.forEach((exp: any) => {
    const month = new Date(exp.created_at).getMonth();
    monthlyStats[month].expense += Number(exp.amount);
  });

  incomes?.forEach((inc: any) => {
    const month = new Date(inc.month_key + "-01").getMonth();
    monthlyStats[month].income += Number(inc.amount);
  });

  return { data: monthlyStats };
}

/**
 * Ay bazlı kim ne kadar harcamış?
 */
export async function getSpendingByUser(monthKey: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Oturum yok" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) return { data: [], error: "Aile yok" };

  // Harcamaları kullanıcı bilgisiyle çek
  const { data: expenses } = await supabase
    .from("expenses")
    .select(`amount, profiles (full_name, avatar_url)`)
    .eq("family_id", profile.family_id)
    .gte("created_at", `${monthKey}-01`)
    .lt(
      "created_at",
      new Date(
        new Date(`${monthKey}-01`).setMonth(
          new Date(`${monthKey}-01`).getMonth() + 1
        )
      ).toISOString()
    );

  // Kullanıcı bazlı topla
  const userTotals: any = {};

  expenses?.forEach((item: any) => {
    const name = item.profiles?.full_name || "Bilinmeyen";
    const amount = Number(item.amount);

    if (!userTotals[name]) {
      userTotals[name] = { name, amount: 0, avatar: item.profiles?.avatar_url };
    }
    userTotals[name].amount += amount;
  });

  return Object.values(userTotals).sort(
    (a: any, b: any) => b.amount - a.amount
  );
}

/**
 * Çocuğun harçlık limitini günceller
 */
export async function updateChildAllowance(childId: string, allowance: number) {
  return await supabase
    .from("profiles")
    .update({ monthly_allowance: allowance })
    .eq("id", childId);
}

/**
 * Kalan harçlığı kumbaraya aktarır (Manuel tetikleme veya ay sonu işlemi için)
 */
export async function transferToPiggyBank(childId: string, amount: number) {
  // Önce mevcut kumbarayı al
  const { data: profile } = await supabase
    .from("profiles")
    .select("piggy_bank")
    .eq("id", childId)
    .single();
  const current = profile?.piggy_bank || 0;

  return await supabase
    .from("profiles")
    .update({ piggy_bank: current + amount })
    .eq("id", childId);
}
