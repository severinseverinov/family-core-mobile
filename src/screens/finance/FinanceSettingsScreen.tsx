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
import { Save, ChevronLeft } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import ModernInput from "../../components/ui/ModernInput";
import { getMonthlyConfigs, upsertMonthlyConfig } from "../../services/finance";

export default function FinanceSettingsScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { monthKey } = route.params; // FinanceScreen'den gelen ay bilgisi

  const [income, setIncome] = useState("");
  const [budgets, setBudgets] = useState<any>({
    Mutfak: "",
    Fatura: "",
    Araba: "",
    Cocuklar: "",
    Kredi: "",
    Diger: "",
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const { data } = await getMonthlyConfigs(monthKey);
    data.forEach((item: any) => {
      if (item.type === "income") setIncome(String(item.amount));
      else if (item.type === "budget") {
        setBudgets((prev: any) => ({
          ...prev,
          [item.category]: String(item.amount),
        }));
      }
    });
  };

  const handleSave = async () => {
    try {
      // Geliri kaydet
      await upsertMonthlyConfig(monthKey, "income", parseFloat(income) || 0);

      // Kategori bütçelerini döngüyle kaydet
      for (const cat of Object.keys(budgets)) {
        await upsertMonthlyConfig(
          monthKey,
          "budget",
          parseFloat(budgets[cat]) || 0,
          cat
        );
      }

      Alert.alert("Başarılı", `${monthKey} dönemi ayarları kaydedildi.`);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate("Finance");
      }
    } catch (error) {
      Alert.alert("Hata", "Ayarlar kaydedilirken bir sorun oluştu.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack(); // Geçmiş varsa geri git
            } else {
              navigation.navigate("Finance"); // Geçmiş yoksa Finance ana ekranına yönlendir
            }
          }}
        >
          <ChevronLeft color={colors.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {monthKey} Limitleri
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* GELİR TANIMLAMA */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            AYLIK TOPLAM GELİR
          </Text>
          <ModernInput
            label="Net Gelir"
            value={income}
            onChangeText={setIncome}
            keyboardType="numeric"
            placeholder="0.00"
          />
        </View>

        {/* KATEGORİ LİMİTLERİ */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            KATEGORİ HARCAMA LİMİTLERİ
          </Text>
          {Object.keys(budgets).map(cat => (
            <ModernInput
              key={cat}
              label={`${cat} Limiti`}
              value={budgets[cat]}
              onChangeText={val => setBudgets({ ...budgets, [cat]: val })}
              keyboardType="numeric"
              placeholder="0.00"
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Save size={20} color="#fff" />
          <Text style={styles.saveBtnText}>Tüm Limitleri Uygula</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", padding: 20, gap: 15 },
  title: { fontSize: 22, fontWeight: "800" },
  container: { padding: 15 },
  card: {
    padding: 20,
    borderRadius: 28,
    marginBottom: 20,
    marginHorizontal: 8,
  }, // Standart 8px yan pay
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 15,
    letterSpacing: 1,
  },
  saveBtn: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 20,
    marginHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 40,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
