import { supabase } from "./supabase";

export interface DietPlan {
  id: string;
  profile_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  diet_plan: {
    goal: string;
    daily_calories: number;
    diet_type: string;
    start_date?: string;
    end_date?: string;
    daily_meal_plans: Array<{
      date: string;
      day: string;
      meals: Array<{
        time: string;
        type: string;
        meal: string;
        calories: number;
      }>;
    }>;
    weekly_meal_suggestions?: Array<{
      day: string;
      breakfast?: string;
      lunch?: string;
      dinner?: string;
      snacks?: string;
    }>;
  };
  goal?: string;
  daily_calories?: number;
  diet_type?: string;
  created_at: string;
  updated_at: string;
}

// Diyet planını kaydet veya güncelle
export async function saveDietPlan(
  startDate: string,
  endDate: string,
  dietPlan: any,
  goal?: string,
  dailyCalories?: number,
  dietType?: string
): Promise<{ data: DietPlan | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Oturum açın" };

  try {
    // Mevcut planı kontrol et (aynı tarih aralığında)
    const { data: existing } = await supabase
      .from("diet_plans")
      .select("*")
      .eq("profile_id", user.id)
      .eq("start_date", startDate)
      .eq("end_date", endDate)
      .maybeSingle();

    const planData = {
      profile_id: user.id,
      start_date: startDate,
      end_date: endDate,
      diet_plan: dietPlan,
      goal: goal || dietPlan.goal,
      daily_calories: dailyCalories || dietPlan.daily_calories,
      diet_type: dietType || dietPlan.diet_type,
    };

    let result;
    if (existing) {
      // Güncelle
      const { data, error } = await supabase
        .from("diet_plans")
        .update(planData)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) return { data: null, error: error.message };
      result = data;
    } else {
      // Yeni kayıt oluştur
      const { data, error } = await supabase
        .from("diet_plans")
        .insert(planData)
        .select()
        .single();

      if (error) return { data: null, error: error.message };
      result = data;
    }

    return { data: result as DietPlan, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || "Diyet planı kaydedilemedi" };
  }
}

// Belirli bir tarih için diyet planını getir
export async function getDietPlanForDate(
  date: string
): Promise<{ data: DietPlan | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Oturum açın" };

  try {
    const { data, error } = await supabase
      .from("diet_plans")
      .select("*")
      .eq("profile_id", user.id)
      .lte("start_date", date)
      .gte("end_date", date)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data as DietPlan | null, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || "Diyet planı getirilemedi" };
  }
}

// Aktif diyet planını getir (en son oluşturulan)
export async function getActiveDietPlan(): Promise<{ data: DietPlan | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Oturum açın" };

  try {
    const today = new Date().toISOString().split("T")[0];
    
    const { data, error } = await supabase
      .from("diet_plans")
      .select("*")
      .eq("profile_id", user.id)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data as DietPlan | null, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || "Aktif diyet planı getirilemedi" };
  }
}

// Tarih aralığındaki tüm diyet planlarını getir
export async function getDietPlansInRange(
  startDate: string,
  endDate: string
): Promise<{ data: DietPlan[]; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Oturum açın" };

  try {
    const { data, error } = await supabase
      .from("diet_plans")
      .select("*")
      .eq("profile_id", user.id)
      .lte("start_date", endDate)
      .gte("end_date", startDate)
      .order("start_date", { ascending: true });

    if (error) return { data: [], error: error.message };
    return { data: (data || []) as DietPlan[], error: null };
  } catch (error: any) {
    return { data: [], error: error.message || "Diyet planları getirilemedi" };
  }
}

// Diyet planını sil
export async function deleteDietPlan(planId: string): Promise<{ success: boolean; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Oturum açın" };

  try {
    const { error } = await supabase
      .from("diet_plans")
      .delete()
      .eq("id", planId)
      .eq("profile_id", user.id);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || "Diyet planı silinemedi" };
  }
}
