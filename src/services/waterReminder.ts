import { supabase } from "./supabase";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Yaşa göre günlük su ihtiyacı hesapla (ml cinsinden)
export function calculateDailyWaterNeed(age: number, weight?: number): number {
  // Yaş gruplarına göre ortalama su ihtiyacı (ml)
  if (age < 1) return 800; // 0-1 yaş
  if (age < 4) return 1300; // 1-3 yaş
  if (age < 9) return 1700; // 4-8 yaş
  if (age < 14) return 2400; // 9-13 yaş (kızlar)
  if (age < 18) return 2600; // 14-17 yaş (kızlar)
  // Yetişkinler için: kilo * 35 ml (basit formül)
  if (weight) {
    return Math.round(weight * 35);
  }
  // Varsayılan yetişkin ihtiyacı
  return 2500; // ~2.5 litre
}

// Yaş hesapla
export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}

// Günlük su içme zamanlarını hesapla (8 saatlik uyku varsayımı, 16 saatlik uyanıklık)
export function calculateWaterTimes(dailyNeed: number, wakeTime: number = 7): Array<{ time: string; amount: number }> {
  // Günlük 8-10 kez su içme (uyanıklık saatlerine yayılmış)
  const intervals = 8;
  const amountPerInterval = Math.round(dailyNeed / intervals);
  const times: Array<{ time: string; amount: number }> = [];
  
  // İlk su içme: uyanma saatinden 1 saat sonra
  let currentHour = wakeTime + 1;
  
  for (let i = 0; i < intervals; i++) {
    const hour = currentHour + (i * 2); // Her 2 saatte bir
    if (hour >= 22) break; // 22:00'dan sonra su içme hatırlatıcısı yok
    
    const hourStr = String(hour).padStart(2, "0");
    times.push({
      time: `${hourStr}:00`,
      amount: amountPerInterval,
    });
  }
  
  return times;
}

