import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "./supabase"; //
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
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

/** Aile üyelerine push bildirim gönder. targetUserIds verilirse sadece onlara, yoksa tüm aileye (excludeUserId hariç). */
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
    const { data: members } = await supabase
      .from("profiles")
      .select("id, push_token")
      .eq("family_id", familyId);

    const filtered = (members || []).filter((m: any) => {
      if (!m.push_token) return false;
      if (excludeUserId && m.id === excludeUserId) return false;
      if (targetUserIds && targetUserIds.length > 0) return targetUserIds.includes(m.id);
      return true;
    });

    const tokens = filtered.map((m: any) => m.push_token);
    if (tokens.length === 0) return;

    const messages = tokens.map((token: string) => ({
      to: token,
      sound: "default",
      title,
      body,
      data: { type: dataType },
    }));

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
