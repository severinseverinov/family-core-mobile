import { supabase } from "./supabase";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";

// --- TİP TANIMLARI ---
export interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  gender: string | null;
  birth_date: string | null;
  image_url: string | null;
  family_id: string;
}

// --- PET İŞLEMLERİ ---

export async function getPets() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Oturum yok" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("family_id", profile?.family_id)
    .order("created_at", { ascending: false });

  return { data: data || [], error: error?.message };
}

export async function createPet(petData: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Oturum yok" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user?.id)
    .single();
  if (!profile?.family_id) {
    return { data: null, error: "Aile bulunamadı" };
  }

  let imageUrl = null;
  if (petData.imageUri) {
    try {
      const fileExt = petData.imageUri.split(".").pop();
      const fileName = `pets/${user?.id}-${Date.now()}.${fileExt}`;
      const base64 = await FileSystem.readAsStringAsync(petData.imageUri, {
        encoding: "base64",
      });
      await supabase.storage
        .from("pet-proofs")
        .upload(fileName, decode(base64), { contentType: `image/${fileExt}` });
      const {
        data: { publicUrl },
      } = supabase.storage.from("pet-proofs").getPublicUrl(fileName);
      imageUrl = publicUrl;
    } catch (e) {
      console.log(e);
    }
  }

  const { data, error } = await supabase
    .from("pets")
    .insert({
      family_id: profile.family_id,
      name: petData.name,
      type: petData.type,
      breed: petData.breed,
      gender: petData.gender,
      birth_date: petData.birth_date,
      image_url: imageUrl,
    })
    .select()
    .single();

  return { data, error: error?.message };
}

// --- RUTİN İŞLEMLERİ (GÜNCELLENDİ) ---

export async function getRoutinesWithStatus() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Oturum yok" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user?.id)
    .single();
  if (!profile?.family_id) return { data: [], error: "Aile bulunamadı" };

  // Rutinleri ve pet bilgilerini çek
  const { data: routines } = await supabase
    .from("pet_routines")
    .select("*, pets(name, image_url)")
    .eq("family_id", profile?.family_id);

  // Bugünün loglarını çek
  const todayStart = new Date().toISOString().slice(0, 10);
  const { data: logs } = await supabase
    .from("pet_routine_logs")
    .select("*")
    .eq("family_id", profile?.family_id)
    .gte("completed_at", todayStart);

  const result = routines?.map(routine => {
    const log = logs?.find(
      l => l.routine_id === routine.id && l.status !== "rejected"
    );
    return { ...routine, log: log || null };
  });

  return { data: result || [], error: null };
}

/**
 * Gelişmiş Rutin Ekleme
 */
export async function addRoutine(
  petId: string,
  title: string,
  points: number,
  recurrence: string,
  assignedTo: string[],
  time: string
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
  if (!profile?.family_id) {
    return { success: false, error: "Aile bulunamadı" };
  }

  const { error } = await supabase.from("pet_routines").insert({
    family_id: profile.family_id,
    pet_id: petId,
    title: title,
    points: points,
    frequency: "daily", // Kodda logic olarak kullanmak için
    recurrence_type: recurrence, // daily, weekly, monthly
    assigned_to: assignedTo.length > 0 ? assignedTo : null, // Kimlere atandı
  });

  if (error) return { success: false, error: error?.message };

  const reminderAt = buildRoutineReminderDate(recurrence, time);
  if (reminderAt && assignedTo.length > 0) {
    const { data: pet } = await supabase
      .from("pets")
      .select("name")
      .eq("id", petId)
      .single();

    await supabase.from("notifications").insert(
      assignedTo.map(userId => ({
      family_id: profile.family_id,
        user_id: userId,
        title: `Rutin Hatırlatma: ${pet?.name || "Pet"}`,
        message: `${pet?.name || "Pet"} için "${title}" rutini yaklaşyor.`,
        is_read: false,
        created_at: reminderAt.toISOString(),
      }))
    );
  }

    return { success: true };
}

function buildRoutineReminderDate(recurrence: string, time: string) {
  const parts = time.split(":").map(Number);
  if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
    return null;
  }
  const [hour, minute] = parts;
  const now = new Date();

  const buildBase = () => {
    const base = new Date();
    base.setHours(hour, minute, 0, 0);
    return base;
  };

  const nextOccurrence = (base: Date) => {
    const next = new Date(base);
    if (recurrence === "weekly") {
      next.setDate(next.getDate() + 7);
    } else if (recurrence === "monthly") {
      const day = next.getDate();
      next.setMonth(next.getMonth() + 1);
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      if (day > lastDay) {
        next.setDate(lastDay);
      } else {
        next.setDate(day);
      }
    } else {
      next.setDate(next.getDate() + 1);
    }
    return next;
  };

  let base = buildBase();
  if (base <= now) base = nextOccurrence(base);

  const reminder = new Date(base);
  if (recurrence === "daily") {
    reminder.setHours(reminder.getHours() - 2);
  } else {
    reminder.setDate(reminder.getDate() - 1);
  }

  if (reminder <= now) {
    const shifted = nextOccurrence(base);
    const nextReminder = new Date(shifted);
    if (recurrence === "daily") {
      nextReminder.setHours(nextReminder.getHours() - 2);
    } else {
      nextReminder.setDate(nextReminder.getDate() - 1);
    }
    return nextReminder;
  }

  return reminder;
}

// --- SAĞLIK & AŞI İŞLEMLERİ (YENİ) ---

/**
 * Pet Sağlık Detaylarını Getir (Aşılar + Geçmiş)
 */
