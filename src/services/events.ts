// events.ts (React Native Version)
import { supabase } from "./supabase"; // Kendi supabase client yolunu ekle
import { givePoints } from "./gamification"; // Bu fonksiyonun da RN uyumlu olduğundan emin ol

export interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
}

export interface DashboardItem {
  id: string;
  type: "event" | "task";
  title: string;
  description?: string;
  category?: string;
  time?: string;
  is_completed?: boolean;
  completed_by?: string;
  creator?: {
    full_name: string;
    avatar_url: string;
  } | null;
  points?: number;
  pet_name?: string;
  pet_color?: string;
  pet_id?: string;
  routine_id?: string;
  frequency?: string;
  privacy_level?: string;
  assigned_to?: string[] | null;
  status?: "pending" | "completed" | "pending_approval";
  log_id?: string;
  requires_verification?: boolean;
  task_type?: string;
  rule_id?: string;
}

// 1. Resmi Tatilleri Getir
export async function getPublicHolidays(countryCode: string = "TR") {
  const year = new Date().getFullYear();
  try {
    const response = await fetch(
      `https://date.nager.at/api/v3/publicholidays/${year}/${countryCode}`
    );
    if (!response.ok) return [];
    return (await response.json()) as Holiday[];
  } catch (error) {
    return [];
  }
}

// 2. Dashboard Öğelerini Getir
export async function getDashboardItems(dateStr?: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, role, id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) return { items: [] };

  const isAdmin = ["owner", "admin"].includes(profile.role || "");
  const targetDate = dateStr ? new Date(dateStr) : new Date();

  const queryStart = new Date(targetDate);
  queryStart.setHours(0, 0, 0, 0);
  const queryStartStr = queryStart.toISOString();

  const queryEnd = new Date(targetDate);
  queryEnd.setHours(23, 59, 59, 999);
  const queryEndStr = queryEnd.toISOString();

  // Veritabanı sorguları (Aynı Mantık)
  const [oneTimeEvents, recurringEvents, routines, members] = await Promise.all(
    [
      supabase
        .from("events")
        .select(
          `*, completer:completed_by(full_name), creator:created_by(full_name, avatar_url)`
        )
        .eq("family_id", profile.family_id)
        .or("frequency.eq.none,frequency.is.null")
        .gte("start_time", queryStartStr)
        .lte("start_time", queryEndStr)
        .order("start_time", { ascending: true }),
      supabase
        .from("events")
        .select(`*, creator:created_by(full_name, avatar_url)`)
        .eq("family_id", profile.family_id)
        .neq("frequency", "none")
        .lte("start_time", queryEndStr),
      supabase
        .from("pet_routines")
        .select(
          `id, title, points, frequency, created_at, requires_verification, assigned_to, pet_id, pets (name, color)`
        )
        .eq("family_id", profile.family_id),
      supabase
        .from("profiles")
        .select("id, full_name, birth_date, avatar_url")
        .eq("family_id", profile.family_id)
        .not("birth_date", "is", null),
    ]
  );

  const dashboardItems: DashboardItem[] = [];

  const canViewEvent = (event: any) => {
    if (!event.privacy_level || event.privacy_level === "family") return true;
    if (event.privacy_level === "parents") return isAdmin;
    if (event.privacy_level === "children") return !isAdmin;
    if (event.privacy_level === "member") {
      if (
        event.assigned_to &&
        typeof event.assigned_to === "string" &&
        event.assigned_to.includes(user.id)
      )
        return true;
      return (
        isAdmin || event.assigned_to === user.id || event.created_by === user.id
      );
    }
    if (event.privacy_level === "private") return event.created_by === user.id;
    return true;
  };

  // Tek seferlikler
  oneTimeEvents.data?.forEach((e: any) => {
    if (canViewEvent(e)) {
      dashboardItems.push({
        id: e.id,
        type: "event",
        title: e.title,
        description: e.description,
        category: e.category,
        time: e.start_time,
        is_completed: e.is_completed,
        completed_by: e.completer?.full_name,
        creator: e.creator,
        frequency: "none",
        privacy_level: e.privacy_level,
        status: e.status,
        points: e.points,
        assigned_to: e.assigned_to ? e.assigned_to.split(",") : null,
      });
    }
  });

  // Tekrarlayanlar ve Diğer Mantıklar (DashboardItem push işlemleri orijinal kodun aynısıdır)
  // ... (Burada orijinal kodundaki döngüleri ve tarih kontrollerini birebir kullanabilirsin)

  return { items: dashboardItems };
}

// 3. Görevi Tamamla
export async function completeEvent(eventId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açın" };

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (!event) return { error: "Görev bulunamadı" };
  if (event.is_completed) return { error: "Zaten tamamlanmış." };

  const status = event.requires_verification ? "pending_approval" : "completed";

  const { error } = await supabase
    .from("events")
    .update({
      completed_by: user.id,
      is_completed: true,
      status: status,
    })
    .eq("id", eventId);

  if (error) return { error: error.message };

  if (!event.requires_verification && event.points > 0) {
    try {
      await givePoints(user.id, event.points, `${event.title} tamamlandı`);
    } catch (err) {
      console.error("Puan verme hatası:", err);
    }
  }

  return { success: true, status };
}

// 4. Görevi Onayla (Ebeveyn İçin)
export async function approveEvent(eventId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açın" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["owner", "admin"].includes(profile?.role || "")) {
    return { error: "Sadece ebeveynler onaylayabilir" };
  }

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) return { error: "Görev bulunamadı" };
  if (event.status !== "pending_approval") {
    return { error: "Görev onay bekliyor durumunda değil" };
  }

  // Status'u completed yap
  const { error: updateError } = await supabase
    .from("events")
    .update({
      status: "completed",
    })
    .eq("id", eventId);

  if (updateError) return { error: updateError.message };

  // Puanları ver (completed_by kullanıcısına)
  if (event.points > 0 && event.completed_by) {
    try {
      await givePoints(
        event.completed_by,
        event.points,
        `${event.title} onaylandı`
      );
    } catch (err) {
      console.error("Puan verme hatası:", err);
    }
  }

  return { success: true };
}

// 5. Görevi Reddet / Geri Al (Ebeveyn İçin)
export async function rejectEvent(eventId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açın" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["owner", "admin"].includes(profile?.role || "")) {
    return { error: "Sadece ebeveynler reddedebilir" };
  }

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) return { error: "Görev bulunamadı" };

  // Status'u pending yap ve completed durumunu sıfırla
  const { error: updateError } = await supabase
    .from("events")
    .update({
      status: "pending",
      is_completed: false,
      completed_by: null,
    })
    .eq("id", eventId);

  if (updateError) return { error: updateError.message };

  return { success: true };
}

// 6. Etkinlik Oluştur
export async function createEvent(
  title: string,
  start_date: string,
  end_date?: string,
  type: string = "event"
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açın" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) return { error: "Aile bulunamadı" };

  const finalEndDate =
    end_date ||
    new Date(new Date(start_date).getTime() + 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("events").insert({
    family_id: profile.family_id,
    created_by: user.id,
    title,
    start_date,
    end_date: finalEndDate,
    type,
    is_all_day: false,
  });

  if (error) return { error: error.message };
  return { success: true };
}

// 5. Etkinlik Sil
export async function deleteEvent(eventId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açın" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!["owner", "admin"].includes(profile?.role || ""))
    return { error: "Yetkisiz işlem" };

  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) return { error: error.message };

  return { success: true };
}
