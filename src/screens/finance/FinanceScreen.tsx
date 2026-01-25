import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  Filter,
  Trash2,
  Edit2,
  Check,
  X,
  Layout,
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import ModernInput from "../../components/ui/ModernInput";
import SelectionGroup from "../../components/ui/SelectionGroup";
import GenelAyarlarModal from "../../components/modals/GenelAyarlarModal";
import {
  getExpenses,
  addExpense,
  updateExpense, // Yeni
  deleteExpense,
  getMonthlyConfigs,
} from "../../services/finance";
import { getInventoryAndBudget } from "../../services/kitchen";
import HeartbeatLoader from "../../components/ui/HeartbeatLoader";

const screenWidth = Dimensions.get("window").width;

export default function FinanceScreen({ navigation }: any) {
  const { colors, themeMode } = useTheme();
  const isLight = themeMode === "light";
  const scrollRef = useRef<ScrollView>(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("owner");

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [expenses, setExpenses] = useState<any[]>([]);
  const [currency, setCurrency] = useState("TL");
  const [budgetInfo, setBudgetInfo] = useState({ budget: 0, spent: 0 });
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("Tumu");

  // Form State'leri
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Mutfak");

  // DÜZENLEME MODU STATE'İ
  const [editingItem, setEditingItem] = useState<any>(null);

  const isParent = userRole === "owner" || userRole === "admin";

  const categories = [
    { label: "Mutfak", value: "Mutfak", icon: ShoppingCart, color: "#10b981" },
    { label: "Fatura", value: "Fatura", icon: Zap, color: "#f59e0b" },
    { label: "Araba", value: "Araba", icon: Car, color: "#3b82f6" },
    { label: "Çocuklar", value: "Cocuklar", icon: Baby, color: "#ec4899" },
    { label: "Kredi", value: "Kredi", icon: CreditCard, color: "#6366f1" },
    { label: "Diğer", value: "Diger", icon: MoreHorizontal, color: "#94a3b8" },
  ];

  const tabs = [
    { label: "Tümü", value: "Tumu", icon: Filter, color: colors.text },
    ...categories,
  ];

  const filteredExpenses = useMemo(() => {
    if (activeTab === "Tumu") return expenses;
    return expenses.filter(item => item.category === activeTab);
  }, [expenses, activeTab]);

  const loadFinanceData = useCallback(async () => {
    setLoading(true);
    try {
      const expRes = await getExpenses(selectedMonth);
      const expenseList = expRes.data || [];
      setExpenses(expenseList);

      const grouped = expenseList.reduce((acc: any, curr: any) => {
        const cat = (curr.category || "Diger").trim();
        const val = Number(curr.amount) || 0;
        acc[cat] = (acc[cat] || 0) + val;
        return acc;
      }, {});

      const totalSpent = Object.values(grouped).reduce(
        (a: any, b: any) => a + b,
        0
      ) as number;

      const stats = Object.keys(grouped)
        .map(key => {
          const cat = categories.find(c => c.value === key) || categories[5];
          const val = grouped[key];
          return {
            key,
            label: cat.label,
            amount: val,
            color: cat.color,
            icon: cat.icon,
            percentage: totalSpent > 0 ? (val / totalSpent) * 100 : 0,
          };
        })
        .sort((a, b) => b.amount - a.amount);

      setCategoryStats(stats);

      try {
        const [kitchenRes, configRes] = await Promise.all([
          getInventoryAndBudget(),
          getMonthlyConfigs(selectedMonth),
        ]);

        if (kitchenRes?.currency) setCurrency(kitchenRes.currency);

        const configList = configRes.data || [];
        const totalBudgetLimit = configList
          .filter((c: any) => c.type === "budget")
          .reduce(
            (sum: number, item: any) => sum + (Number(item.amount) || 0),
            0
          );

        setBudgetInfo({
          budget:
            totalBudgetLimit > 0
              ? totalBudgetLimit
              : Number(kitchenRes?.budget) || 0,
          spent: totalSpent,
        });
      } catch (innerErr) {
        console.warn("Bütçe verileri eksik olabilir", innerErr);
      }
    } catch (error) {
      console.error("Veri yükleme hatası:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, colors.text]);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // KAYDET / GÜNCELLE BUTONU İŞLEVİ
  const handleSaveOrUpdate = async () => {
    if (!amount || isNaN(parseFloat(amount)))
      return Alert.alert("Hata", "Geçerli bir tutar girin.");

    if (editingItem) {
      // GÜNCELLEME MODU
      const res = await updateExpense(
        editingItem.id,
        parseFloat(amount),
        category,
        description
      );
      if (res.success) {
        setEditingItem(null); // Modu kapat
        setAmount("");
        setDescription("");
        await loadFinanceData();
        Alert.alert("Başarılı", "Harcama güncellendi.");
      } else {
        Alert.alert("Hata", res.error || "Güncellenemedi");
      }
    } else {
      // YENİ EKLEME MODU
      const res = await addExpense(parseFloat(amount), category, description);
      if (res.success) {
        setAmount("");
        setDescription("");
        await loadFinanceData();
        Alert.alert("Başarılı", "Harcama eklendi!");
      } else {
        Alert.alert("Hata", res.error || "Harcama kaydedilemedi.");
      }
    }
  };

  // DÜZENLE BUTONUNA BASINCA
  const handleEditPress = (item: any) => {
    setEditingItem(item);
    setAmount(String(item.amount));
    setDescription(item.description);
    setCategory(item.category);
    // Formun olduğu yere (yukarı) kaydır
    scrollRef.current?.scrollTo({ y: 300, animated: true });
  };

  // DÜZENLEMEYİ İPTAL ET
  const handleCancelEdit = () => {
    setEditingItem(null);
    setAmount("");
    setDescription("");
  };

  const handleDeleteExpense = (item: any) => {
    Alert.alert("Harcamayı Sil", "Emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          const res = await deleteExpense(item.id);
          if (res.success) await loadFinanceData();
          else Alert.alert("Hata", res.error);
        },
      },
    ]);
  };

  const changeMonth = (direction: number) => {
    const d = new Date(selectedMonth + "-01");
    d.setMonth(d.getMonth() + direction);
    setSelectedMonth(d.toISOString().slice(0, 7));
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
        <TouchableOpacity onPress={() => changeMonth(-1)}>
          <ChevronLeft color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.monthText, { color: colors.text }]}>
          {new Date(selectedMonth).toLocaleDateString("tr-TR", {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)}>
          <ChevronRight color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => setSettingsModalVisible(true)}
          >
            <Layout size={22} color={colors.text} />
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
      </View>

      <GenelAyarlarModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        navigation={navigation}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ÖZET KARTI */}
        <View
          style={[
            styles.summaryCard,
            isLight && styles.surfaceLift,
            { backgroundColor: colors.card },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              Genel Bütçe Durumu
            </Text>
            <View style={styles.amountRow}>
              <Text
                style={[
                  styles.spentAmount,
                  {
                    color:
                      budgetInfo.spent > budgetInfo.budget &&
                      budgetInfo.budget > 0
                        ? "#ef4444"
                        : "#f43f5e",
                  },
                ]}
              >
                {budgetInfo.spent.toLocaleString()}
              </Text>
              <Text style={[styles.totalAmount, { color: colors.textMuted }]}>
                {" / "} {budgetInfo.budget.toLocaleString()} {currency}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.percentBadge,
              { backgroundColor: colors.primary + "20" },
            ]}
          >
            <TrendingUp color={colors.primary} size={24} />
          </View>
        </View>

        {/* GRAFİK BÖLÜMÜ */}
        {categoryStats.length > 0 && (
          <View
            style={[
              styles.cardContainer,
              isLight && styles.surfaceLift,
              { backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Harcama Dağılımı
            </Text>
            <View style={styles.statsList}>
              {categoryStats.map(item => (
                <View key={item.key} style={styles.statRow}>
                  <View
                    style={[
                      styles.statIcon,
                      { backgroundColor: item.color + "20" },
                    ]}
                  >
                    <item.icon size={18} color={item.color} />
                  </View>
                  <View style={styles.statContent}>
                    <View style={styles.statHeader}>
                      <Text style={[styles.statLabel, { color: colors.text }]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.statAmount, { color: colors.text }]}>
                        {item.amount.toLocaleString()} {currency}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.progressBarBg,
                        { backgroundColor: colors.border },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${item.percentage}%`,
                            backgroundColor: item.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* EKLEME / GÜNCELLEME FORMU */}
        <View
          style={[
            styles.cardContainer,
            isLight && styles.surfaceLift,
            {
              backgroundColor: editingItem ? "#fff7ed" : colors.card,
              borderColor: editingItem ? "#f97316" : "transparent",
              borderWidth: editingItem ? 1 : 0,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, marginBottom: 0 },
              ]}
            >
              {editingItem ? "Harcamayı Düzenle" : "Harcama Ekle"}
            </Text>
            {editingItem && (
              <TouchableOpacity onPress={handleCancelEdit}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <ModernInput
            label={`Tutar (${currency})`}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0.00"
          />
          <ModernInput
            label="Açıklama"
            value={description}
            onChangeText={setDescription}
            placeholder="Örn: Market alışverişi"
          />
          <SelectionGroup
            label="KATEGORİ SEÇ"
            options={categories.map(c => ({ label: c.label, value: c.value }))}
            selectedValue={category}
            onSelect={setCategory}
          />
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: editingItem ? "#f97316" : colors.primary },
            ]}
            onPress={handleSaveOrUpdate}
          >
            {editingItem ? (
              <Check size={20} color="#fff" />
            ) : (
              <Plus size={20} color="#fff" />
            )}
            <Text style={styles.saveBtnText}>
              {editingItem ? "Değişiklikleri Kaydet" : "Kaydet"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* LİSTE */}
        <View style={styles.transactionsHeader}>
          <Text
            style={[styles.listTitle, { color: colors.text, marginBottom: 0 }]}
          >
            Son İşlemler
          </Text>
        </View>

        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {tabs.map(tab => {
              const isActive = activeTab === tab.value;
              return (
                <TouchableOpacity
                  key={tab.value}
                  style={[
                    styles.tabButton,
                    isLight && styles.surfaceLift,
                    {
                      backgroundColor: isActive ? colors.primary : colors.card,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setActiveTab(tab.value)}
                >
                  {tab.icon && (
                    <tab.icon
                      size={14}
                      color={isActive ? "#fff" : colors.textMuted}
                      style={{ marginRight: 6 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.tabText,
                      { color: isActive ? "#fff" : colors.text },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {filteredExpenses.length === 0 ? (
          <Text
            style={{
              textAlign: "center",
              color: colors.textMuted,
              marginTop: 20,
            }}
          >
            Harcama bulunamadı.
          </Text>
        ) : (
          filteredExpenses.map(item => {
            const cat =
              categories.find(c => c.value === item.category) || categories[5];
            return (
              <View
                key={item.id}
                style={[
                  styles.expenseItem,
                  isLight && styles.surfaceLift,
                  { backgroundColor: colors.card },
                ]}
              >
                {/* SOL KISIM: İkon ve Bilgiler */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: cat.color + "15" },
                    ]}
                  >
                    <cat.icon size={22} color={cat.color} />
                  </View>
                  <View style={styles.expenseDetails}>
                    <Text style={[styles.expName, { color: colors.text }]}>
                      {item.description || item.category}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text
                        style={[styles.expUser, { color: colors.textMuted }]}
                      >
                        {item.profiles?.full_name}
                      </Text>
                      <Text
                        style={[styles.expUser, { color: colors.textMuted }]}
                      >
                        •
                      </Text>
                      <Text
                        style={[styles.expUser, { color: colors.textMuted }]}
                      >
                        {new Date(item.created_at).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* SAĞ KISIM: Butonlar Üstte, Tutar Altta */}
                <View
                  style={{ alignItems: "flex-end", justifyContent: "center" }}
                >
                  {/* BUTON GRUBU (Tutarın Üstünde) */}
                  {isParent && (
                    <View
                      style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}
                    >
                      <TouchableOpacity
                        onPress={() => handleEditPress(item)}
                        style={[
                          styles.actionBtn,
                          { backgroundColor: "#eff6ff" },
                        ]} // Mavi ton
                      >
                        <Edit2 size={16} color="#3b82f6" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDeleteExpense(item)}
                        style={[
                          styles.actionBtn,
                          { backgroundColor: "#fee2e2" },
                        ]} // Kırmızı ton
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={[styles.expAmount, { color: colors.text }]}>
                    -{Number(item.amount).toLocaleString()} {currency}
                  </Text>
                </View>
              </View>
            );
          })
        )}
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
  headerRight: {
    position: "absolute",
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingsBtn: { padding: 10 },
  summaryCard: {
    marginHorizontal: 8,
    padding: 22,
    borderRadius: 28,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  summaryLabel: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  amountRow: { flexDirection: "row", alignItems: "baseline" },
  spentAmount: { fontSize: 26, fontWeight: "900" },
  totalAmount: { fontSize: 16, fontWeight: "600" },
  percentBadge: { padding: 8, borderRadius: 12 },
  cardContainer: {
    marginHorizontal: 8,
    padding: 20,
    borderRadius: 28,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 15 },
  statsList: { gap: 16 },
  statRow: { flexDirection: "row", alignItems: "center" },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statContent: { flex: 1 },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  statLabel: { fontSize: 14, fontWeight: "600" },
  statAmount: { fontSize: 14, fontWeight: "700" },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    width: "100%",
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 4 },
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
  transactionsHeader: { paddingHorizontal: 18, marginBottom: 10 },
  listTitle: { fontSize: 20, fontWeight: "800" },
  tabsContainer: { marginBottom: 15 },
  tabsScroll: { paddingHorizontal: 16, gap: 10 },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: { fontWeight: "700", fontSize: 13 },
  expenseItem: {
    marginHorizontal: 8,
    padding: 16,
    borderRadius: 24,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

  // YENİ BUTON STİLLERİ
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  surfaceLift: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});
