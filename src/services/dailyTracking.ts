import { supabase } from "./supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

// AI Yapılandırması
const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(geminiApiKey);

export interface DailyTracking {
  id: string;
  profile_id: string;
  date: string; // YYYY-MM-DD formatında
  water: number;
  calories: number;
  exercise_duration: number;
  exercise_calories: number;
  created_at: string;
  updated_at: string;
}

export interface DailyTrackingLog {
  id: string;
  tracking_id?: string;
  profile_id: string;
  date: string;
  type: "water" | "calories" | "exercise";
  amount: number;
  calories_burned?: number;
  notes?: string;
  created_at: string;
}

export interface DailyTrackingData {
  water: number;
  calories: number;
  exercise: {
    duration: number;
    calories: number;
  };
}

// Günlük takip verisini getir veya oluştur
export async function getOrCreateDailyTracking(
  date: string,
): Promise<{ data: DailyTracking | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Oturum açın" };

  // Önce mevcut kaydı kontrol et
  const { data: existing, error: fetchError } = await supabase
    .from("daily_tracking")
    .select("*")
    .eq("profile_id", user.id)
    .eq("date", date)
    .maybeSingle();

  if (fetchError) return { data: null, error: fetchError.message };

  // Eğer kayıt varsa döndür
  if (existing) {
    return {
      data: {
        ...existing,
        water: Number(existing.water) || 0,
        calories: Number(existing.calories) || 0,
        exercise_duration: Number(existing.exercise_duration) || 0,
        exercise_calories: Number(existing.exercise_calories) || 0,
      },
      error: null,
    };
  }

  // Yoksa yeni kayıt oluştur
  const { data: newRecord, error: insertError } = await supabase
    .from("daily_tracking")
    .insert({
      profile_id: user.id,
      date,
      water: 0,
      calories: 0,
      exercise_duration: 0,
      exercise_calories: 0,
    })
    .select()
    .single();

  if (insertError) return { data: null, error: insertError.message };

  return {
    data: {
      ...newRecord,
      water: 0,
      calories: 0,
      exercise_duration: 0,
      exercise_calories: 0,
    },
    error: null,
  };
}

// Günlük takip verisini güncelle
export async function updateDailyTracking(
  date: string,
  updates: Partial<DailyTrackingData>,
): Promise<{ success: boolean; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Oturum açın" };

  // Önce kaydı getir veya oluştur
  const { data: tracking, error: trackingError } =
    await getOrCreateDailyTracking(date);
  if (trackingError || !tracking) {
    return { success: false, error: trackingError || "Kayıt oluşturulamadı" };
  }

  // Güncelleme verilerini hazırla
  const updateData: any = {};
  if (updates.water !== undefined) {
    updateData.water = tracking.water + updates.water;
  }
  if (updates.calories !== undefined) {
    updateData.calories = tracking.calories + updates.calories;
  }
  if (updates.exercise?.duration !== undefined) {
    updateData.exercise_duration =
      tracking.exercise_duration + updates.exercise.duration;
  }
  if (updates.exercise?.calories !== undefined) {
    updateData.exercise_calories =
      tracking.exercise_calories + updates.exercise.calories;
  }

  const { error } = await supabase
    .from("daily_tracking")
    .update(updateData)
    .eq("id", tracking.id);

  if (error) return { success: false, error: error.message };

  return { success: true, error: null };
}

// Günlük takip verisini direkt olarak set et (toplam değerler)
export async function setDailyTracking(
  date: string,
  data: DailyTrackingData,
): Promise<{ success: boolean; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Oturum açın" };

  // Önce kaydı getir veya oluştur
  const { data: tracking, error: trackingError } =
    await getOrCreateDailyTracking(date);
  if (trackingError || !tracking) {
    return { success: false, error: trackingError || "Kayıt oluşturulamadı" };
  }

  const { error } = await supabase
    .from("daily_tracking")
    .update({
      water: data.water,
      calories: data.calories,
      exercise_duration: data.exercise.duration,
      exercise_calories: data.exercise.calories,
    })
    .eq("id", tracking.id);

  if (error) return { success: false, error: error.message };

  return { success: true, error: null };
}

