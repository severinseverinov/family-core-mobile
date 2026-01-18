import { useQuery } from "@tanstack/react-query";
import { supabase } from "../services/supabase"; // Supabase istemciniz
import { getDashboardItems } from "../services/events"; // Daha önce yazdığımız servis
import { useAuth } from "../contexts/AuthContext";

export function useDashboardData(dateStr?: string) {
  const { user } = useAuth();

  return useQuery({
    // Query anahtarı: Kullanıcı değiştiğinde veya tarih değiştiğinde veriyi yeniler
    queryKey: ["dashboard", user?.id, dateStr],

    queryFn: async () => {
      if (!user) throw new Error("Kullanıcı oturumu bulunamadı");

      // 1. Kullanıcının profil ve aile bilgilerini al
      const { data: profile } = await supabase
        .from("profiles")
        .select("family_id, role")
        .eq("id", user.id)
        .single();

      if (!profile?.family_id) return null;

      // 2. Tüm widget verilerini paralel olarak çek (Performans için Promise.all)
      const [eventsRes, membersRes, familyRes, petsRes, kitchenRes] =
        await Promise.all([
          // Etkinlikler ve Görevler
          getDashboardItems(dateStr),

          // Aile Üyeleri
          supabase
            .from("profiles")
            .select("id, full_name, avatar_url, current_points, role")
            .eq("family_id", profile.family_id)
            .order("current_points", { ascending: false }),

          // Aile Detayları
          supabase
            .from("families")
            .select("*")
            .eq("id", profile.family_id)
            .single(),

          // Petler ve onların rutinleri
          supabase
            .from("pets")
            .select(
              `
            *,
            routines:pet_routines(*)
          `
            )
            .eq("family_id", profile.family_id),

          // Mutfak verileri (Envanter, Liste ve Bütçe)
          // Not: Tablo isimlerini projenize göre kontrol edin
          fetchKitchenData(profile.family_id),
        ]);

      return {
        events: eventsRes,
        members: { members: membersRes.data || [] },
        family: { family: familyRes.data },
        pets: { pets: petsRes.data || [] },
        kitchen: kitchenRes,
      };
    },
    // Veri 5 dakika boyunca "taze" kabul edilir, gereksiz API isteği atılmaz
    staleTime: 1000 * 60 * 5,
    enabled: !!user, // Sadece kullanıcı varsa çalıştır
  });
}

// Mutfak verilerini toplayan yardımcı fonksiyon
async function fetchKitchenData(familyId: string) {
  const [inv, list, budget] = await Promise.all([
    supabase
      .from("inventory")
      .select("*")
      .eq("family_id", familyId)
      .lt("quantity", 2),
    supabase
      .from("shopping_list")
      .select("*")
      .eq("family_id", familyId)
      .eq("is_completed", false),
    supabase
      .from("family_budgets")
      .select("*")
      .eq("family_id", familyId)
      .single(),
  ]);

  return {
    items: inv.data || [],
    shoppingList: list.data || [],
    budget: budget.data?.amount || 0,
    spent: budget.data?.spent || 0,
    currency: budget.data?.currency || "TL",
  };
}
