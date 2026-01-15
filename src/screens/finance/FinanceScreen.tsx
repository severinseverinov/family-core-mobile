import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Dimensions,
} from "react-native";
import {
  Plus,
  ShoppingCart,
  Zap,
  Car,
  Baby,
  CreditCard,
  MoreHorizontal,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react-native";
import { PieChart } from "react-native-chart-kit";
import { useTheme } from "../../contexts/ThemeContext";
import ModernInput from "../../components/ui/ModernInput";
import SelectionGroup from "../../components/ui/SelectionGroup";
import {
  getExpenses,
  addExpense,
  getMonthlyConfigs,
} from "../../services/finance";
import { getInventoryAndBudget } from "../../services/kitchen";
import HeartbeatLoader from "../../components/ui/HeartbeatLoader";

const screenWidth = Dimensions.get("window").width;

export default function FinanceScreen({ navigation }: any) {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("owner");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [expenses, setExpenses] = useState<any[]>([]);
  const [budgetInfo, setBudgetInfo] = useState({
    budget: 0,
    spent: 0,
    currency: "TL",
  });
  const [pieData, setPieData] = useState<any[]>([]);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Mutfak");

  const isParent = userRole === "owner" || userRole === "admin";

  const categories = [
    { label: "Mutfak", value: "Mutfak", icon: ShoppingCart, color: "#10b981" },
    { label: "Fatura", value: "Fatura", icon: Zap, color: "#f59e0b" },
    { label: "Araba", value: "Araba", icon: Car, color: "#3b82f6" },
    { label: "Çocuklar", value: "Cocuklar", icon: Baby, color: "#ec4899" },
    { label: "Kredi", value: "Kredi", icon: CreditCard, color: "#6366f1" },
    { label: "Diğer", value: "Diger", icon: MoreHorizontal, color: "#94a3b8" },
  ];

  const loadFinanceData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, kitchenRes, configRes] = await Promise.all([
        getExpenses(selectedMonth),
        getInventoryAndBudget(),
        getMonthlyConfigs(selectedMonth),
      ]);

      const expenseList = expRes.data || [];
      const configList = configRes.data || [];
      setExpenses(expenseList);

      // Veri Gruplama: Kategori isimlerini normalize ederek topluyoruz
      const grouped = expenseList.reduce((acc: any, curr: any) => {
        const cat = (curr.category || "Diger").trim();
        const val = Number(curr.amount) || 0; // numeric tipini JS sayısına çevir
        acc[cat] = (acc[cat] || 0) + val;
        return acc;
      }, {});

      // Pasta Grafik Verisi
      if (expenseList.length > 0) {
        const formattedPie = Object.keys(grouped).map(key => {
          const cat = categories.find(c => c.value === key) || categories[5];
          return {
            name: key,
            population: grouped[key],
            color: cat.color,
            legendFontColor: colors.text,
            legendFontSize: 11,
          };
        });
        setPieData(formattedPie);
      } else {
        setPieData([]);
      }

      // Bütçe Özeti: Harcanan ve Toplamı Yanyana Gösterim
      const kitchenLimit = configList.find(
        (c: any) => c.category === "Mutfak"
      )?.amount;
      setBudgetInfo({
        budget: Number(kitchenLimit || kitchenRes?.budget || 0),
        spent: Number(grouped["Mutfak"] || 0), // Hesaplanan gerçek harcamayı yansıt
        currency: "TL",
      });
    } catch (error) {
      console.error("Veri yükleme hatası:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, colors.text]);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  const handleAddExpense = async () => {
    if (!amount || isNaN(parseFloat(amount)))
      return Alert.alert("Hata", "Tutar girin.");

    const res = await addExpense(parseFloat(amount), category, description);
    if (res.success) {
      setAmount("");
      setDescription("");
      await loadFinanceData();
      Alert.alert("Başarılı", "Harcama kaydedildi.");
    } else {
      Alert.alert("Hata", res.error || "Harcama kaydedilemedi.");
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <HeartbeatLoader size={60} />
      </View>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.monthHeader,
          { borderBottomColor: colors.border + "40" },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            const d = new Date(selectedMonth + "-01");
            d.setMonth(d.getMonth() - 1);
            setSelectedMonth(d.toISOString().slice(0, 7));
          }}
        >
          <ChevronLeft color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.monthText, { color: colors.text }]}>
          {new Date(selectedMonth).toLocaleDateString("tr-TR", {
            month: "long",
            year: "numeric",
          })}
        </Text>

        <TouchableOpacity
          onPress={() => {
            const d = new Date(selectedMonth + "-01");
            d.setMonth(d.getMonth() + 1);
            setSelectedMonth(d.toISOString().slice(0, 7));
          }}
        >
          <ChevronRight color={colors.text} />
        </TouchableOpacity>

        {isParent && (
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() =>
              navigation.navigate("FinanceSettings", {
                monthKey: selectedMonth,
              })
            }
          >
            <Settings size={22} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* BÜTÇE KARTI: Harcanan / Toplam Yan Yana */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              Mutfak Bütçe Durumu
            </Text>
            <View style={styles.amountRow}>
              <Text
                style={[
                  styles.spentAmount,
                  {
                    color:
                      budgetInfo.spent > budgetInfo.budget
                        ? "#ef4444"
                        : "#f43f5e",
                  },
                ]}
              >
                {budgetInfo.spent.toLocaleString()}
              </Text>
              <Text style={[styles.totalAmount, { color: colors.textMuted }]}>
                {" "}
                / {budgetInfo.budget.toLocaleString()} {budgetInfo.currency}
              </Text>
            </View>
          </View>
          <TrendingUp color={colors.primary} size={28} />
        </View>

        {/* DONUT GRAFİK: Orta Delik Pozisyonu Sabitlendi */}
        {pieData.length > 0 && (
          <View
            style={[styles.cardContainer, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Harcama Analizi
            </Text>
            <View style={styles.chartWrapper}>
              <PieChart
                data={pieData}
                width={screenWidth - 48}
                height={200}
                chartConfig={{ color: (opacity = 1) => colors.text }}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                absolute
              />
              <View
                style={[styles.donutHole, { backgroundColor: colors.card }]}
              />
            </View>
          </View>
        )}

        {/* HARCAMA FORMU */}
        <View style={[styles.cardContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Harcama Ekle
          </Text>
          <ModernInput
            label="Tutar"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0.00"
          />
          <ModernInput
            label="Açıklama"
            value={description}
            onChangeText={setDescription}
            placeholder="Örn: Market harcaması"
          />
          <SelectionGroup
            label="KATEGORİ"
            options={categories.map(c => ({ label: c.label, value: c.value }))}
            selectedValue={category}
            onSelect={setCategory}
          />
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleAddExpense}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.saveBtnText}>Kaydet</Text>
          </TouchableOpacity>
        </View>

        {/* İŞLEM LİSTESİ */}
        <Text style={[styles.listTitle, { color: colors.text }]}>
          Son İşlemler
        </Text>
        {expenses.map(item => {
          const cat =
            categories.find(c => c.value === item.category) || categories[5];
          return (
            <View
              key={item.id}
              style={[styles.expenseItem, { backgroundColor: colors.card }]}
            >
              <View
                style={[styles.iconBox, { backgroundColor: cat.color + "15" }]}
              >
                <cat.icon size={22} color={cat.color} />
              </View>
              <View style={styles.expenseDetails}>
                <Text style={[styles.expName, { color: colors.text }]}>
                  {item.description || item.category}
                </Text>
                <Text style={[styles.expUser, { color: colors.textMuted }]}>
                  {item.profiles?.full_name}
                </Text>
              </View>
              <Text style={[styles.expAmount, { color: colors.text }]}>
                -{Number(item.amount).toLocaleString()} TL
              </Text>
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 15,
    gap: 20,
    borderBottomWidth: 1,
    position: "relative",
  },
  monthText: { fontSize: 17, fontWeight: "800", textTransform: "capitalize" },
  settingsBtn: { position: "absolute", right: 20, padding: 10 },
  summaryCard: {
    marginHorizontal: 8,
    padding: 22,
    borderRadius: 28,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  summaryLabel: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  amountRow: { flexDirection: "row", alignItems: "baseline" },
  spentAmount: { fontSize: 26, fontWeight: "900" },
  totalAmount: { fontSize: 16, fontWeight: "600" },
  cardContainer: {
    marginHorizontal: 8,
    padding: 20,
    borderRadius: 28,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 15 },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  donutHole: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    left: "17.5%",
    top: "30%",
    zIndex: 1,
  },
  saveBtn: {
    flexDirection: "row",
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 15,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  listTitle: {
    paddingHorizontal: 18,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 15,
  },
  expenseItem: {
    marginHorizontal: 8,
    padding: 16,
    borderRadius: 24,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  expenseDetails: { flex: 1, marginLeft: 15 },
  expName: { fontSize: 16, fontWeight: "700" },
  expUser: { fontSize: 12, marginTop: 2 },
  expAmount: { fontSize: 16, fontWeight: "800" },
});
