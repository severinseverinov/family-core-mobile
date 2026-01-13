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
import { LogOut, Save } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { getPreferences, updatePreferences } from "../../services/settings";
import SelectionGroup from "../../components/ui/SelectionGroup";

export default function SettingsScreen() {
  const { colors, themeMode, setThemeMode } = useTheme();
  const { profile, signOut } = useAuth();

  // Web'deki settings.ts yapısına uygun state'ler
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
    if (res.success) Alert.alert("Başarılı", "Tercihleriniz güncellendi.");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.mainTitle, { color: colors.text }]}>Ayarlar</Text>

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
  container: { padding: 20 },
  mainTitle: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 20,
    marginTop: 10,
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
