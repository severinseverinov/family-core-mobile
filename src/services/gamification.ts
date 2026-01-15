// services/gamification.ts
import { supabase } from "./supabase";

export interface Reward {
  id: string;
  title: string;
  cost: number;
  icon: string;
  family_id: string;
}

// 1. Liderlik Tablosunu Getir
export const getLeaderboard = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { users: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) return { users: [] };

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, current_points, role")
    .eq("family_id", profile.family_id)
    .order("current_points", { ascending: false });

  if (error) throw error;
  return { users: users || [] };
};

// 2. Puan Ver (givePoints) - React Native Uyarlaması
// FormData yerine doğrudan parametre alacak şekilde güncellendi
export async function givePoints(
  userId: string,
  points: number,
  reason: string
) {
  try {
    // 1. Puan geçmişine (log) ekle
    // Not: Veritabanınızda 'point_logs' tablosu olduğunu varsayıyoruz.
    const { error: logError } = await supabase.from("point_logs").insert({
      user_id: userId,
      points: points,
      reason: reason,
      type: points > 0 ? "earned" : "spent",
      created_at: new Date().toISOString(),
    });

    if (logError) {
      console.warn(
        "Puan logu oluşturulamadı ancak işlem devam ediyor:",
        logError
      );
    }

    // 2. Profildeki puanı güncelle
    // Önce mevcut puanı alıyoruz
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("current_points, total_points")
      .eq("id", userId)
      .single();

    if (fetchError) throw fetchError;

    const currentPoints = profile.current_points || 0;
    const totalPoints = profile.total_points || 0;

    const newCurrent = currentPoints + points;
    // Sadece pozitif puanlar toplam puana eklenir, harcamalar toplamı düşürmez (Level sistemi için)
    const newTotal = points > 0 ? totalPoints + points : totalPoints;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        current_points: newCurrent,
        total_points: newTotal,
      })
      .eq("id", userId);

    if (updateError) throw updateError;

    return { success: true, newPoints: newCurrent };
  } catch (error: any) {
    console.error("Gamification servisi hatası:", error.message);
    return { error: error.message };
  }
}

// 3. Ödül Satın Al
export const redeemReward = async (
  rewardId: string,
  cost: number,
  rewardTitle: string
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açılmadı" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_points")
    .eq("id", user.id)
    .single();

  if ((profile?.current_points || 0) < cost) {
    return { error: "Yetersiz Puan!" };
  }

  const { error } = await supabase.rpc("add_points", {
    target_user_id: user.id,
    points_amount: -cost,
    reason: `Ödül alındı: ${rewardTitle}`,
  });

  if (error) return { error: "İşlem başarısız: " + error.message };
  return { success: true };
};

// 4. Ödülleri Listele
export const getRewards = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rewards: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) return { rewards: [] };

  const { data: rewards, error } = await supabase
    .from("rewards")
    .select("*")
    .eq("family_id", profile.family_id)
    .order("cost", { ascending: true });

  if (error) throw error;
  return { rewards: rewards || [] };
};

// 5. Puan Geçmişini Getir
export const getPointHistory = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { history: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) return { history: [] };

  const { data: history, error } = await supabase
    .from("point_history")
    .select(
      `id, amount, description, created_at, profile_id, profiles (full_name, avatar_url)`
    )
    .eq("family_id", profile.family_id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return { history: history || [] };
};
