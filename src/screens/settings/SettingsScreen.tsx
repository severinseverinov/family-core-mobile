import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  LogOut,
  Save,
  Users,
  PawPrint,
  ChevronRight,
  ChevronLeft,
  Droplet,
  Bell,
  BellRing,
  BellOff,
  Volume2,
  VolumeX,
  Heart,
  Home,
  Activity,
  HeartPulse,
  ShoppingCart,
  ShoppingBag,
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { getPreferences, updatePreferences } from "../../services/settings";
import SelectionGroup from "../../components/ui/SelectionGroup";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { setupWaterRemindersForFamily } from "../../services/waterReminder";
import {
  getNotificationPermissionStatus,
  requestNotificationPermissions,
  openAppNotificationSettings,
} from "../../services/notifications";

export default function SettingsScreen() {
  const { colors, themeMode, setThemeMode } = useTheme();
  const { signOut } = useAuth();
  const navigation = useNavigation<any>();

  const [lang, setLang] = useState("tr");
  const [currency, setCurrency] = useState("TL");
  const [themeColor, setThemeColor] = useState("blue");
  const [waterReminderEnabled, setWaterReminderEnabled] = useState(false);

  // Bildirim ayarları
  const [notificationSound, setNotificationSound] = useState<"default" | "soft" | "loud" | "silent">("default");
  const [notificationIcon, setNotificationIcon] = useState<"users" | "heart" | "home" | "activity" | "heart-pulse" | "shopping-cart" | "shopping-bag" | "app-icon">("users");
  const [notificationVibration, setNotificationVibration] = useState(true);
  const [notificationBadge, setNotificationBadge] = useState(true);

  const [permissionStatus, setPermissionStatus] = useState<"granted" | "denied" | "undetermined">("undetermined");
  const [loading, setLoading] = useState(false);

  const loadPermissionStatus = async () => {
    const s = await getNotificationPermissionStatus();
    setPermissionStatus(s);
  };

  const loadPrefs = async () => {
    const prefs = await getPreferences();
    if (prefs) {
      const defaultLang = "tr";
      const defaultCurrency = "TL";

      const nextLang = prefs.preferred_language || defaultLang;
      const nextCurrency = prefs.preferred_currency || defaultCurrency;

      setLang(nextLang);
      setCurrency(nextCurrency);
      setThemeColor(prefs.theme_color || "blue");
      setWaterReminderEnabled(prefs.water_reminder_enabled || false);
      
      // Bildirim ayarları
      const notifSettings = prefs.notification_settings || {};
      setNotificationSound(notifSettings.sound || "default");
      setNotificationIcon(notifSettings.icon || "users");
      setNotificationVibration(notifSettings.vibration !== false);
      setNotificationBadge(notifSettings.badge !== false);

      if (!prefs.preferred_language || !prefs.preferred_currency) {
        updatePreferences({
          language: nextLang,
          currency: nextCurrency,
        });
      }
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadPrefs();
      loadPermissionStatus();
    }, []),
  );


  const handleSave = async () => {
    setLoading(true);
    
    // Önce su içme hatırlatıcısını ayarla
    const waterResult = await setupWaterRemindersForFamily(waterReminderEnabled);
    if (!waterResult.success && waterReminderEnabled) {
      Alert.alert("Uyarı", waterResult.error || "Su içme hatırlatıcısı ayarlanamadı.");
    }
    
    const res = await updatePreferences({
      language: lang,
      currency,
      themeColor,
      waterReminderEnabled,
      notificationSettings: {
        sound: notificationSound,
        icon: notificationIcon as any,
        vibration: notificationVibration,
        badge: notificationBadge,
      },
    });
    setLoading(false);
    if (res.success) {
      await loadPrefs();
      Alert.alert("Başarılı", "Tercihleriniz güncellendi.");
      if (navigation.canGoBack()) navigation.goBack();
    } else if ((res as any).partialSuccess) {
      await loadPrefs();
      Alert.alert(
        "Kısmi Kayıt",
        typeof res.error === "string" ? res.error : "Bildirim ayarları kaydedilemedi.",
      );
    } else {
      Alert.alert("Hata", typeof res.error === "string" ? res.error : "Ayarlar kaydedilemedi.");
    }
  };

  const permissionStatusLabel =
    permissionStatus === "granted"
      ? "Açık"
      : permissionStatus === "denied"
        ? "Kapalı"
        : "İstenmedi";
  const permissionStatusColor =
    permissionStatus === "granted"
      ? "#22c55e"
      : permissionStatus === "denied"
        ? "#ef4444"
        : colors.textMuted;
  const permissionStatusBg =
    permissionStatus === "granted"
      ? "#22c55e20"
      : permissionStatus === "denied"
        ? "#ef444420"
        : colors.border + "40";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { borderColor: colors.border }]}
          >
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
        <Text style={[styles.mainTitle, { color: colors.text }]}>Ayarlar</Text>
        </View>

        <SelectionGroup
          label="Uygulama Dili"
          options={[
            { label: "Türkçe", value: "tr" },
            { label: "English", value: "en" },
            { label: "Deutsch", value: "de" },
          ]}
          selectedValue={lang}
          onSelect={setLang}
        />

        <SelectionGroup
          label="Para Birimi"
          options={[
            { label: "₺ TL", value: "TL" },
            { label: "$ USD", value: "USD" },
            { label: "€ EUR", value: "EUR" },
          ]}
          selectedValue={currency}
          onSelect={setCurrency}
        />

        <SelectionGroup
          label="Görünüm Modu"
          options={[
            { label: "Aydınlık", value: "light" },
            { label: "Karanlık", value: "dark" },
            { label: "Renkli", value: "colorful" },
          ]}
          selectedValue={themeMode}
          onSelect={(val: any) => setThemeMode(val)}
        />

        {/* Bildirim Ayarları Bölümü */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            BİLDİRİM AYARLARI
          </Text>

          {/* Bildirim izni kartı */}
          <View
            style={[
              styles.permissionCard,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.permissionRow}>
              <View style={styles.permissionLeft}>
                <View
                  style={[
                    styles.permissionIconWrap,
                    {
                      backgroundColor:
                        permissionStatus === "granted"
                          ? "#22c55e20"
                          : permissionStatus === "denied"
                            ? "#ef444420"
                            : colors.border + "40",
                    },
                  ]}
                >
                  <Bell
                    size={18}
                    color={
                      permissionStatus === "granted"
                        ? "#22c55e"
                        : permissionStatus === "denied"
                          ? "#ef4444"
                          : colors.textMuted
                    }
                  />
                </View>
                <View style={styles.permissionTitleRow}>
                  <Text style={[styles.permissionTitle, { color: colors.text }]}>
                    Bildirim izni
                  </Text>
                  <View
                    style={[
                      styles.permissionStatusPill,
                      { backgroundColor: permissionStatusBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.permissionStatusText,
                        { color: permissionStatusColor },
                      ]}
                    >
                      {permissionStatusLabel}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.permissionActions}>
              {permissionStatus !== "granted" && (
                <TouchableOpacity
                  onPress={async () => {
                    const { granted } = await requestNotificationPermissions();
                    await loadPermissionStatus();
                    if (granted) {
                      Alert.alert(
                        "Başarılı",
                        "Bildirim izni verildi. Uygulama kapalıyken de önemli bildirimler iletilecektir.",
                      );
                    } else {
                      Alert.alert(
                        "İzin gerekli",
                        "Bildirimler için izin verilmedi. Ayarlar üzerinden açabilirsiniz.",
                        [
                          { text: "Tamam" },
                          {
                            text: "Ayarlara git",
                            onPress: openAppNotificationSettings,
                          },
                        ],
                      );
                    }
                  }}
                  style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.permissionBtnText}>
                    {permissionStatus === "undetermined" ? "İzni ver" : "Tekrar dene"}
                  </Text>
                </TouchableOpacity>
              )}
              {permissionStatus === "denied" && (
                <TouchableOpacity
                  onPress={openAppNotificationSettings}
                  style={[
                    styles.permissionBtnOutline,
                    { borderColor: colors.primary },
                  ]}
                >
                  <ChevronRight size={16} color={colors.primary} />
                  <Text style={[styles.permissionBtnOutlineText, { color: colors.primary }]}>
                    Ayarlara git
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.notificationIconSection}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: 10 }]}>
              BİLDİRİM İKONU
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.iconScroll}
            >
              {[
                { label: "Aile", value: "users", icon: Users, color: "#3b82f6" },
                { label: "Sevgi", value: "heart", icon: Heart, color: "#ef4444" },
                { label: "Ev", value: "home", icon: Home, color: "#10b981" },
                { label: "Sağlık", value: "activity", icon: Activity, color: "#8b5cf6" },
                { label: "Kalp", value: "heart-pulse", icon: HeartPulse, color: "#f59e0b" },
                { label: "Market", value: "shopping-cart", icon: ShoppingCart, color: "#06b6d4" },
                { label: "Alışveriş", value: "shopping-bag", icon: ShoppingBag, color: "#ec4899" },
                { label: "Uygulama", value: "app-icon", isAsset: true },
              ].map((opt) => {
                const isSelected = notificationIcon === opt.value;
                const getAssetIcon = () => {
                  if (themeMode === "colorful") {
                    return require("../../../assets/icons/colour.png");
                  } else if (themeMode === "dark") {
                    return require("../../../assets/icons/dark.png");
                  } else {
                    return require("../../../assets/icons/light.png");
                  }
                };

                const IconComponent = opt.icon;

                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setNotificationIcon(opt.value as any)}
                    style={[
                      styles.iconOption,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {opt.isAsset ? (
                      <Image
                        source={getAssetIcon()}
                        style={styles.assetIcon}
                        resizeMode="contain"
                      />
                    ) : IconComponent ? (
                      <View style={styles.iconWrapper}>
                        <IconComponent
                          size={24}
                          color={isSelected ? "#fff" : opt.color}
                        />
                        <Text
                          style={[
                            styles.iconLabel,
                            { color: isSelected ? "#fff" : colors.text },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.iconOptionText,
                          { color: isSelected ? "#fff" : colors.text },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <SelectionGroup
            label="Bildirim Sesi"
            options={[
              { label: "Varsayılan", value: "default" },
              { label: "Yumuşak", value: "soft" },
              { label: "Yüksek", value: "loud" },
              { label: "Sessiz", value: "silent" },
            ]}
            selectedValue={notificationSound}
            onSelect={(val: any) => setNotificationSound(val)}
          />

          <View style={[styles.switchRow, { borderColor: colors.border }]}>
            <View style={styles.switchLabelRow}>
              <Bell size={20} color={colors.text} />
              <Text style={[styles.switchLabel, { color: colors.text }]}>
                Titreşim
              </Text>
            </View>
            <Switch
              value={notificationVibration}
              onValueChange={setNotificationVibration}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.switchRow, { borderColor: colors.border }]}>
            <View style={styles.switchLabelRow}>
              <BellRing size={20} color={colors.text} />
              <Text style={[styles.switchLabel, { color: colors.text }]}>
                Rozet (Badge)
              </Text>
            </View>
            <Switch
              value={notificationBadge}
              onValueChange={setNotificationBadge}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Save size={20} color="#fff" />
          <Text style={styles.saveBtnText}>
            {loading ? "Kaydediliyor..." : "Ayarları Kaydet"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={() => signOut()}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Oturumu Kapat</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingVertical: 15,
    marginBottom: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "900",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  switchLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  permissionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  permissionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  permissionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  permissionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  permissionStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  permissionStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  permissionDesc: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.85,
  },
  permissionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  permissionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  permissionBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  permissionBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  permissionBtnOutlineText: {
    fontWeight: "600",
    fontSize: 13,
  },
  notificationIconSection: {
    marginBottom: 20,
  },
  iconScroll: {
    gap: 10,
    paddingLeft: 4,
  },
  iconOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 15,
    borderWidth: 1,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
    height: 70,
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  iconLabel: {
    fontWeight: "600",
    fontSize: 11,
    textAlign: "center",
  },
  iconOptionText: {
    fontWeight: "700",
    fontSize: 14,
  },
  assetIcon: {
    width: 32,
    height: 32,
  },
  managementCard: {
    borderRadius: 20,
    marginBottom: 10,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderBottomWidth: 0.5,
  },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuText: { fontSize: 16, fontWeight: "600" },
  infoBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  memberSelect: { marginBottom: 12 },
  memberLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  memberRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  memberChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveBtn: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 10,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 10,
  },
  logoutText: { color: "#ef4444", fontWeight: "bold" },
});