// Log ekle
export async function addDailyTrackingLog(
  date: string,
  type: "water" | "calories" | "exercise",
  amount: number,
  caloriesBurned?: number,
  notes?: string,
): Promise<{ success: boolean; error: string | null; logId?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Oturum açın" };

  // Tracking kaydını getir veya oluştur
  const { data: tracking, error: trackingError } =
    await getOrCreateDailyTracking(date);
  if (trackingError || !tracking) {
    return { success: false, error: trackingError || "Kayıt oluşturulamadı" };
  }

  // Log ekle
  const { data: log, error: logError } = await supabase
    .from("daily_tracking_logs")
    .insert({
      tracking_id: tracking.id,
      profile_id: user.id,
      date,
      type,
      amount,
      calories_burned: caloriesBurned || 0,
      notes,
    })
    .select()
    .single();

  if (logError) return { success: false, error: logError.message };

  // Tracking kaydını güncelle
  const updateData: any = {};
  if (type === "water") {
    updateData.water = tracking.water + amount;
  } else if (type === "calories") {
    updateData.calories = tracking.calories + amount;
  } else if (type === "exercise") {
    updateData.exercise_duration = tracking.exercise_duration + amount;
    if (caloriesBurned) {
      updateData.exercise_calories =
        tracking.exercise_calories + caloriesBurned;
    }
  }

  const { error: updateError } = await supabase
    .from("daily_tracking")
    .update(updateData)
    .eq("id", tracking.id);

  if (updateError) {
    console.error("Tracking güncelleme hatası:", updateError);
    // Log eklendi ama tracking güncellenemedi, yine de başarılı sayalım
  }

  return { success: true, error: null, logId: log.id };
}

