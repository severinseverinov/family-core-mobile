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
  Languages,
  Coins,
  Palette,
  User2,
  LogOut,
  Save,
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import ModernInput from "../../components/ui/ModernInput";
import { getPreferences, updatePreferences } from "../../services/settings";

export default function SettingsScreen() {
  const { colors, themeMode, toggleTheme } = useTheme();
  const { profile, signOut } = useAuth();

  // Web'deki settings.ts yapısına uygun state'ler
  const [lang, setLang] = useState("tr");
  const [currency, setCurrency] = useState("TL");
  const [themeColor, setThemeColor] = useState("blue");
  const [gender, setGender] = useState("male");
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
      setGender(prefs.gender || "male");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const res = await updatePreferences({
      language: lang,
      currency,
      themeColor,
      gender,
    });
    setLoading(false);
    if (res.success) Alert.alert("Başarılı", "Tercihleriniz güncellendi.");
  };

  const SettingCard = ({ title, children }: any) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.cardTitle, { color: colors.primary }]}>{title}</Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.mainTitle, { color: colors.text }]}>Ayarlar</Text>

        <SettingCard title="Kişisel Tercihler">
          <ModernInput
            label="Para Birimi (TL, USD, EUR)"
            value={currency}
            onChangeText={setCurrency}
          />
          <ModernInput
            label="Cinsiyet (male, female)"
            value={gender}
            onChangeText={setGender}
          />
        </SettingCard>

        <SettingCard title="Görünüm ve Dil">
          <ModernInput
            label="Uygulama Dili (tr, en, de)"
            value={lang}
            onChangeText={setLang}
          />
          <ModernInput
            label="Tema Rengi (blue, purple, green)"
            value={themeColor}
            onChangeText={setThemeColor}
          />

          <TouchableOpacity
            style={[styles.themeToggle, { backgroundColor: colors.background }]}
            onPress={toggleTheme}
          >
            <Palette size={20} color={colors.primary} />
            <Text style={{ color: colors.text, marginLeft: 10 }}>
              Mod:{" "}
              {themeMode === "dark"
                ? "Karanlık"
                : themeMode === "colorful"
                ? "Renkli"
                : "Aydınlık"}
            </Text>
          </TouchableOpacity>
        </SettingCard>

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
  card: { padding: 16, borderRadius: 20, marginBottom: 20, elevation: 2 },
  cardTitle: {
    fontSize: 13,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 15,
  },
  themeToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
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