// Bildirim zamanlayıcı
export async function scheduleWaterReminders(memberId: string, memberName: string, times: Array<{ time: string; amount: number }>) {
  try {
    // Önce bu üye için mevcut bildirimleri iptal et
    await cancelWaterReminders(memberId);
    
    // Bildirim kategorisini ayarla (eğer yoksa)
    try {
      await Notifications.setNotificationCategoryAsync("water_reminder", [
        {
          identifier: "drank",
          buttonTitle: "İçtim",
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
    } catch (e) {
      // Kategori zaten varsa hata vermez
    }
    
    const notificationIds: string[] = [];
    const now = new Date();
    
    for (const timeSlot of times) {
      // Günlük tekrar eden bildirimler için dateComponents kullan
      const [hours, mins] = timeSlot.time.split(":").map(Number);
      
      // İlk bildirim (bugün veya yarın)
      const firstId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "💧 Su İçme Zamanı",
          body: `${memberName}, ${timeSlot.amount}ml su içmeyi unutma!`,
          sound: "default",
          data: {
            type: "water_reminder",
            memberId,
            amount: timeSlot.amount,
            timeSlot: timeSlot.time,
          },
          categoryId: "water_reminder",
        },
        trigger: {
          hour: hours,
          minute: mins,
          repeats: true, // Her gün tekrarla
        } as Notifications.DailyTriggerInput,
      });
      notificationIds.push(firstId);
      
      // 10 dakikada bir tekrar bildirim (toplam 6 kez = 1 saat) - sadece ilk gün için
      // Not: Günlük tekrar eden bildirimler için her 10 dakikada bir ayrı bildirim zor
      // Bunun yerine, ilk bildirimden sonra 10 dakikada bir bildirim gönder
      for (let i = 1; i <= 6; i++) {
        const repeatMinutes = mins + (i * 10);
        const repeatHours = hours + Math.floor(repeatMinutes / 60);
        const finalMinutes = repeatMinutes % 60;
        
        if (repeatHours >= 22) break; // 22:00'dan sonra yok
        
        const repeatId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "💧 Su İçme Zamanı",
            body: `${memberName}, ${timeSlot.amount}ml su içmeyi unutma!`,
            sound: "default",
            data: {
              type: "water_reminder",
              memberId,
              amount: timeSlot.amount,
              timeSlot: timeSlot.time,
              repeatCount: i,
            },
            categoryId: "water_reminder",
          },
          trigger: {
            hour: repeatHours,
            minute: finalMinutes,
            repeats: true, // Her gün tekrarla
          } as Notifications.DailyTriggerInput,
        });
        notificationIds.push(repeatId);
      }
    }
    
    // Bildirim ID'lerini kaydet
    await AsyncStorage.setItem(`water_reminders_${memberId}`, JSON.stringify(notificationIds));
    
    return { success: true, count: notificationIds.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Bildirimleri iptal et
export async function cancelWaterReminders(memberId: string) {
  try {
    const stored = await AsyncStorage.getItem(`water_reminders_${memberId}`);
    if (stored) {
      const data = JSON.parse(stored);
      // Yeni format: array of {timeSlot, notificationIds}
      if (Array.isArray(data) && data[0]?.notificationIds) {
        const allIds: string[] = [];
        data.forEach((item: any) => {
          if (Array.isArray(item.notificationIds)) {
            allIds.push(...item.notificationIds);
          }
        });
        await Promise.all(allIds.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
      } else if (Array.isArray(data)) {
        // Eski format: sadece ID array
        await Promise.all(data.map((id: string) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
      }
      await AsyncStorage.removeItem(`water_reminders_${memberId}`);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// "İçtim" butonuna basıldığında - o zaman dilimi için bugünkü bildirimleri durdur
export async function markWaterDrank(memberId: string, timeSlot: string) {
  try {
    // Bugün içilen suyu kaydet
    const today = new Date().toISOString().split("T")[0];
    const key = `water_drank_${memberId}_${today}`;
    const current = await AsyncStorage.getItem(key);
    const currentAmount = current ? parseInt(current, 10) : 0;
    // Zaman dilimindeki miktarı ekle (basit yaklaşım: ortalama miktar)
    const amount = 250; // Ortalama bir bardak
    await AsyncStorage.setItem(key, String(currentAmount + amount));
    
    // Bu zaman dilimi için "içildi" işaretini kaydet
    const drankKey = `water_drank_slot_${memberId}_${today}_${timeSlot}`;
    await AsyncStorage.setItem(drankKey, "true");
    
    // Bu zaman dilimi için bugünkü kalan bildirimleri iptal et
    // Günlük tekrar eden bildirimler olduğu için, sadece bugünkü olanları iptal etmek için
    // bildirim handler'da kontrol yapacağız. Burada sadece "içildi" işaretini kaydediyoruz.
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Tüm aile üyeleri için su içme hatırlatıcılarını ayarla
export async function setupWaterRemindersForFamily(enabled: boolean) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Kullanıcı bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id) return { success: false, error: "Aile bulunamadı." };

    // Aile üyelerini getir
    const { data: members } = await supabase
      .from("profiles")
      .select("id, full_name, birth_date, weight")
      .eq("family_id", profile.family_id);

    if (!members || members.length === 0) {
      return { success: true, message: "Aile üyesi bulunamadı." };
    }

    if (!enabled) {
      // Tüm bildirimleri iptal et
      for (const member of members) {
        await cancelWaterReminders(member.id);
      }
      return { success: true, message: "Tüm su içme hatırlatıcıları iptal edildi." };
    }

    // Bildirim izni kontrolü
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      return { success: false, error: "Bildirim izni gerekli." };
    }

    // Her üye için bildirimleri ayarla
    let totalScheduled = 0;
    for (const member of members) {
      const age = calculateAge(member.birth_date);
      if (!age) continue; // Yaş bilgisi yoksa atla

      const dailyNeed = calculateDailyWaterNeed(age, member.weight);
      const times = calculateWaterTimes(dailyNeed);
      
      const result = await scheduleWaterReminders(member.id, member.full_name, times);
      if (result.success) {
        totalScheduled += result.count || 0;
      }
    }

    return { success: true, message: `${totalScheduled} bildirim zamanlandı.` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
