import React, { useState, useEffect, useCallback } from "react";
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
  KeyboardAvoidingView,
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
import { useAuth } from "../../contexts/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import {
  getInventoryAndBudget,
  addShoppingItem,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  toggleShoppingItem,
  analyzeReceiptMobile,
} from "../../services/kitchen";
import { getFamilyMembers } from "../../services/family";
import { getPreferences } from "../../services/settings";
import HeartbeatLoader from "../../components/ui/HeartbeatLoader";
import ModernInput from "../../components/ui/ModernInput";

export default function KitchenScreen({ navigation }: any) {
  const { colors, themeMode } = useTheme();
  const { profile, user } = useAuth();
  const isLight = themeMode === "light";
  const [activeTab, setActiveTab] = useState<"inventory" | "shopping" | "meal">(
    "inventory"
  );
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [mealLoading, setMealLoading] = useState(false);
  const [mealSuggestionGroups, setMealSuggestionGroups] = useState<
    { label: string; suggestions: string[] }[]
  >([]);
  const [shoppingModalVisible, setShoppingModalVisible] = useState(false);
  const [shoppingName, setShoppingName] = useState("");
  const [shoppingQty, setShoppingQty] = useState("1");
  const [shoppingUnit, setShoppingUnit] = useState("adet");
  const [shoppingMarket, setShoppingMarket] = useState("");
  const [shoppingUrgent, setShoppingUrgent] = useState(false);
  const [shoppingVisibility, setShoppingVisibility] = useState<
    "family" | "parents" | "member"
  >("family");
  const [shoppingAssignees, setShoppingAssignees] = useState<string[]>([]);
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
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const isParent = ["owner", "admin"].includes(profile?.role || "");
  const defaultMealSettings = {
    visibility: "family",
    memberIds: [] as string[],
    cuisine: "world",
    calories: "",
    avoid: "",
    memberPrefs: {} as Record<
      string,
      { cuisine: string; calories: string; avoid: string }
    >,
  };
  const [mealSettings, setMealSettings] = useState(defaultMealSettings);
  const [mealPreferences, setMealPreferences] = useState({
    cuisine: "world",
    calories: "",
    avoid: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadMealSettings = async () => {
    const prefs = await getPreferences();
    if (prefs?.meal_settings) {
      setMealSettings(prev => ({ ...prev, ...prefs.meal_settings }));
    }
    if (prefs?.meal_preferences) {
      setMealPreferences(prev => ({ ...prev, ...prefs.meal_preferences }));
    }
  };

  const loadData = async () => {
    const res = await getInventoryAndBudget();
    setData(res);
    const membersRes = await getFamilyMembers();
    setFamilyMembers(membersRes.members || []);
    await loadMealSettings();
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadMealSettings();
    }, [])
  );

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
    const isParent = ["owner", "admin"].includes(profile?.role || "");
    if (!isParent && user?.id) {
      setShoppingVisibility("member");
      setShoppingAssignees([user.id]);
    } else {
      setShoppingVisibility("family");
      setShoppingAssignees([]);
    }
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
    if (shoppingVisibility === "member" && shoppingAssignees.length === 0) {
      Alert.alert("Hata", "Kişiye özel için kişi seçin.");
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
      shoppingUrgent,
      shoppingVisibility,
      shoppingAssignees
    );
    setShoppingSaving(false);
    if (result?.success) {
      setShoppingModalVisible(false);
      setShoppingName("");
      setShoppingQty("1");
      setShoppingUnit("adet");
      setShoppingMarket("");
      setShoppingUrgent(false);
      setShoppingVisibility("family");
      setShoppingAssignees([]);
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
    if (item?.visibility === "parents") {
      parts.push("Ebeveynler");
    } else if (item?.visibility === "member") {
      const names =
        item.assigned_to
          ?.map((id: string) => {
            const member = familyMembers.find(m => m.id === id);
            return member?.full_name || member?.email;
          })
          .filter(Boolean) || [];
      if (names.length > 0) parts.push(names.join(", "));
    }
    return parts.join(" • ");
  };

  const canSeeShoppingItem = (item: any) => {
    const isParent = ["owner", "admin"].includes(profile?.role || "");
    if (isParent) return true;
    const visibility = item?.visibility || "family";
    if (visibility === "parents") return false;
    if (visibility === "member") {
      return item?.assigned_to?.includes(user?.id);
    }
    return true;
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

  const buildMealSuggestions = (prefs?: {
    cuisine?: string;
    calories?: string;
    avoid?: string;
  }) => {
    const names = (data?.items || [])
      .map((item: any) => String(item.product_name || "").toLowerCase())
      .filter((name: string) => name.length > 0);
    if (names.length === 0) {
      return ["Stok boş. Öneri için önce ürün ekleyin."];
    }

    const normalizedAvoid = (prefs?.avoid || "")
      .split(",")
      .map(v => v.trim().toLowerCase())
      .filter(Boolean);
    const cuisine = prefs?.cuisine || "world";
    const calorieTarget = Number(prefs?.calories || 0);

    const recipes = [
      {
        name: "Menemen",
        cuisine: "turkish",
        calories: 350,
        ingredients: ["yumurta", "domates", "biber", "soğan"],
      },
      {
        name: "Mercimek çorbası",
        cuisine: "turkish",
        calories: 300,
        ingredients: ["mercimek", "soğan", "havuç", "patates"],
      },
      {
        name: "Tavuk sote",
        cuisine: "world",
        calories: 520,
        ingredients: ["tavuk", "biber", "soğan"],
      },
      {
        name: "Sebzeli pilav",
        cuisine: "world",
        calories: 480,
        ingredients: ["pirinç", "havuç", "bezelye", "soğan"],
      },
      {
        name: "Kremalı sebzeli makarna",
        cuisine: "italian",
        calories: 650,
        ingredients: ["makarna", "krema", "mantar", "ıspanak"],
      },
      {
        name: "Taco bowl",
        cuisine: "mexican",
        calories: 560,
        ingredients: ["kıyma", "fasulye", "domates", "mısır"],
      },
      {
        name: "Sebzeli noodle",
        cuisine: "asian",
        calories: 540,
        ingredients: ["noodle", "soya", "havuç", "biber"],
      },
      {
        name: "Fırında patates + yoğurt",
        cuisine: "world",
        calories: 400,
        ingredients: ["patates", "yoğurt", "sarımsak"],
      },
    ];

    const filtered = recipes
      .filter(recipe =>
        cuisine === "world" ? true : recipe.cuisine === cuisine
      )
      .filter(recipe =>
        calorieTarget > 0 ? recipe.calories <= calorieTarget : true
      )
      .filter(recipe =>
        normalizedAvoid.length > 0
          ? !recipe.ingredients.some(ing =>
              normalizedAvoid.some(a => ing.includes(a))
            )
          : true
      )
      .map(recipe => {
        const missing = recipe.ingredients.filter(
          ing => !names.some(name => name.includes(ing))
        );
        return { ...recipe, missing };
      })
      .filter(recipe => recipe.missing.length <= 4)
      .sort((a, b) => a.missing.length - b.missing.length)
      .slice(0, 5)
      .map(recipe => {
        if (recipe.missing.length === 0) return recipe.name;
        return `${recipe.name} (eksik: ${recipe.missing.join(", ")})`;
      });

    if (filtered.length === 0) {
      const base = names.slice(0, 3).join(", ");
      return [`${base} ile pratik sote`, `${base} ile hafif salata`];
    }

    return filtered;
  };

  const handleMealSuggest = async () => {
    setMealLoading(true);
    const prefs = await getPreferences();
    if (prefs?.meal_preferences) {
      setMealPreferences(prev => ({ ...prev, ...prefs.meal_preferences }));
    }
    if (prefs?.meal_settings) {
      setMealSettings(prev => ({ ...prev, ...prefs.meal_settings }));
    }

    if (!isParent) {
      const suggestions = buildMealSuggestions({
        cuisine: prefs?.meal_preferences?.cuisine || mealPreferences.cuisine,
        calories: prefs?.meal_preferences?.calories || mealPreferences.calories,
        avoid: prefs?.meal_preferences?.avoid || mealPreferences.avoid,
      });
      setMealSuggestionGroups([
        { label: "Benim önerilerim", suggestions },
      ]);
      setMealLoading(false);
      return;
    }

    const membersWithPrefs = familyMembers
      .map(member => ({
        member,
        prefs:
          member.meal_preferences || {
            cuisine: "world",
            calories: "",
            avoid: "",
          },
      }))
      .filter(item => item.prefs);

    const grouped: Record<
      string,
      { memberNames: string[]; prefs: any }
    > = {};
    membersWithPrefs.forEach(({ member, prefs }) => {
      const key = JSON.stringify({
        cuisine: prefs.cuisine || "world",
        calories: prefs.calories || "",
        avoid: (prefs.avoid || "").trim().toLowerCase(),
      });
      if (!grouped[key]) {
        grouped[key] = { memberNames: [], prefs };
      }
      grouped[key].memberNames.push(
        member.full_name || member.email || "Üye"
      );
    });

    const groups = Object.values(grouped)
      .filter(group => group.memberNames.length >= 2)
      .map(group => ({
        label: `Topluluk: ${group.memberNames.join(", ")}`,
        suggestions: buildMealSuggestions(group.prefs),
      }));

    setMealSuggestionGroups(groups);
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
              .filter((item: any) => canSeeShoppingItem(item))
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

            {mealSuggestionGroups.length === 0 ? (
              <Text style={[styles.mealHint, { color: colors.textMuted }]}>
                Öneri için alttaki yapay zeka butonuna basın.
              </Text>
            ) : (
              <View style={styles.mealList}>
                {mealSuggestionGroups.map(group => (
                  <View key={group.label}>
                    <Text style={[styles.mealGroupTitle, { color: colors.text }]}>
                      {group.label}
                    </Text>
                    {group.suggestions.map((item, index) => (
                      <View
                        key={`${group.label}-${item}-${index}`}
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.modalOverlay}
            keyboardShouldPersistTaps="handled"
          >
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
            <View style={styles.visibilitySection}>
              <Text style={[styles.visibilityLabel, { color: colors.textMuted }]}>
                GÖRÜNÜRLÜK
              </Text>
              <View style={styles.visibilityRow}>
                {[
                  { label: "Aile", value: "family" },
                  ...(isParent ? [{ label: "Ebeveynler", value: "parents" }] : []),
                  { label: "Kişiye özel", value: "member" },
                ].map(option => {
                  const active = shoppingVisibility === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.visibilityChip,
                        {
                          backgroundColor: active ? colors.primary : colors.card,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setShoppingVisibility(option.value as any)}
                    >
                      <Text
                        style={[
                          styles.visibilityText,
                          { color: active ? "#fff" : colors.text },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {shoppingVisibility === "member" && familyMembers.length > 0 && (
                <View style={styles.assigneeRow}>
                  {familyMembers.map(member => {
                    const isActive = shoppingAssignees.includes(member.id);
                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.assigneeChip,
                          {
                            backgroundColor: isActive
                              ? colors.primary
                              : colors.card,
                            borderColor: isActive
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                        onPress={() =>
                          setShoppingAssignees(prev =>
                            isActive
                              ? prev.filter(id => id !== member.id)
                              : [...prev, member.id]
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.assigneeText,
                            { color: isActive ? "#fff" : colors.text },
                          ]}
                        >
                          {member.full_name || member.email}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
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
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={inventoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInventoryModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.modalOverlay}
            keyboardShouldPersistTaps="handled"
          >
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
      </ScrollView>
        </KeyboardAvoidingView>
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
  mealGroupTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 12,
  },
  mealSuggestion: {
    padding: 14,
    borderRadius: 18,
  },
  mealSuggestionText: { fontSize: 14, fontWeight: "600" },
  mealSettingsLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  mealPrefsRow: { marginTop: 4 },
  memberPrefCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
  },
  memberPrefTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

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
    flexGrow: 1,
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
  visibilitySection: { marginTop: 8 },
  visibilityLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  visibilityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  visibilityChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  visibilityText: { fontSize: 12, fontWeight: "600" },
  assigneeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  assigneeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  assigneeText: { fontSize: 12, fontWeight: "600" },
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
