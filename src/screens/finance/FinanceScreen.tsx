import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import {
  Wallet,
  Plus,
  ShoppingCart,
  Zap,
  Car,
  Baby,
  CreditCard,
  MoreHorizontal,
  TrendingUp,
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import ModernInput from "../../components/ui/ModernInput";
import SelectionGroup from "../../components/ui/SelectionGroup";
import { getExpenses, addExpense } from "../../services/finance";
import { getInventoryAndBudget } from "../../services/kitchen";

export default function FinanceScreen() {
  const { colors } = useTheme();

  // State Yönetimi
  const [expenses, setExpenses] = useState<any[]>([]);
  const [budgetInfo, setBudgetInfo] = useState({
    budget: 0,
    spent: 0,
    currency: "TL",
  });
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Mutfak");
  const [loading, setLoading] = useState(true);

  // Kategoriler ve İkon Eşleşmeleri
  const categories = [
    { label: "Mutfak", value: "Mutfak", icon: ShoppingCart, color: "#10b981" },
    { label: "Fatura", value: "Fatura", icon: Zap, color: "#f59e0b" },
    { label: "Araba", value: "Araba", icon: Car, color: "#3b82f6" },
    { label: "Çocuklar", value: "Cocuklar", icon: Baby, color: "#ec4899" },
    { label: "Kredi", value: "Kredi", icon: CreditCard, color: "#6366f1" },
    { label: "Diğer", value: "Diger", icon: MoreHorizontal, color: "#94a3b8" },
  ];

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    setLoading(true);
    try {
      // Hem genel harcamaları hem de mutfak bütçe durumunu çekiyoruz
      const [expRes, kitchenRes] = await Promise.all([
        getExpenses(),
        getInventoryAndBudget(),
      ]);

      setExpenses(expRes.data || []);
      setBudgetInfo({
        budget: kitchenRes.budget,
        spent: kitchenRes.spent,
        currency: kitchenRes.currency,
      });
    } catch (error) {
      console.error("Veri yükleme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      return Alert.alert("Hata", "Lütfen geçerli bir tutar girin.");
    }

    const res = await addExpense(parseFloat(amount), category, description);
    if (res.success) {
      setAmount("");
      setDescription("");
      loadFinanceData(); // Listeyi yenile
      Alert.alert("Başarılı", "Harcama bütçeye işlendi.");
    } else {
      Alert.alert("Hata", res.error);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.mainTitle, { color: colors.text }]}>
          Aile Bütçesi
        </Text>

        {/* BÜTÇE ÖZET KARTI */}
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <View>
            <Text style={styles.summaryLabel}>Toplam Mutfak Harcaması</Text>
            <Text style={styles.summaryAmount}>
              {budgetInfo.spent} / {budgetInfo.budget} {budgetInfo.currency}
            </Text>
          </View>
          <TrendingUp color="#fff" size={32} opacity={0.5} />
        </View>

        {/* YENİ HARCAMA EKLEME FORMU */}
        <View style={[styles.formCard, { backgroundColor: colors.card }]}>
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
            placeholder="Nereye harcandı?"
          />

          <SelectionGroup
            label="Kategori Seçin"
            options={categories.map(c => ({ label: c.label, value: c.value }))}
            selectedValue={category}
            onSelect={setCategory}
          />

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleAddExpense}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.saveBtnText}>Harcamayı Kaydet</Text>
          </TouchableOpacity>
        </View>

        {/* HARCAMA GEÇMİŞİ */}
        <Text style={[styles.listTitle, { color: colors.text }]}>
          Son İşlemler
        </Text>
        {expenses.map(item => {
          const catInfo =
            categories.find(c => c.value === item.category) || categories[5];
          const Icon = catInfo.icon;

          return (
            <View
              key={item.id}
              style={[styles.expenseItem, { backgroundColor: colors.card }]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: catInfo.color + "15" },
                ]}
              >
                <Icon size={22} color={catInfo.color} />
              </View>
              <View style={styles.expenseDetails}>
                <Text style={[styles.expName, { color: colors.text }]}>
                  {item.description || item.category}
                </Text>
                <Text style={[styles.expUser, { color: colors.textMuted }]}>
                  {item.profiles?.full_name} •{" "}
                  {new Date(item.created_at).toLocaleDateString("tr-TR")}
                </Text>
              </View>
              <Text style={[styles.expAmount, { color: colors.text }]}>
                -{item.amount} {budgetInfo.currency}
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
  container: { padding: 20 },
  mainTitle: { fontSize: 28, fontWeight: "900", marginBottom: 20 },
  summaryCard: {
    padding: 25,
    borderRadius: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryAmount: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 5,
  },
  formCard: { padding: 20, borderRadius: 25, marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 15 },
  saveBtn: {
    flexDirection: "row",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 10,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  listTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 15,
    marginLeft: 5,
  },
  expenseItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 22,
    marginBottom: 12,
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
