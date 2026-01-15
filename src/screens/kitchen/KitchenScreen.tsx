import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  ShoppingBasket,
  Package,
  Plus,
  Sparkles,
  CheckCircle2,
  Circle,
  ChevronRight,
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import {
  getInventoryAndBudget,
  toggleShoppingItem,
  analyzeReceiptMobile,
} from "../../services/kitchen";
import HeartbeatLoader from "../../components/ui/HeartbeatLoader";

export default function KitchenScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<"inventory" | "shopping">(
    "inventory"
  );
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const res = await getInventoryAndBudget();
    setData(res);
    setLoading(false);
  };

  const handleScanReceipt = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert("Hata", "Kamera izni gerekli.");

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setAiLoading(true);
      try {
        const aiResult = await analyzeReceiptMobile(result.assets[0].base64);
        setAiLoading(false);
        navigation.navigate("ReceiptConfirm", { data: aiResult });
      } catch (error) {
        setAiLoading(false);
        Alert.alert("Hata", "Fiş analiz edilemedi.");
      }
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <HeartbeatLoader size={50} />
        <Text
          style={{
            textAlign: "center",
            color: colors.textMuted,
            marginTop: 10,
          }}
        >
          Mutfak Hazırlanıyor...
        </Text>
      </View>
    );
  }
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      {/* BAŞLIK BÖLÜMÜ */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Mutfak & Market
        </Text>
      </View>

      {/* BÜTÇE KARTI */}
      <View style={[styles.budgetCard, { backgroundColor: colors.card }]}>
        <View style={styles.budgetRow}>
          <Text style={[styles.budgetText, { color: colors.text }]}>
            Harcama Durumu
          </Text>
          <Text style={[styles.budgetAmount, { color: colors.primary }]}>
            {data?.spent} / {data?.budget} {data?.currency}
          </Text>
        </View>
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              {
                backgroundColor: colors.primary,
                width: `${Math.min((data?.spent / data?.budget) * 100, 100)}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* TABLAR */}
      <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => setActiveTab("inventory")}
          style={[
            styles.tabButton,
            activeTab === "inventory" && { backgroundColor: colors.background },
          ]}
        >
          <Package
            size={18}
            color={
              activeTab === "inventory" ? colors.primary : colors.textMuted
            }
          />
          <Text
            style={[
              styles.tabLabel,
              {
                color:
                  activeTab === "inventory" ? colors.text : colors.textMuted,
              },
            ]}
          >
            Stok
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("shopping")}
          style={[
            styles.tabButton,
            activeTab === "shopping" && { backgroundColor: colors.background },
          ]}
        >
          <ShoppingBasket
            size={18}
            color={activeTab === "shopping" ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              {
                color:
                  activeTab === "shopping" ? colors.text : colors.textMuted,
              },
            ]}
          >
            Liste
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "inventory"
          ? data?.items.map((item: any) => (
              <View
                key={item.id}
                style={[styles.itemCard, { backgroundColor: colors.card }]}
              >
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.text }]}>
                    {item.product_name}
                  </Text>
                  <Text
                    style={[styles.itemDetail, { color: colors.textMuted }]}
                  >
                    {item.category}
                  </Text>
                </View>
                <Text style={[styles.qtyText, { color: colors.primary }]}>
                  {item.quantity} {item.unit}
                </Text>
              </View>
            ))
          : data?.shoppingList.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: colors.card,
                    opacity: item.is_completed ? 0.6 : 1,
                  },
                ]}
                onPress={() => toggleShoppingItem(item.id, !item.is_completed)}
              >
                {item.is_completed ? (
                  <CheckCircle2 size={22} color={colors.primary} />
                ) : (
                  <Circle size={22} color={colors.border} />
                )}
                <Text
                  style={[
                    styles.itemName,
                    {
                      color: colors.text,
                      marginLeft: 12,
                      flex: 1,
                      textDecorationLine: item.is_completed
                        ? "line-through"
                        : "none",
                    },
                  ]}
                >
                  {item.product_name}
                </Text>
              </TouchableOpacity>
            ))}
        <View style={{ height: 150 }} />
      </ScrollView>

      {/* GÜNCELLENEN BUTONLAR (FAB) */}
      <View style={styles.fabWrapper}>
        <TouchableOpacity
          style={[
            styles.fabBase,
            {
              backgroundColor: colors.card,
              borderColor: colors.primary,
              borderWidth: 1.5,
            },
          ]}
          onPress={handleScanReceipt}
          disabled={aiLoading}
        >
          {aiLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Sparkles size={22} color={colors.primary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fabBase, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate("AddKitchenItem")}
        >
          <Plus size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 18, paddingTop: 10, marginBottom: 15 },
  headerTitle: { fontSize: 24, fontWeight: "900" },
  budgetCard: {
    marginHorizontal: 8, // 20'den 8'e düşürüldü
    padding: 18,
    borderRadius: 28, // 20'den 28'e çıkarıldı
    marginBottom: 15,
  },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  budgetText: { fontSize: 13, fontWeight: "700" },
  budgetAmount: { fontSize: 15, fontWeight: "800" },
  progressContainer: {
    height: 5,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: { height: "100%", borderRadius: 3 },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 8, // Genişletildi
    padding: 5,
    borderRadius: 15,
    marginBottom: 15,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabLabel: { fontSize: 13, fontWeight: "700" },
  listContent: { paddingHorizontal: 8 },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 24, // Kart yumuşaklığı artırıldı
    marginBottom: 10,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "700" },
  itemDetail: { fontSize: 12, marginTop: 2 },
  qtyText: { fontSize: 14, fontWeight: "800" },

  // YENİ BUTON KONUMLANDIRMASI
  fabWrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 85 : 75, // Alt menüye (70px) çok daha yakın
    right: 20,
    flexDirection: "column",
    gap: 12,
  },
  fabBase: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
