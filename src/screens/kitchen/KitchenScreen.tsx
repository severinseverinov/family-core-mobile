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
  Modal,
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
  Edit2,
  Trash2,
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import {
  getInventoryAndBudget,
  addShoppingItem,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  toggleShoppingItem,
  analyzeReceiptMobile,
} from "../../services/kitchen";
import HeartbeatLoader from "../../components/ui/HeartbeatLoader";
import ModernInput from "../../components/ui/ModernInput";

export default function KitchenScreen({ navigation }: any) {
  const { colors, themeMode } = useTheme();
  const isLight = themeMode === "light";
  const [activeTab, setActiveTab] = useState<"inventory" | "shopping" | "meal">(
    "inventory"
  );
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [mealLoading, setMealLoading] = useState(false);
  const [mealSuggestions, setMealSuggestions] = useState<string[]>([]);
  const [shoppingModalVisible, setShoppingModalVisible] = useState(false);
  const [shoppingName, setShoppingName] = useState("");
  const [shoppingQty, setShoppingQty] = useState("1");
  const [shoppingUnit, setShoppingUnit] = useState("adet");
  const [shoppingMarket, setShoppingMarket] = useState("");
  const [shoppingUrgent, setShoppingUrgent] = useState(false);
  const [shoppingSaving, setShoppingSaving] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState("");
  const [inventoryCategory, setInventoryCategory] = useState("Tümü");
  const [shoppingFilter, setShoppingFilter] = useState("");
  const [shoppingStatus, setShoppingStatus] = useState<
    "all" | "active" | "done"
  >("all");
  const [shoppingUrgentOnly, setShoppingUrgentOnly] = useState(false);
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [inventoryEditId, setInventoryEditId] = useState<string | null>(null);
  const [inventoryName, setInventoryName] = useState("");
  const [inventoryQty, setInventoryQty] = useState("1");
  const [inventoryUnit, setInventoryUnit] = useState("adet");
  const [inventoryPrice, setInventoryPrice] = useState("0");
  const [inventorySaving, setInventorySaving] = useState(false);

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

  const handleAddShoppingItem = () => {
    setShoppingModalVisible(true);
  };

  const handleAddInventoryItem = () => {
    setInventoryEditId(null);
    setInventoryName("");
    setInventoryQty("1");
    setInventoryUnit("adet");
    setInventoryPrice("0");
    setInventoryModalVisible(true);
  };

  const handleEditInventoryItem = (item: any) => {
    setInventoryEditId(item.id);
    setInventoryName(item.product_name || "");
    setInventoryQty(String(item.quantity ?? 1));
    setInventoryUnit(item.unit || "adet");
    setInventoryPrice(String(item.last_price ?? 0));
    setInventoryModalVisible(true);
  };

  const handleDeleteInventoryItem = (item: any) => {
    Alert.alert("Ürünü sil", `"${item.product_name}" ürünü silinsin mi?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          const result = await deleteInventoryItem(item.id);
          if (result?.success) {
            loadData();
          } else {
            Alert.alert("Hata", result?.error || "Ürün silinemedi.");
          }
        },
      },
    ]);
  };

  const submitShoppingItem = async () => {
    if (!shoppingName.trim()) {
      Alert.alert("Hata", "Ürün adı gerekli.");
      return;
    }
    setShoppingSaving(true);
    const quantity = Number(shoppingQty) > 0 ? Number(shoppingQty) : 1;
    const unit = shoppingUnit.trim() || "adet";
    const result = await addShoppingItem(
      shoppingName.trim(),
      quantity,
      unit,
      shoppingMarket.trim(),
      shoppingUrgent
    );
    setShoppingSaving(false);
    if (result?.success) {
      setShoppingModalVisible(false);
      setShoppingName("");
      setShoppingQty("1");
      setShoppingUnit("adet");
      setShoppingMarket("");
      setShoppingUrgent(false);
      loadData();
    } else {
      Alert.alert("Hata", result?.error || "Ürün eklenemedi.");
    }
  };

  const formatShoppingMeta = (item: any) => {
    const parts: string[] = [];
    if (item?.quantity) {
      parts.push(`${item.quantity} ${item.unit || "adet"}`);
    }
    if (item?.market) {
      parts.push(item.market);
    }
    return parts.join(" • ");
  };

  const submitInventoryItem = async () => {
    if (!inventoryName.trim()) {
      Alert.alert("Hata", "Ürün adı gerekli.");
      return;
    }
    setInventorySaving(true);
    const quantity = Number(inventoryQty) > 0 ? Number(inventoryQty) : 1;
    const unit = inventoryUnit.trim() || "adet";
    const price = Number(inventoryPrice) >= 0 ? Number(inventoryPrice) : 0;
    const payload = {
      product_name: inventoryName.trim(),
      quantity: String(quantity),
      unit,
      price: String(price),
    };
    const result = inventoryEditId
      ? await updateInventoryItem(inventoryEditId, payload)
      : await addInventoryItem(payload);
    setInventorySaving(false);
    if (result?.success) {
      setInventoryModalVisible(false);
      setInventoryEditId(null);
      setInventoryName("");
      setInventoryQty("1");
      setInventoryUnit("adet");
      setInventoryPrice("0");
      loadData();
    } else {
      Alert.alert("Hata", result?.error || "Ürün eklenemedi.");
    }
  };

  const buildMealSuggestions = () => {
    const names = (data?.items || [])
      .map((item: any) => String(item.product_name || "").toLowerCase())
      .filter((name: string) => name.length > 0);
    if (names.length === 0) {
      return ["Stok boş. Öneri için önce ürün ekleyin."];
    }

    const suggestions: string[] = [];
    const has = (keyword: string) =>
      names.some((name: string) => name.includes(keyword));

    if (has("tavuk")) suggestions.push("Tavuk sote + pilav");
    if (has("makarna")) suggestions.push("Kremalı sebzeli makarna");
    if (has("patates")) suggestions.push("Fırında patates + yoğurt");
    if (has("yumurta")) suggestions.push("Menemen veya omlet");
    if (has("pirinç")) suggestions.push("Sebzeli pilav");
    if (has("kıyma") || has("et")) suggestions.push("Kıymalı sebze yemeği");

    if (suggestions.length === 0) {
      const base = names.slice(0, 3).join(", ");
      suggestions.push(`${base} ile pratik sote`);
      suggestions.push(`${base} ile hafif salata`);
    }

    return suggestions.slice(0, 5);
  };

  const handleMealSuggest = () => {
    setMealLoading(true);
    const suggestions = buildMealSuggestions();
    setMealSuggestions(suggestions);
    setMealLoading(false);
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
          Stok • Liste • Yemek Önerileri
        </Text>
      </View>

      {/* TABLAR */}
      <View
        style={[
          styles.tabContainer,
          isLight && styles.surfaceLift,
          { backgroundColor: colors.card },
        ]}
      >
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
        <TouchableOpacity
          onPress={() => setActiveTab("meal")}
          style={[
            styles.tabButton,
            activeTab === "meal" && { backgroundColor: colors.background },
          ]}
        >
          <Sparkles
            size={18}
            color={activeTab === "meal" ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              {
                color: activeTab === "meal" ? colors.text : colors.textMuted,
              },
            ]}
          >
            Yemek
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "inventory" ? (
          <>
            <ModernInput
              label="Stokta ara"
              value={inventoryFilter}
              onChangeText={setInventoryFilter}
              placeholder="Ürün adı veya kategori"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {(
                [
                  "Tümü",
                  ...Array.from(
                    new Set(
                      (data?.items || [])
                        .map((item: any) => item.category)
                        .filter((value: any) => !!value)
                    )
                  ),
                ] as string[]
              ).map(category => {
                const isActive = inventoryCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterChip,
                      isActive && styles.filterChipActive,
                      {
                        backgroundColor: isActive
                          ? colors.primary
                          : colors.card,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setInventoryCategory(category)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isActive ? "#fff" : colors.text },
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {data?.items
              .filter((item: any) => {
                const query = inventoryFilter.trim().toLowerCase();
                if (!query) return true;
                const name = String(item.product_name || "").toLowerCase();
                const category = String(item.category || "").toLowerCase();
                return name.includes(query) || category.includes(query);
              })
              .filter((item: any) => {
                if (inventoryCategory === "Tümü") return true;
                return item.category === inventoryCategory;
              })
              .map((item: any) => (
                <View
                  key={item.id}
                  style={[
                    styles.itemCard,
                    isLight && styles.surfaceLift,
                    { backgroundColor: colors.card },
                  ]}
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
                  <View style={styles.itemRight}>
                    <Text style={[styles.qtyText, { color: colors.primary }]}>
                      {item.quantity} {item.unit}
                    </Text>
                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={[
                          styles.iconButton,
                          { borderColor: colors.border },
                        ]}
                        onPress={() => handleEditInventoryItem(item)}
                      >
                        <Edit2 size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.iconButton,
                          { borderColor: colors.border },
                        ]}
                        onPress={() => handleDeleteInventoryItem(item)}
                      >
                        <Trash2 size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
          </>
        ) : activeTab === "shopping" ? (
          <>
            <ModernInput
              label="Listede ara"
              value={shoppingFilter}
              onChangeText={setShoppingFilter}
              placeholder="Ürün adı veya market"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {[
                { id: "all", label: "Tümü" },
                { id: "active", label: "Aktif" },
                { id: "done", label: "Tamamlanan" },
              ].map(option => {
                const isActive = shoppingStatus === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.filterChip,
                      isActive && styles.filterChipActive,
                      {
                        backgroundColor: isActive
                          ? colors.primary
                          : colors.card,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() =>
                      setShoppingStatus(option.id as "all" | "active" | "done")
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isActive ? "#fff" : colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  shoppingUrgentOnly && styles.filterChipActive,
                  {
                    backgroundColor: shoppingUrgentOnly
                      ? colors.error
                      : colors.card,
                    borderColor: shoppingUrgentOnly
                      ? colors.error
                      : colors.border,
                  },
                ]}
                onPress={() => setShoppingUrgentOnly(prev => !prev)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: shoppingUrgentOnly ? "#fff" : colors.text },
                  ]}
                >
                  Acil
                </Text>
              </TouchableOpacity>
            </ScrollView>
            {data?.shoppingList
              .filter((item: any) => {
                const query = shoppingFilter.trim().toLowerCase();
                if (!query) return true;
                const name = String(item.product_name || "").toLowerCase();
                const market = String(item.market || "").toLowerCase();
                return name.includes(query) || market.includes(query);
              })
              .filter((item: any) => {
                if (shoppingStatus === "all") return true;
                if (shoppingStatus === "active") return !item.is_completed;
                return item.is_completed;
              })
              .filter((item: any) =>
                shoppingUrgentOnly ? !!item.is_urgent : true
              )
              .map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemCard,
                    isLight && styles.surfaceLift,
                    {
                      backgroundColor: colors.card,
                      opacity: item.is_completed ? 0.6 : 1,
                    },
                  ]}
                  onPress={() =>
                    toggleShoppingItem(item.id, !item.is_completed)
                  }
                >
                  {item.is_completed ? (
                    <CheckCircle2 size={22} color={colors.primary} />
                  ) : (
                    <Circle size={22} color={colors.border} />
                  )}
                  <View style={[styles.itemInfo, { marginLeft: 12 }]}>
                    <Text
                      style={[
                        styles.itemName,
                        {
                          color: colors.text,
                          textDecorationLine: item.is_completed
                            ? "line-through"
                            : "none",
                        },
                      ]}
                    >
                      {item.product_name}
                    </Text>
                    <Text
                      style={[styles.itemDetail, { color: colors.textMuted }]}
                    >
                      {formatShoppingMeta(item)}
                    </Text>
                  </View>
                  {item.is_urgent ? (
                    <View
                      style={[
                        styles.urgentBadge,
                        { backgroundColor: colors.error + "20" },
                      ]}
                    >
                      <Text
                        style={[styles.urgentText, { color: colors.error }]}
                      >
                        Acil
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
          </>
        ) : (
          <>
            <View
              style={[
                styles.mealCard,
                isLight && styles.surfaceLift,
                { backgroundColor: colors.card },
              ]}
            >
              <Sparkles size={20} color={colors.primary} />
              <Text style={[styles.mealTitle, { color: colors.text }]}>
                Akşam yemeği önerileri
              </Text>
              <Text style={[styles.mealBody, { color: colors.textMuted }]}>
                Stoktaki ürünlere göre öneriler hazırlanır.
              </Text>
            </View>

            {mealSuggestions.length === 0 ? (
              <Text style={[styles.mealHint, { color: colors.textMuted }]}>
                Öneri için alttaki yapay zeka butonuna basın.
              </Text>
            ) : (
              <View style={styles.mealList}>
                {mealSuggestions.map((item, index) => (
                  <View
                    key={`${item}-${index}`}
                    style={[
                      styles.mealSuggestion,
                      isLight && styles.surfaceLift,
                      { backgroundColor: colors.card },
                    ]}
                  >
                    <Text
                      style={[
                        styles.mealSuggestionText,
                        { color: colors.text },
                      ]}
                    >
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
        <View style={{ height: 150 }} />
      </ScrollView>

      {/* GÜNCELLENEN BUTONLAR (FAB) */}
      {activeTab === "inventory" && (
        <View style={[styles.fabWrapper, styles.fabInventoryOffset]}>
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
            onPress={handleAddInventoryItem}
          >
            <Plus size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {activeTab === "shopping" && (
        <View style={styles.fabWrapper}>
          <TouchableOpacity
            style={[
              styles.fabBase,
              {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={handleAddShoppingItem}
          >
            <ShoppingBasket size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {activeTab === "meal" && (
        <View style={styles.fabWrapper}>
          <TouchableOpacity
            style={[
              styles.fabBase,
              {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={handleMealSuggest}
            disabled={mealLoading}
          >
            {mealLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Sparkles size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={shoppingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShoppingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              isLight && styles.surfaceLift,
              { backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Alışveriş listesine ekle
            </Text>
            <ModernInput
              label="Ürün adı"
              value={shoppingName}
              onChangeText={setShoppingName}
              placeholder="Örn: Domates"
            />
            <ModernInput
              label="Market"
              value={shoppingMarket}
              onChangeText={setShoppingMarket}
              placeholder="Örn: Migros"
            />
            <View style={styles.modalRow}>
              <View style={{ flex: 1 }}>
                <ModernInput
                  label="Miktar"
                  value={shoppingQty}
                  onChangeText={setShoppingQty}
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <ModernInput
                  label="Birim"
                  value={shoppingUnit}
                  onChangeText={setShoppingUnit}
                  placeholder="adet / kg"
                />
              </View>
            </View>
            <View style={styles.urgentRow}>
              <Text style={[styles.urgentLabel, { color: colors.text }]}>
                Acil ihtiyaç
              </Text>
              <TouchableOpacity
                style={[
                  styles.urgentToggle,
                  {
                    backgroundColor: shoppingUrgent
                      ? colors.error
                      : colors.card,
                    borderColor: shoppingUrgent ? colors.error : colors.border,
                  },
                ]}
                onPress={() => setShoppingUrgent(prev => !prev)}
              >
                <Text
                  style={[
                    styles.urgentToggleText,
                    { color: shoppingUrgent ? "#fff" : colors.text },
                  ]}
                >
                  {shoppingUrgent ? "Acil" : "Normal"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: colors.border }]}
                onPress={() => setShoppingModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Vazgeç
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  { backgroundColor: colors.primary },
                ]}
                onPress={submitShoppingItem}
                disabled={shoppingSaving}
              >
                {shoppingSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Ekle</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={inventoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInventoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              isLight && styles.surfaceLift,
              { backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {inventoryEditId ? "Ürünü düzenle" : "Stoğa ürün ekle"}
            </Text>
            <ModernInput
              label="Ürün adı"
              value={inventoryName}
              onChangeText={setInventoryName}
              placeholder="Örn: Domates"
            />
            <View style={styles.modalRow}>
              <View style={{ flex: 1 }}>
                <ModernInput
                  label="Miktar"
                  value={inventoryQty}
                  onChangeText={setInventoryQty}
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <ModernInput
                  label="Birim"
                  value={inventoryUnit}
                  onChangeText={setInventoryUnit}
                  placeholder="adet"
                />
              </View>
            </View>
            <ModernInput
              label="Fiyat"
              value={inventoryPrice}
              onChangeText={setInventoryPrice}
              placeholder="0"
              keyboardType="numeric"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: colors.border }]}
                onPress={() => setInventoryModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Vazgeç
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  { backgroundColor: colors.primary },
                ]}
                onPress={submitInventoryItem}
                disabled={inventorySaving}
              >
                {inventorySaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Ekle</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 18, paddingTop: 10, marginBottom: 15 },
  headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: 0.2 },
  headerSubtitle: { marginTop: 4, fontSize: 12, fontWeight: "600" },
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
  itemRight: { alignItems: "flex-end", gap: 6 },
  itemActions: { flexDirection: "row", gap: 8 },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  urgentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 10,
  },
  urgentText: { fontSize: 12, fontWeight: "700" },
  mealCard: {
    padding: 16,
    borderRadius: 24,
    gap: 8,
    alignItems: "flex-start",
  },
  mealTitle: { fontSize: 16, fontWeight: "800" },
  mealBody: { fontSize: 13, lineHeight: 18 },
  mealHint: { marginTop: 12, marginHorizontal: 10, fontSize: 13 },
  mealList: { marginTop: 12, gap: 10 },
  mealSuggestion: {
    padding: 14,
    borderRadius: 18,
  },
  mealSuggestionText: { fontSize: 14, fontWeight: "600" },

  // YENİ BUTON KONUMLANDIRMASI
  fabWrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 85 : 75, // Alt menüye (70px) çok daha yakın
    right: 20,
    flexDirection: "column",
    gap: 12,
  },
  fabInventoryOffset: {
    bottom: Platform.OS === "ios" ? 70 : 60,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 10 },
  modalRow: { flexDirection: "row", gap: 12 },
  filterRow: { paddingHorizontal: 8, gap: 10, paddingBottom: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipActive: {},
  filterChipText: { fontWeight: "700", fontSize: 12 },
  urgentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 8,
  },
  urgentLabel: { fontSize: 13, fontWeight: "700" },
  urgentToggle: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  urgentToggleText: { fontWeight: "700", fontSize: 12 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonPrimary: {
    borderWidth: 0,
  },
  modalButtonText: { fontWeight: "700" },
  modalButtonTextPrimary: { color: "#fff", fontWeight: "700" },
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
