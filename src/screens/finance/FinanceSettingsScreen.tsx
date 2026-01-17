import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TextInput, // ModernInput yerine saf TextInput kullanacağız (Layout kontrolü için)
} from "react-native";
import {
  Save,
  ChevronLeft,
  Wallet,
  AlertCircle,
  ShoppingCart,
  Zap,
  Car,
  Baby,
  CreditCard,
  MoreHorizontal,
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
// ModernInput'u standart form alanları için tutabiliriz ama özel row'lar için TextInput kullanacağız.
import { getMonthlyConfigs, upsertMonthlyConfig } from "../../services/finance";
import { supabase } from "../../services/supabase"; // Para birimi sorgusu için

// Kategori İkon ve Renk Tanımları
const CATEGORY_CONFIG: any = {
  Mutfak: { icon: ShoppingCart, color: "#10b981", label: "Mutfak & Gıda" },
  Fatura: { icon: Zap, color: "#f59e0b", label: "Faturalar" },
  Araba: { icon: Car, color: "#3b82f6", label: "Ulaşım & Araç" },
  Cocuklar: { icon: Baby, color: "#ec4899", label: "Çocuk Bakımı" },
  Kredi: { icon: CreditCard, color: "#6366f1", label: "Kredi & Borç" },
  Diger: { icon: MoreHorizontal, color: "#94a3b8", label: "Diğer Giderler" },
};

export default function FinanceSettingsScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { monthKey } = route.params;

  const [income, setIncome] = useState("");
  const [currency, setCurrency] = useState("TL"); // Varsayılan TL, veritabanından güncellenecek
  const [budgets, setBudgets] = useState<any>({
    Mutfak: "",
    Fatura: "",
    Araba: "",
    Cocuklar: "",
    Kredi: "",
    Diger: "",
  });

  // Hesaplamalar
  const totalIncome = parseFloat(income) || 0;

  const totalAllocated = useMemo(() => {
    return Object.values(budgets).reduce(
      (sum: number, val: any) => sum + (parseFloat(val) || 0),
      0
    );
  }, [budgets]);

  const remaining = totalIncome - totalAllocated;
  const usagePercent =
    totalIncome > 0 ? (totalAllocated / totalIncome) * 100 : 0;
  const isOverBudget = remaining < 0;

  useEffect(() => {
    loadConfigs();
    fetchUserCurrency();
  }, []);

  // Kullanıcının para birimini çek
  const fetchUserCurrency = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("preferred_currency")
        .eq("id", user.id)
        .single();
      if (data?.preferred_currency) {
        setCurrency(data.preferred_currency);
      }
    }
  };

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
      await upsertMonthlyConfig(monthKey, "income", parseFloat(income) || 0);

      for (const cat of Object.keys(budgets)) {
        await upsertMonthlyConfig(
          monthKey,
          "budget",
          parseFloat(budgets[cat]) || 0,
          cat
        );
      }

      Alert.alert("Başarılı", "Bütçe planlamanız kaydedildi.");
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.border }]}
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate("Finance")
            }
          >
            <ChevronLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Bütçe Planla
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              {new Date(monthKey).toLocaleDateString("tr-TR", {
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. GELİR VE ÖZET KARTI */}
          <View
            style={[styles.summaryCard, { backgroundColor: colors.primary }]}
          >
            <View style={styles.summaryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Toplam Gelir Hedefi</Text>

                {/* Gelir Input Alanı */}
                <View style={styles.incomeInputWrapper}>
                  {/* Para Birimi Solda */}
                  <Text style={styles.currencyPrefix}>{currency}</Text>
                  <TextInput
                    value={income}
                    onChangeText={setIncome}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.transparentInput}
                  />
                </View>
              </View>

              <View style={styles.iconCircle}>
                <Wallet color={colors.primary} size={24} />
              </View>
            </View>

            {/* Progress Bar & Durum Bilgisi */}
            <View style={styles.progressSection}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressText}>
                  Planlanan: {totalAllocated.toLocaleString()} {currency}
                </Text>
                <Text style={[styles.progressText, { fontWeight: "bold" }]}>
                  {isOverBudget
                    ? "LİMİT AŞILDI"
                    : `Kalan: ${remaining.toLocaleString()} ${currency}`}
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(usagePercent, 100)}%`,
                      backgroundColor: isOverBudget ? "#ff4d4d" : "#fff",
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* UYARI MESAJI */}
          {isOverBudget && (
            <View style={styles.warningBox}>
              <AlertCircle size={20} color="#ef4444" />
              <Text style={styles.warningText}>
                Dikkat! Gelirinizden {Math.abs(remaining).toLocaleString()}{" "}
                {currency} daha fazla bütçe planladınız.
              </Text>
            </View>
          )}

          {/* 2. KATEGORİ LİMİTLERİ LİSTESİ */}
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            HARCAMA LİMİTLERİ
          </Text>

          <View style={styles.listContainer}>
            {Object.keys(budgets).map(cat => {
              const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG["Diger"];
              const Icon = config.icon;

              return (
                <View
                  key={cat}
                  style={[styles.budgetRow, { backgroundColor: colors.card }]}
                >
                  {/* Sol: İkon */}
                  <View
                    style={[
                      styles.catIcon,
                      { backgroundColor: config.color + "20" },
                    ]}
                  >
                    <Icon size={20} color={config.color} />
                  </View>

                  {/* Orta: İsim */}
                  <View style={styles.catInfo}>
                    <Text style={[styles.catName, { color: colors.text }]}>
                      {config.label}
                    </Text>
                    <Text style={[styles.catSub, { color: colors.textMuted }]}>
                      {cat}
                    </Text>
                  </View>

                  {/* Sağ: Input + Para Birimi */}
                  <View
                    style={[
                      styles.miniInputWrapper,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    <TextInput
                      value={budgets[cat]}
                      onChangeText={val =>
                        setBudgets({ ...budgets, [cat]: val })
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.miniInput, { color: colors.text }]}
                    />
                    {/* Para birimi artık input ile aynı hizada ve sağda */}
                    <Text
                      style={[styles.miniCurrency, { color: colors.textMuted }]}
                    >
                      {currency}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* KAYDET BUTONU */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Save size={20} color="#fff" />
            <Text style={styles.saveBtnText}>Planı Kaydet</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 15,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  headerSubtitle: { fontSize: 13, fontWeight: "600" },

  container: { paddingHorizontal: 16, paddingTop: 10 },

  // ÖZET KARTI
  summaryCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 5,
  },

  // Gelir Input Alanı
  incomeInputWrapper: {
    flexDirection: "row",
    alignItems: "center", // Dikey ortalama
  },
  currencyPrefix: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginRight: 6,
  },
  transparentInput: {
    flex: 1, // Kalan alanı kapla
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    padding: 0,
    margin: 0,
    // Android'de padding sorununu çözer
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  iconCircle: {
    backgroundColor: "#fff",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  progressSection: { marginTop: 5 },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressText: { color: "#fff", fontSize: 12, opacity: 0.9 },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 3 },

  // UYARI
  warningBox: {
    flexDirection: "row",
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  warningText: { color: "#b91c1c", fontSize: 13, flex: 1, fontWeight: "600" },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.5,
  },

  // LİSTE
  listContainer: { gap: 12 },
  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  catInfo: { flex: 1, paddingRight: 10 },
  catName: { fontSize: 15, fontWeight: "700" },
  catSub: { fontSize: 11, marginTop: 2 },

  // MİNİ INPUT (Kategoriler İçin)
  miniInputWrapper: {
    flexDirection: "row",
    alignItems: "center", // İçeriği dikey ortalar
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    width: 120, // Biraz daha genişlettim (uzun para birimleri için)
    height: 46, // Yükseklik arttırıldı
  },
  miniInput: {
    flex: 1, // Alanı doldur
    height: "100%", // Wrapper yüksekliğini al
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right", // Sağa yasla
    padding: 0,
    margin: 0,
    // Android hizalama fixleri
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  miniCurrency: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6, // Rakam ile para birimi arası boşluk
  },

  // FOOTER
  footer: {
    padding: 20,
    paddingBottom: 35,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: "row",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
