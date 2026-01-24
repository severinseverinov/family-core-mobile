import { supabase } from "./supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

// AI Yapılandırması
const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(geminiApiKey);

export interface ExercisePlan {
  id: string;
  profile_id: string;
  date: string; // YYYY-MM-DD
  exercise_plan: {
    exercises: Array<{
      name: string;
      duration: number; // dakika
      calories: number; // yakılan kalori
      type: string; // "cardio", "strength", "flexibility", "balance"
      instructions?: string; // Nasıl yapılacağı
      sets?: number; // Set sayısı (strength için)
      reps?: number; // Tekrar sayısı (strength için)
    }>;
    total_duration: number;
    total_calories: number;
    equipment_type: string;
  };
  equipment_type?: string;
  total_duration?: number;
  total_calories?: number;
  created_at: string;
  updated_at: string;
}

// Günlük egzersiz planı oluştur
export async function generateExercisePlan(input: {
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;
  fitnessLevel?: "beginner" | "intermediate" | "advanced";
  equipmentType: "home_no_equipment" | "home_with_equipment" | "gym";
  targetCalories?: number; // Hedef yakılan kalori
  availableTime?: number; // Dakika cinsinden
  language?: string;
  injuries?: string; // Yaralanmalar veya sınırlamalar
  preferences?: string; // Tercihler
}): Promise<{ data: ExercisePlan["exercise_plan"] | null; error: string | null }> {
  try {
    if (!geminiApiKey) {
      return { data: null, error: "Gemini API key tanımlı değil." };
    }

    const lang = input.language === "en" ? "English" : input.language === "de" ? "Deutsch" : "Türkçe";
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Ekipman tipi çevirisi
    const equipmentLabel = 
      input.equipmentType === "home_no_equipment"
        ? (lang === "English" ? "home without equipment" : lang === "Deutsch" ? "Zuhause ohne Ausrüstung" : "evde aletsiz")
        : input.equipmentType === "home_with_equipment"
        ? (lang === "English" ? "home with basic equipment (dumbbells, resistance bands)" : lang === "Deutsch" ? "Zuhause mit Grundausrüstung" : "evde temel aletlerle (dambıl, direnç bandı)")
        : (lang === "English" ? "gym with full equipment" : lang === "Deutsch" ? "Fitnessstudio mit voller Ausrüstung" : "spor salonu tam ekipmanlı");

    // Fitness seviyesi çevirisi
    const fitnessLevelLabel = 
      input.fitnessLevel === "beginner"
        ? (lang === "English" ? "beginner" : lang === "Deutsch" ? "Anfänger" : "başlangıç")
        : input.fitnessLevel === "intermediate"
        ? (lang === "English" ? "intermediate" : lang === "Deutsch" ? "Fortgeschritten" : "orta")
        : (lang === "English" ? "advanced" : lang === "Deutsch" ? "Fortgeschritten" : "ileri");

    const targetCalories = input.targetCalories || 300;
    const availableTime = input.availableTime || 45;

    const prompt = `You are a fitness trainer and exercise specialist. Respond strictly in ${lang}.

User profile:
- Age: ${input.age || "not specified"} years
- Weight: ${input.weight || "not specified"} kg
- Height: ${input.height || "not specified"} cm
- Gender: ${input.gender || "not specified"}
- Fitness level: ${fitnessLevelLabel}
- Equipment available: ${equipmentLabel}
- Target calories to burn: ${targetCalories} kcal
- Available time: ${availableTime} minutes
${input.injuries ? `- Injuries/Limitations: ${input.injuries}` : ""}
${input.preferences ? `- Preferences: ${input.preferences}` : ""}

Create a daily exercise plan that:
1. Includes a variety of exercises suitable for ${fitnessLevelLabel} level
2. Can be performed with ${equipmentLabel}
3. Targets approximately ${targetCalories} calories burned
4. Fits within ${availableTime} minutes total
5. Includes warm-up and cool-down exercises
6. Balances different exercise types (cardio, strength, flexibility)
7. ${input.injuries ? `STRICTLY AVOID exercises that could worsen: ${input.injuries}` : "Is safe and appropriate"}
8. ${input.preferences ? `Considers preferences: ${input.preferences}` : "Is well-rounded"}

Return ONLY a JSON object in this exact format:
{
  "exercises": [
    {
      "name": "exercise name",
      "duration": minutes,
      "calories": approximate calories burned,
      "type": "cardio" | "strength" | "flexibility" | "balance",
      "instructions": "brief instructions on how to perform",
      "sets": number (only for strength exercises, optional),
      "reps": number (only for strength exercises, optional)
    }
  ],
  "total_duration": ${availableTime},
  "total_calories": ${targetCalories},
  "equipment_type": "${input.equipmentType}"
}

Return ONLY the JSON, no other text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response
      .text()
      .replace(/```json|```/g, "")
      .trim();
    const parsed = JSON.parse(text);

    return {
      data: parsed,
      error: null,
    };
  } catch (error: any) {
    return { data: null, error: error.message || "Egzersiz planı oluşturulamadı" };
  }
}

// Günlük egzersiz planını kaydet veya güncelle
export async function saveExercisePlan(
  date: string,
  exercisePlan: ExercisePlan["exercise_plan"],
  equipmentType?: string
): Promise<{ data: ExercisePlan | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Oturum açın" };

  try {
    // Mevcut planı kontrol et
    const { data: existing } = await supabase
      .from("exercise_plans")
      .select("*")
      .eq("profile_id", user.id)
      .eq("date", date)
      .maybeSingle();

    const planData = {
      profile_id: user.id,
      date: date,
      exercise_plan: exercisePlan,
      equipment_type: equipmentType || exercisePlan.equipment_type,
      total_duration: exercisePlan.total_duration,
      total_calories: exercisePlan.total_calories,
    };

    let result;
    if (existing) {
      // Güncelle
      const { data, error } = await supabase
        .from("exercise_plans")
        .update(planData)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) return { data: null, error: error.message };
      result = data;
    } else {
      // Yeni kayıt oluştur
      const { data, error } = await supabase
        .from("exercise_plans")
        .insert(planData)
        .select()
        .single();

      if (error) return { data: null, error: error.message };
      result = data;
    }

    return { data: result as ExercisePlan, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || "Egzersiz planı kaydedilemedi" };
  }
}

// Belirli bir tarih için egzersiz planını getir
export async function getExercisePlanForDate(
  date: string
): Promise<{ data: ExercisePlan | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Oturum açın" };

  try {
    const { data, error } = await supabase
      .from("exercise_plans")
      .select("*")
      .eq("profile_id", user.id)
      .eq("date", date)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data as ExercisePlan | null, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || "Egzersiz planı getirilemedi" };
  }
}

// Tarih aralığındaki egzersiz planlarını getir
export async function getExercisePlansInRange(
  startDate: string,
  endDate: string
): Promise<{ data: ExercisePlan[]; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Oturum açın" };

  try {
    const { data, error } = await supabase
      .from("exercise_plans")
      .select("*")
      .eq("profile_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) return { data: [], error: error.message };
    return { data: (data || []) as ExercisePlan[], error: null };
  } catch (error: any) {
    return { data: [], error: error.message || "Egzersiz planları getirilemedi" };
  }
}

// Egzersiz planını sil
export async function deleteExercisePlan(planId: string): Promise<{ success: boolean; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Oturum açın" };

  try {
    const { error } = await supabase
      .from("exercise_plans")
      .delete()
      .eq("id", planId)
      .eq("profile_id", user.id);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || "Egzersiz planı silinemedi" };
  }
}