export async function getPetHealthDetails(petId: string) {
  const [vaccines, logs] = await Promise.all([
    supabase
      .from("pet_vaccinations")
      .select("*")
      .eq("pet_id", petId)
      .order("date_administered", { ascending: false }),
    supabase
      .from("pet_health_logs")
      .select("*")
      .eq("pet_id", petId)
      .order("date", { ascending: false }),
  ]);

  return {
    vaccines: vaccines.data || [],
    logs: logs.data || [],
  };
}

/**
 * Sağlık Kaydı Ekle (Ameliyat, İlaç, Ölçüm)
 */
export async function addPetHealthLog(
  petId: string,
  type: string,
  title: string,
  value: string,
  description?: string
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
  if (!profile?.family_id) {
    return { success: false, error: "Aile bulunamadı" };
  }

  const { error } = await supabase.from("pet_health_logs").insert({
    pet_id: petId,
    family_id: profile.family_id,
    type, // 'surgery', 'medication', 'measurement'
    title,
    value,
    description,
    date: new Date().toISOString(),
  });

  return { success: !error, error: error?.message };
}

/**
 * Aşı Ekle ve Hatırlatıcı Kur
 */
export async function addPetVaccination(
  petId: string,
  name: string,
  dateAdministered: string,
  nextDueDate?: string
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
  if (!profile?.family_id) {
    return { success: false, error: "Aile bulunamadı" };
  }

  // 1. Aşıyı Kaydet
  const { error } = await supabase.from("pet_vaccinations").insert({
    pet_id: petId,
    family_id: profile.family_id,
    name,
    date_administered: dateAdministered,
    next_due_date: nextDueDate,
    status: "completed",
  });

  if (error) return { success: false, error: error.message };

  const { data: pet } = await supabase
    .from("pets")
    .select("name")
    .eq("id", petId)
    .single();

  const { sendPushToFamily } = await import("./notifications");
  await sendPushToFamily({
    familyId: profile.family_id,
    title: "Pet aşısı eklendi",
    body: `${pet?.name || "Pet"} için ${name} aşısı kaydedildi.${nextDueDate ? ` Sonraki tarih: ${nextDueDate}` : ""}`,
    excludeUserId: user.id,
    dataType: "pet_vaccination_added",
  });

  if (nextDueDate) {
    await supabase.from("notifications").insert({
      family_id: profile.family_id,
      user_id: user?.id,
      title: `Aşı Hatırlatması: ${pet?.name}`,
      message: `${pet?.name} için ${name} aşısının zamanı geldi (${nextDueDate}).`,
      is_read: false,
      created_at: new Date(nextDueDate).toISOString(),
    });
  }

  return { success: true };
}

export async function completeRoutine(routineId: string, imageUri: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Oturum yok" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) return { success: false, error: "Aile bulunamadı" };

  const { data: routine } = await supabase
    .from("pet_routines")
    .select("id, family_id, pet_id, title, points, requires_verification")
    .eq("id", routineId)
    .eq("family_id", profile.family_id)
    .single();
  if (!routine) return { success: false, error: "Rutin bulunamadı" };

  let proofUrl: string | null = null;
  if (imageUri) {
    try {
      const fileExt = imageUri.split(".").pop() || "jpg";
      const fileName = `routine_logs/${profile.family_id}/${routineId}-${Date.now()}.${fileExt}`;
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: "base64",
      });
      await supabase.storage
        .from("pet-proofs")
        .upload(fileName, decode(base64), { contentType: `image/${fileExt}` });
      const { data: { publicUrl } } = supabase.storage
        .from("pet-proofs")
        .getPublicUrl(fileName);
      proofUrl = publicUrl;
    } catch (e) {
      console.warn("Rutin kanıtı yüklenemedi:", e);
    }
  }

  const status = routine.requires_verification ? "pending_approval" : "approved";
  const { data: log, error: logError } = await supabase
    .from("pet_routine_logs")
    .insert({
      routine_id: routineId,
      family_id: profile.family_id,
      user_id: user.id,
      proof_url: proofUrl,
      status,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (logError) return { success: false, error: logError.message };

  const { sendPushToFamily } = await import("./notifications");
  const { data: pet } = await supabase
    .from("pets")
    .select("name")
    .eq("id", routine.pet_id)
    .single();

  const { data: parents } = await supabase
    .from("profiles")
    .select("id")
    .eq("family_id", profile.family_id)
    .in("role", ["owner", "admin"])
    .neq("id", user.id);

  const parentIds = (parents || []).map((p: any) => p.id);
  if (parentIds.length > 0) {
    const bodySuffix = routine.requires_verification ? " Onay bekliyor." : " Tamamlandı.";
    await sendPushToFamily({
      familyId: profile.family_id,
      title: "Pet rutini tamamlandı",
      body: `${pet?.name || "Pet"} için "${routine.title}" rutini tamamlandı.${bodySuffix}`,
      excludeUserId: user.id,
      targetUserIds: parentIds,
      dataType: "pet_routine_completed",
    });
  }

  return { success: true };
}

export async function reviewRoutine(
  logId: string,
  status: "approved" | "rejected",
  points: number,
  childId: string
) {
  // ... (Eski kod aynen kalacak)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase
    .from("pet_routine_logs")
    .update({ status, reviewed_by: user?.id })
    .eq("id", logId);
  if (status === "approved") {
    const { data: p } = await supabase
      .from("profiles")
      .select("current_points")
      .eq("id", childId)
      .single();
    await supabase
      .from("profiles")
      .update({ current_points: (p?.current_points || 0) + points })
      .eq("id", childId);
  }
  return { success: true };
}

export async function updatePet(
  petId: string,
  updates: {
    name?: string;
    breed?: string;
    gender?: string;
    birth_date?: string;
    type?: string;
  }
) {
  const { error } = await supabase.from("pets").update(updates).eq("id", petId);

  return { success: !error, error: error?.message };
}
