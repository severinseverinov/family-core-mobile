import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform, Linking } from "react-native";
import { supabase } from "./supabase"; //
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Önemli bildirim türleri: görev atama, pet rutin, aşı, vault, finans, etkinlik onay/tamamlanma. Uygulama kapalıyken de yüksek öncelikle gider. */
export const IMPORTANT_NOTIFICATION_TYPES = [
  "task_assigned",
  "event_created",
  "event_completed",
  "event_approval",
  "event_approved",
  "pet_routine_completed",
  "pet_vaccination_added",
  "vault_item_added",
  "finance_expense_added",
] as const;

// Bildirimlerin nasıl görüneceğini ayarla
// Su içme hatırlatıcısı için bildirim kategorisi
Notifications.setNotificationCategoryAsync("water_reminder", [
  {
    identifier: "drank",
    buttonTitle: "İçtim",
    options: {
      opensAppToForeground: false,
    },
  },
]);

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Su içme bildirimi için "içildi" kontrolü
    const data = notification.request.content.data;
    if (data?.type === "water_reminder" && data?.memberId && data?.timeSlot) {
      try {
        const today = new Date().toISOString().split("T")[0];
        const drankKey = `water_drank_slot_${data.memberId}_${today}_${data.timeSlot}`;
        const drank = await AsyncStorage.getItem(drankKey);
        
        // Eğer bugün bu zaman dilimi için su içildiyse bildirimi gösterme
        if (drank === "true") {
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: false,
            shouldShowList: false,
          };
        }
      } catch (e) {
        // Hata durumunda bildirimi göster
      }
    }
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("Bildirim izni alınamadı!");
      return;
    }

    // app.json içindeki projectId kullanılır
    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })
    ).data;
  }

  if (Platform.OS === "android") {
    await ensureNotificationChannels();
  }

  if (token) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      // Token'ı profilde güncelle
      await supabase
        .from("profiles")
        .update({ push_token: token })
        .eq("id", user.id);
    }
  }

  return token;
}

/** Bildirim izin durumunu döner. */
export async function getNotificationPermissionStatus(): Promise<"granted" | "denied" | "undetermined"> {
  if (!Device.isDevice) return "undetermined";
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

/** İzin iste; yoksa sistem dialog’u açılır. granted ise token alınıp profilde güncellenir. */
export async function requestNotificationPermissions(): Promise<{
  granted: boolean;
  token?: string;
}> {
  if (!Device.isDevice) return { granted: false };
  let status = (await Notifications.getPermissionsAsync()).status;
  if (status !== "granted") {
    const { status: requested } = await Notifications.requestPermissionsAsync();
    status = requested;
  }
  if (status !== "granted") return { granted: false };
  const token = await registerForPushNotificationsAsync();
  return { granted: true, token: token ?? undefined };
}

/** Uygulama bildirim ayarları sayfasını açar (kullanıcı izni reddettiyse). */
export function openAppNotificationSettings(): void {
  Linking.openSettings();
}

/** Android: önemli + normal kanallar. Önemli kanal yüksek öncelik, uygulama kapalıyken de hedeflenir. */
let channelsCreated = false;
export async function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android" || channelsCreated) return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Genel",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F7C",
  });
  await Notifications.setNotificationChannelAsync("important", {
    name: "Önemli bildirimler",
    description: "Görev, aile, sağlık ve market bildirimleri. Uygulama kapalıyken de iletim önceliklidir.",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F7C",
    enableVibration: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  channelsCreated = true;
}

/** Aile üyelerine push bildirim gönder. targetUserIds verilirse sadece onlara, yoksa tüm aileye (excludeUserId hariç). Önemli türler yüksek öncelik + özel kanal. */
export async function sendPushToFamily(params: {
  familyId: string;
  title: string;
  body: string;
  excludeUserId?: string;
  targetUserIds?: string[];
  dataType?: string;
}) {
  const { familyId, title, body, excludeUserId, targetUserIds, dataType = "generic" } = params;
  try {
    let members: any[] | null = null;
    const { data: withNotif, error } = await supabase
      .from("profiles")
      .select("id, push_token, notification_settings")
      .eq("family_id", familyId);

    const msg = String((error as any)?.message || "").toLowerCase();
    if (error && (msg.includes("notification_settings") || msg.includes("could not find"))) {
      const { data: fallback } = await supabase
        .from("profiles")
        .select("id, push_token")
        .eq("family_id", familyId);
      members = (fallback || []).map((m: any) => ({ ...m, notification_settings: {} }));
    } else {
      members = withNotif;
    }

    const filtered = (members || []).filter((m: any) => {
      if (!m.push_token) return false;
      if (excludeUserId && m.id === excludeUserId) return false;
      if (targetUserIds && targetUserIds.length > 0) return targetUserIds.includes(m.id);
      return true;
    });

    if (filtered.length === 0) return;

    const isImportant = IMPORTANT_NOTIFICATION_TYPES.includes(dataType as any);
    const messages = filtered.map((member: any) => {
      const notifSettings = member.notification_settings || {};
      const sound = notifSettings.sound === "silent" ? null : (notifSettings.sound || "default");

      const message: any = {
        to: member.push_token,
        title,
        body,
        priority: isImportant ? "high" : "normal",
        data: {
          type: dataType,
          icon: notifSettings.icon || "users",
          vibration: notifSettings.vibration !== false,
        },
      };

      if (sound !== null) {
        message.sound = sound;
      }

      if (notifSettings.badge !== false) {
        message.badge = 1;
      }

      message.channelId = isImportant ? "important" : "default";
      message.interruptionLevel = isImportant ? "time-sensitive" : "active";

      return message;
    });

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.warn("Push bildirimi gönderilemedi:", e);
  }
}