// Belirli bir tarih aralığındaki logları getir
export async function getDailyTrackingLogs(
  startDate: string,
  endDate: string,
): Promise<{ data: DailyTrackingLog[]; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Oturum açın" };

  const { data, error } = await supabase
    .from("daily_tracking_logs")
    .select("*")
    .eq("profile_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };

  return {
    data: (data || []).map(log => ({
      ...log,
      amount: Number(log.amount) || 0,
      calories_burned: Number(log.calories_burned) || 0,
    })),
    error: null,
  };
}

// Belirli bir tarih aralığındaki tracking verilerini getir
export async function getDailyTrackingRange(
  startDate: string,
  endDate: string,
): Promise<{ data: DailyTracking[]; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Oturum açın" };

  const { data, error } = await supabase
    .from("daily_tracking")
    .select("*")
    .eq("profile_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) return { data: [], error: error.message };

  return {
    data: (data || []).map(tracking => ({
      ...tracking,
      water: Number(tracking.water) || 0,
      calories: Number(tracking.calories) || 0,
      exercise_duration: Number(tracking.exercise_duration) || 0,
      exercise_calories: Number(tracking.exercise_calories) || 0,
    })),
    error: null,
  };
}

// Su içme kaydı ekle
export async function logWaterIntake(
  amount: number, // ml
  date?: string,
  notes?: string,
): Promise<{ success: boolean; error: string | null }> {
  const targetDate = date || new Date().toISOString().split("T")[0];
  const result = await addDailyTrackingLog(
    targetDate,
    "water",
    amount,
    undefined,
    notes,
  );
  return { success: result.success, error: result.error };
}

// Kalori kaydı ekle
export async function logCalories(
  amount: number, // kcal
  date?: string,
  notes?: string,
): Promise<{ success: boolean; error: string | null }> {
  const targetDate = date || new Date().toISOString().split("T")[0];
  const result = await addDailyTrackingLog(
    targetDate,
    "calories",
    amount,
    undefined,
    notes,
  );
  return { success: result.success, error: result.error };
}

// Egzersiz kaydı ekle
export async function logExercise(
  duration: number, // dakika
  caloriesBurned: number, // kcal
  date?: string,
  notes?: string,
): Promise<{ success: boolean; error: string | null }> {
  const targetDate = date || new Date().toISOString().split("T")[0];
  const result = await addDailyTrackingLog(
    targetDate,
    "exercise",
    duration,
    caloriesBurned,
    notes,
  );
  return { success: result.success, error: result.error };
}

// AI ile egzersiz kalori hesapla
export async function getExerciseCalories(
  exerciseName: string,
  durationMinutes: number,
): Promise<{
  caloriesBurned: number | null;
  error: string | null;
}> {
  if (!exerciseName || !exerciseName.trim()) {
    return { caloriesBurned: null, error: "Egzersiz adı gerekli" };
  }

  if (!durationMinutes || durationMinutes <= 0) {
    return { caloriesBurned: null, error: "Geçerli bir süre gerekli" };
  }

  if (!geminiApiKey) {
    return {
      caloriesBurned: null,
      error: "AI API anahtarı bulunamadı",
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `Bir egzersiz verildi: "${exerciseName.trim()}" - ${durationMinutes} dakika süreyle yapıldı.

Bu egzersizin ${durationMinutes} dakika süreyle yapılması durumunda yakılan kalori miktarını hesapla. Ortalama bir yetişkin (70kg) için hesapla.

Yanıtını şu formatta ver:
KALORI: [sadece sayı]

Örnek: KALORI: 250

Sadece sayıyı ver, başka bir şey yazma.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Parse response
    const lines = text.split("\n");
    let caloriesBurned = null;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("KALORI:")) {
        const calorieMatch = lines[i].match(/\d+/);
        if (calorieMatch) {
          caloriesBurned = parseInt(calorieMatch[0], 10);
          break;
        }
      }
    }

    // Eğer direkt sayı bulamazsak, tüm metinde sayı ara
    if (caloriesBurned === null) {
      const numberMatch = text.match(/\d+/);
      if (numberMatch) {
        caloriesBurned = parseInt(numberMatch[0], 10);
      }
    }

    if (caloriesBurned === null || caloriesBurned <= 0) {
      return {
        caloriesBurned: null,
        error: "AI'dan geçerli bir kalori değeri alınamadı",
      };
    }

    return { caloriesBurned, error: null };
  } catch (error: any) {
    console.error("AI egzersiz kalori hesaplama hatası:", error);
    return {
      caloriesBurned: null,
      error: error.message || "AI hesaplama hatası",
    };
  }
}

// AI ile yemek/içecek detaylarını öğren ve kalori hesapla
// userDetails: Kullanıcının girdiği detay bilgisi (opsiyonel)
export async function getFoodDetailsWithCalories(
  foodName: string,
  isDrink: boolean = false,
  userDetails?: string,
): Promise<{
  details: string | null;
  calories: number | null;
  error: string | null;
}> {
  if (!foodName || !foodName.trim()) {
    return { details: null, calories: null, error: "Yemek/içecek adı gerekli" };
  }

  if (!geminiApiKey) {
    return {
      details: null,
      calories: null,
      error: "AI API anahtarı bulunamadı",
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    let prompt = "";
    if (isDrink) {
      if (userDetails && userDetails.trim()) {
        // Kullanıcı detay girmişse, sadece kalori hesapla
        prompt = `Bir içecek verildi: "${foodName}" - ${userDetails.trim()}. Bu içeceğin bu porsiyonunda kaç kalori olduğunu hesapla.

Yanıtını şu formatta ver:
KALORI: [sadece sayı]

Örnek: KALORI: 140`;
      } else {
        // Kullanıcı detay girmemişse, olası seçenekleri göster
        prompt = `Bir içecek adı verildi: "${foodName}". Bu içecek için olası porsiyon seçeneklerini belirle (örneğin: kutu kola, şişe kola, bir bardak kola gibi). Her seçenek için kalori miktarını hesapla. 

Yanıtını şu formatta ver:
DETAY: [seçenek açıklaması]
KALORI: [sadece sayı]

Örnek yanıt:
DETAY: Kutu kola (330ml)
KALORI: 140

DETAY: Şişe kola (500ml)
KALORI: 210

DETAY: Bir bardak kola (200ml)
KALORI: 85

Eğer sadece bir seçenek varsa, o seçeneği ver.`;
      }
    } else {
      if (userDetails && userDetails.trim()) {
        // Kullanıcı detay girmişse, sadece kalori hesapla
        prompt = `Bir yemek verildi: "${foodName}" - ${userDetails.trim()}. Bu yemeğin bu porsiyonunda kaç kalori olduğunu hesapla.

Yanıtını şu formatta ver:
KALORI: [sadece sayı]

Örnek: KALORI: 280`;
      } else {
        // Kullanıcı detay girmemişse, olası seçenekleri göster
        prompt = `Bir yemek adı verildi: "${foodName}". Bu yemek için olası porsiyon ve hazırlama seçeneklerini belirle (örneğin: yarım porsiyon, tam porsiyon, lavash ile, ekmek ile gibi). Her seçenek için kalori miktarını hesapla.

Yanıtını şu formatta ver:
DETAY: [seçenek açıklaması]
KALORI: [sadece sayı]

Örnek yanıt:
DETAY: Yarım porsiyon tavuk döner, lavash ile
KALORI: 280

DETAY: Tam porsiyon tavuk döner, lavash ile
KALORI: 560

DETAY: Yarım porsiyon tavuk döner, ekmek ile
KALORI: 320

Eğer sadece bir seçenek varsa, o seçeneği ver.`;
      }
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Parse response
    const lines = text.split("\n");
    let details = userDetails && userDetails.trim() ? userDetails.trim() : null;
    let calories = null;

    for (let i = 0; i < lines.length; i++) {
      if (!userDetails && lines[i].startsWith("DETAY:")) {
        details = lines[i].replace("DETAY:", "").trim();
      } else if (lines[i].startsWith("KALORI:")) {
        const caloriesMatch = lines[i].match(/\d+/);
        if (caloriesMatch) {
          calories = parseInt(caloriesMatch[0], 10);
          if (userDetails) {
            // Kullanıcı detay girmişse, ilk kalori bulunduğunda çık
            break;
          }
        }
      }
    }

    // Eğer kullanıcı detay girmişse ama detay bulunamadıysa, kullanıcının girdiğini kullan
    if (userDetails && userDetails.trim() && !details) {
      details = userDetails.trim();
    }

    if (calories && calories > 0 && calories < 10000) {
      return { details, calories, error: null };
    }

    return { details: null, calories: null, error: "Kalori hesaplanamadı" };
  } catch (error: any) {
    console.error("AI kalori hesaplama hatası:", error);
    return {
      details: null,
      calories: null,
      error: error?.message || "Kalori hesaplanırken bir hata oluştu",
    };
  }
}

// AI ile yemek/içecek kalori hesapla (basit versiyon - geriye dönük uyumluluk için)
export async function calculateCaloriesFromFoodName(
  foodName: string,
  isDrink: boolean = false,
): Promise<{ calories: number | null; error: string | null }> {
  const result = await getFoodDetailsWithCalories(foodName, isDrink);
  return { calories: result.calories, error: result.error };
}

// AI ile resimden yemek/içecek analizi yap
export async function analyzeFoodFromImage(imageBase64: string): Promise<{
  name: string | null;
  isDrink: boolean;
  details: string | null;
  calories: number | null;
  error: string | null;
}> {
  if (!imageBase64) {
    return {
      name: null,
      isDrink: false,
      details: null,
      calories: null,
      error: "Resim gerekli",
    };
  }

  if (!geminiApiKey) {
    return {
      name: null,
      isDrink: false,
      details: null,
      calories: null,
      error: "AI API anahtarı bulunamadı",
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `Bu resimde bir yemek veya içecek görüyorum. Lütfen şunları belirle:

1. Yemek mi içecek mi? (YEMEK veya İÇECEK)
2. İsmi nedir? (sadece isim, Türkçe)
3. Porsiyon/detay bilgisi nedir? (resimde görünen porsiyon miktarına göre: yarım porsiyon, tam porsiyon, kutu, şişe, bardak, tabak vb.)
4. Kaç kalori? (sadece sayı, resimde görünen porsiyon için)

Yanıtını şu formatta ver:
TİP: [YEMEK veya İÇECEK]
İSİM: [yemek/içecek ismi]
DETAY: [porsiyon/detay bilgisi]
KALORI: [sadece sayı]

Örnek yanıt:
TİP: YEMEK
İSİM: Tavuk Döner
DETAY: Yarım porsiyon, lavash ile
KALORI: 280

veya

TİP: İÇECEK
İSİM: Kola
DETAY: Kutu (330ml)
KALORI: 140`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text().trim();

    // Parse response
    let name = null;
    let isDrink = false;
    let details = null;
    let calories = null;

    const lines = text.split("\n");
    for (const line of lines) {
      if (line.startsWith("TİP:")) {
        const tip = line.replace("TİP:", "").trim().toUpperCase();
        isDrink = tip === "İÇECEK";
      } else if (line.startsWith("İSİM:")) {
        name = line.replace("İSİM:", "").trim();
      } else if (line.startsWith("DETAY:")) {
        details = line.replace("DETAY:", "").trim();
      } else if (line.startsWith("KALORI:")) {
        const caloriesMatch = line.match(/\d+/);
        if (caloriesMatch) {
          calories = parseInt(caloriesMatch[0], 10);
        }
      }
    }

    if (name && calories && calories > 0 && calories < 10000) {
      return { name, isDrink, details, calories, error: null };
    }

    return {
      name: null,
      isDrink: false,
      details: null,
      calories: null,
      error: "Resim analiz edilemedi",
    };
  } catch (error: any) {
    console.error("AI resim analizi hatası:", error);
    return {
      name: null,
      isDrink: false,
      details: null,
      calories: null,
      error: error?.message || "Resim analiz edilirken bir hata oluştu",
    };
  }
}
