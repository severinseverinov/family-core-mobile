import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  Wallet,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react-native";
import { BarChart } from "react-native-chart-kit";
import { useTheme } from "../../contexts/ThemeContext";
import { ModernCard } from "../../components/ui/ModernCard";
import {
  getAnnualStats,
  getSpendingByUser,
  getMonthlyConfigs,
  updateChildAllowance,
  transferToPiggyBank,
} from "../../services/finance";
import { getFamilyMembers } from "../../services/family";
import { supabase } from "../../services/supabase"; // Profil verisi için eklendi
import HeartbeatLoader from "../../components/ui/HeartbeatLoader";

const screenWidth = Dimensions.get("window").width;

export default function FamilyFinanceScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);

  // Tarih ve Yıl Yönetimi
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  ); // "2026-01"

  // Veri State'leri
  const [annualData, setAnnualData] = useState<any>(null);
  const [userSpending, setUserSpending] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);

  // Para Birimi State'i (Varsayılan TL)
  const [currency, setCurrency] = useState("TL");

  useEffect(() => {
    loadAllData();
  }, [selectedMonth, selectedYear]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Kullanıcının Para Birimi Tercihini Çek
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("preferred_currency")
          .eq("id", user.id)
          .single();
        if (profile?.preferred_currency) {
          setCurrency(profile.preferred_currency);
        }
      }

      // 2. Yıllık İstatistikleri Çek
      const annualRes = await getAnnualStats(selectedYear);
      setAnnualData(annualRes.data);

      // 3. Bu Ayın Kişi Bazlı Harcamalarını Çek
      const spendingRes = await getSpendingByUser(selectedMonth);
      setUserSpending(spendingRes as any[]);

      // 4. Çocukları ve Harçlık Durumlarını Çek
      const membersRes = await getFamilyMembers();
      if (membersRes.members) {
        // Rolü 'member' veya 'child' olanları filtrele (Uygulama mantığınıza göre düzenleyin)
        const kids = membersRes.members.filter(
          (m: any) => m.role === "member" || m.role === "child"
        );
        setChildren(kids);
      }
    } catch (error) {
      console.error("Finans verileri yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeYear = (dir: number) => setSelectedYear(prev => prev + dir);

  const handleTransferToPiggy = (child: any) => {
    Alert.prompt(
      "Kumbaraya Aktar",
      `${child.full_name} için kumbaraya ne kadar aktarılacak?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Aktar",
          onPress: async (val?: string) => {
            if (val && !isNaN(Number(val))) {
              await transferToPiggyBank(child.id, Number(val));
              loadAllData(); // Yenile
              Alert.alert("Başarılı", "Tutar kumbaraya eklendi.");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const handleSetAllowance = (child: any) => {
    Alert.prompt(
      "Aylık Limit Belirle",
      `${child.full_name} için yeni aylık harçlık limiti:`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Kaydet",
          onPress: async (val?: string) => {
            if (val && !isNaN(Number(val))) {
              await updateChildAllowance(child.id, Number(val));
              loadAllData();
              Alert.alert("Başarılı", "Limit güncellendi.");
            }
          },
        },
      ],
      "plain-text",
      String(child.monthly_allowance || 0)
    );
  };

  if (loading)
    return (
      <View style={styles.center}>
        <HeartbeatLoader size={60} />
      </View>
    );

  // Grafik Verisi
  const chartData = {
    labels: ["Oca", "Şub", "Mar", "Nis", "May", "Haz"], // İlk 6 ay
    datasets: [
      {
        data: annualData
          ? annualData.slice(0, 6).map((d: any) => d.income)
          : [0],
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Yeşil (Gelir)
        strokeWidth: 2,
      },
      {
        data: annualData
          ? annualData.slice(0, 6).map((d: any) => d.expense)
          : [0],
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // Kırmızı (Gider)
        strokeWidth: 2,
      },
    ],
    legend: ["Gelir", "Gider"],
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* BAŞLIK */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { borderColor: colors.border }]}
          >
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View>
          <Text style={[styles.title, { color: colors.text }]}>
            Aile Finans Merkezi
          </Text>
          <Text style={{ color: colors.textMuted }}>
            {selectedYear} Genel Bakış
          </Text>
          </View>
        </View>

        {/* ÖZET KARTLAR (GRID) */}
        <View style={styles.grid}>
          <ModernCard
            style={StyleSheet.flatten([
              styles.summaryCard,
              { backgroundColor: colors.card },
            ])}
          >
            <View style={[styles.iconBox, { backgroundColor: "#dcfce7" }]}>
              <TrendingUp color="#10b981" size={24} />
            </View>
            <Text style={[styles.cardLabel, { color: colors.textMuted }]}>
              Yıllık Gelir
            </Text>
            {/* Dinamik Para Birimi */}
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {annualData
                ?.reduce((a: any, b: any) => a + b.income, 0)
                .toLocaleString()}{" "}
              {currency}
            </Text>
          </ModernCard>

          <ModernCard
            style={StyleSheet.flatten([
              styles.summaryCard,
              { backgroundColor: colors.card },
            ])}
          >
            <View style={[styles.iconBox, { backgroundColor: "#fee2e2" }]}>
              <TrendingDown color="#ef4444" size={24} />
            </View>
            <Text style={[styles.cardLabel, { color: colors.textMuted }]}>
              Yıllık Gider
            </Text>
            {/* Dinamik Para Birimi */}
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {annualData
                ?.reduce((a: any, b: any) => a + b.expense, 0)
                .toLocaleString()}{" "}
              {currency}
            </Text>
          </ModernCard>
        </View>

        {/* GRAFİK (BAR CHART) */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Gelir & Gider Analizi
            </Text>
            <View style={styles.yearSelector}>
              <TouchableOpacity onPress={() => handleChangeYear(-1)}>
                <ChevronLeft size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={{ color: colors.text, fontWeight: "bold" }}>
                {selectedYear}
              </Text>
              <TouchableOpacity onPress={() => handleChangeYear(1)}>
                <ChevronRight size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              data={chartData}
              width={screenWidth + 50}
              height={220}
              yAxisLabel={currency === "TL" ? "₺" : currency + " "} // Grafik etiketi için kısa kontrol
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: colors.card,
                backgroundGradientFrom: colors.card,
                backgroundGradientTo: colors.card,
                decimalPlaces: 0,
                color: (opacity = 1) => colors.primary,
                labelColor: (opacity = 1) => colors.textMuted,
                style: { borderRadius: 16 },
                barPercentage: 0.6,
              }}
              style={{ borderRadius: 16 }}
            />
          </ScrollView>
        </View>

        {/* ÇOCUKLAR: HARÇLIK & KUMBARA */}
        <Text style={[styles.bigTitle, { color: colors.text }]}>
          Çocuklar & Kumbaralar
        </Text>
        {children.map(child => (
          <ModernCard
            key={child.id}
            style={StyleSheet.flatten([
              styles.childCard,
              { backgroundColor: colors.card },
            ])}
          >
            <View style={styles.childHeader}>
              <Image
                source={{
                  uri: child.avatar_url || "https://via.placeholder.com/50",
                }}
                style={styles.avatar}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.childName, { color: colors.text }]}>
                  {child.full_name}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Aylık Limit:{" "}
                  <Text style={{ fontWeight: "bold", color: colors.primary }}>
                    {child.monthly_allowance || 0} {currency}
                  </Text>
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleSetAllowance(child)}
                style={styles.editBtn}
              >
                <RefreshCw size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.piggyRow}>
              <View style={styles.piggyInfo}>
                <Wallet color="#ec4899" size={28} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    Kumbara Bakiyesi
                  </Text>
                  {/* Dinamik Para Birimi */}
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 20,
                      fontWeight: "bold",
                    }}
                  >
                    {child.piggy_bank?.toLocaleString() || 0} {currency}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.transferBtn,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => handleTransferToPiggy(child)}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}
                >
                  Ekle
                </Text>
              </TouchableOpacity>
            </View>
          </ModernCard>
        ))}

        {/* KİM NE KADAR HARCADI? */}
        <Text style={[styles.bigTitle, { color: colors.text }]}>
          Bu Ay Kim Ne Harcadı?
        </Text>
        {userSpending.map((user, index) => (
          <View
            key={index}
            style={[styles.spendingRow, { backgroundColor: colors.card }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={[styles.rank, { color: colors.primary }]}>
                #{index + 1}
              </Text>
              <Image
                source={{
                  uri: user.avatar || "https://via.placeholder.com/40",
                }}
                style={styles.smallAvatar}
              />
              <Text style={[styles.userName, { color: colors.text }]}>
                {user.name}
              </Text>
            </View>
            {/* Dinamik Para Birimi */}
            <Text style={[styles.userAmount, { color: colors.text }]}>
              {user.amount.toLocaleString()} {currency}
            </Text>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 28, fontWeight: "800" },

  grid: { flexDirection: "row", gap: 15, marginBottom: 20 },
  summaryCard: { flex: 1, padding: 15, alignItems: "flex-start" },
  iconBox: { padding: 10, borderRadius: 12, marginBottom: 10 },
  cardLabel: { fontSize: 12, fontWeight: "600" },
  cardValue: { fontSize: 18, fontWeight: "800", marginTop: 4 },

  section: { padding: 15, borderRadius: 24, marginBottom: 25 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  yearSelector: { flexDirection: "row", alignItems: "center", gap: 10 },

  bigTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 15,
    marginTop: 10,
  },

  // ÇOCUK KARTI STİLLERİ
  childCard: { padding: 16, marginBottom: 15 },
  childHeader: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  childName: { fontSize: 16, fontWeight: "700" },
  editBtn: { padding: 8 },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 12 },
  piggyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  piggyInfo: { flexDirection: "row", alignItems: "center" },
  transferBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },

  // HARCAMA LİSTESİ STİLLERİ
  spendingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
  },
  rank: { fontSize: 16, fontWeight: "900", width: 30 },
  smallAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  userName: { fontSize: 15, fontWeight: "600" },
  userAmount: { fontSize: 16, fontWeight: "700" },
});
