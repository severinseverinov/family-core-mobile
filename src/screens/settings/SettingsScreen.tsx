import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from "react-native";
import {
  LogOut,
  Save,
  Users,
  PawPrint,
  ChevronRight,
  ChevronLeft,
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { getPreferences, updatePreferences } from "../../services/settings";
import SelectionGroup from "../../components/ui/SelectionGroup";
import { useNavigation } from "@react-navigation/native";

export default function SettingsScreen() {
  const { colors, themeMode, setThemeMode } = useTheme();
  const { signOut } = useAuth();
  const navigation = useNavigation<any>();

  const [lang, setLang] = useState("tr");
  const [currency, setCurrency] = useState("TL");
  const [themeColor, setThemeColor] = useState("blue");

  const [loading, setLoading] = useState(false);
  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    const prefs = await getPreferences();
    if (prefs) {
      setLang(prefs.preferred_language || "tr");
      setCurrency(prefs.preferred_currency || "TL");
      setThemeColor(prefs.theme_color || "blue");
    }
  };


  const handleSave = async () => {
    setLoading(true);
    const res = await updatePreferences({
      language: lang,
      currency,
      themeColor,
    });
    setLoading(false);
    if (res.success) {
      Alert.alert("Başarılı", "Tercihleriniz güncellendi.");
      if (navigation.canGoBack()) navigation.goBack();
    }
  };

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
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.5,
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
