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
  findMatchingShoppingItems,
  removeShoppingItemsByIds,
  getShoppingListItems,
  generateMealSuggestionsAI,
  approveInventoryItem,
  notifyMealPollPublished,
  createMealPoll,
  getActiveMealPoll,
  approveMealPoll,
  submitMealPollVote,
} from "../../services/kitchen";
import { getFamilyMembers } from "../../services/family";
import { getPreferences } from "../../services/settings";
import HeartbeatLoader from "../../components/ui/HeartbeatLoader";
import ModernInput from "../../components/ui/ModernInput";

export default function KitchenScreen({ navigation, route }: any) {
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
    { label: string; suggestions: { title: string; missing: string[] }[] }[]
  >([]);
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
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>(
    []
  );
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [publishGroupLabel, setPublishGroupLabel] = useState("");
  const [publishExtraNotes, setPublishExtraNotes] = useState("");
  const [publishEndTime, setPublishEndTime] = useState("");
  const [manualPollVisible, setManualPollVisible] = useState(false);
  const [manualPollTitle, setManualPollTitle] = useState("Bugün ne pişirelim?");
  const [manualPollOptions, setManualPollOptions] = useState("");
  const [manualMealShare, setManualMealShare] = useState("");
  const [manualPollNotes, setManualPollNotes] = useState("");
  const [manualPollEndTime, setManualPollEndTime] = useState("");
  const [pollAudience, setPollAudience] = useState<"parents" | "members">(
    "parents"
  );
  const [pollMemberIds, setPollMemberIds] = useState<string[]>([]);
  const [activeMealPoll, setActiveMealPoll] = useState<any>(null);
  const [dailyPollSelection, setDailyPollSelection] = useState<string | null>(
    null
  );
  const [recipeConfirmVisible, setRecipeConfirmVisible] = useState(false);
  const [recipeConfirmTitle, setRecipeConfirmTitle] = useState("Tavuk sote");
  const [recipeConfirmCheck, setRecipeConfirmCheck] = useState<{
    have: string[];
    missing: string[];
  }>({ have: [], missing: [] });
  const [shoppingRemoveVisible, setShoppingRemoveVisible] = useState(false);
  const [shoppingRemoveItems, setShoppingRemoveItems] = useState<any[]>([]);
  const [shoppingRemoveSelected, setShoppingRemoveSelected] = useState<string[]>(
    []
  );
  const [shoppingRemoveMatched, setShoppingRemoveMatched] = useState<string[]>([]);
  const [shoppingRemoveLabel, setShoppingRemoveLabel] = useState("");
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
    const pollRes = await getActiveMealPoll();
    setActiveMealPoll(pollRes?.poll || null);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadMealSettings();
      getActiveMealPoll().then(res => setActiveMealPoll(res?.poll || null));
    }, [])
  );
  const resolveEndAt = (timeValue: string) => {
    if (!timeValue) return null;
    const match = timeValue.trim().match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;
    const now = new Date();
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const endAt = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      0
    );
    return endAt.toISOString();
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
    if (!isParent) {
      Alert.alert("Bilgi", "Stok düzenleme için yönetici onayı gerekir.");
      return;
    }
    setInventoryEditId(item.id);
    setInventoryName(item.product_name || "");
    setInventoryQty(String(item.quantity ?? 1));
    setInventoryUnit(item.unit || "adet");
    setInventoryPrice(String(item.last_price ?? 0));
    setInventoryModalVisible(true);
  };

  const handleDeleteInventoryItem = (item: any) => {
    Alert.alert(
      "Ürünü sil",
      `"${item.product_name}" için sebep seçin.`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Tüketildi",
          onPress: async () => {
            const result = await deleteInventoryItem(item.id, "consumed");
            if (result?.success) {
              loadData();
            } else {
              Alert.alert("Hata", result?.error || "Ürün silinemedi.");
            }
          },
        },
        {
          text: "Hatalı Eklendi",
          style: "destructive",
          onPress: async () => {
            const result = await deleteInventoryItem(item.id, "mistake");
            if (result?.success) {
              loadData();
            } else {
              Alert.alert("Hata", result?.error || "Ürün silinemedi.");
            }
          },
        },
      ]
    );
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
    if (item?.market_name) {
      parts.push(item.market_name);
    }
    return parts.join(" • ");
  };

  const canSeeShoppingItem = (item: any) => {
    return true;
  };

  const handleApproveInventoryItem = async (item: any) => {
    const res = await approveInventoryItem(item.id);
    if (res?.success) {
      Alert.alert("Başarılı", "Ürün onaylandı.");
      loadData();
    } else {
      Alert.alert("Hata", res?.error || "Ürün onaylanamadı.");
    }
  };

  const toggleRemoveSelection = (id: string) => {
    setShoppingRemoveSelected(prev =>
      prev.includes(id) ? prev.filter(val => val !== id) : [...prev, id]
    );
  };

  const getSuggestionId = (groupLabel: string, index: number) =>
    `${groupLabel}::${index}`;

  const getSelectedMealsForPublish = () => {
    const selected: { title: string; missing: string[] }[] = [];
    mealSuggestionGroups.forEach(group => {
      group.suggestions.forEach((item, index) => {
        const id = getSuggestionId(group.label, index);
        if (selectedSuggestionIds.includes(id)) {
          selected.push(item);
        }
      });
    });
    return selected;
  };

  const handleAddMissingItems = async (missing: string[]) => {
    if (!missing || missing.length === 0) {
      Alert.alert("Bilgi", "Eksik malzeme bulunmuyor.");
      return;
    }
    const matchRes = await findMatchingShoppingItems(missing);
    const existingNames = new Set(
      (matchRes?.matches || [])
        .map((item: any) => String(item.product_name || "").toLowerCase())
        .filter(Boolean)
    );
    const toAdd = missing.filter(
      name => !existingNames.has(name.toLowerCase())
    );
    if (toAdd.length === 0) {
      Alert.alert("Bilgi", "Eksik malzemeler zaten listede.");
      return;
    }
    Alert.alert(
      "Eksik malzemeleri ekle",
      `${toAdd.join(", ")} listeye eklensin mi?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Ekle",
          onPress: async () => {
            for (const name of toAdd) {
              await addShoppingItem(name, 1, "adet", undefined, true);
            }
            Alert.alert("Başarılı", "Eksik malzemeler listeye eklendi.");
            loadData();
          },
        },
      ]
    );
  };

  const handleOpenRecipeConfirm = (title: string, missing: string[]) => {
    const inventoryNames = (data?.items || []).map((item: any) =>
      String(item.product_name || "").toLowerCase()
    );
    const have: string[] = [];
    const normalizedMissing =
      missing?.map(item => String(item).toLowerCase()) || [];
    if (normalizedMissing.length > 0) {
      normalizedMissing.forEach(name => {
        const exists = inventoryNames.some((inv: string) => inv.includes(name));
        if (exists) {
          have.push(name);
        }
      });
    }
    setRecipeConfirmTitle(title || "Tarif");
    setRecipeConfirmCheck({ have, missing: missing || [] });
    setRecipeConfirmVisible(true);
  };
  const resetMealSectionState = () => {
    setMealSuggestionGroups([]);
    setSelectedSuggestionIds([]);
    setPublishModalVisible(false);
    setPublishGroupLabel("");
    setPublishExtraNotes("");
    setPublishEndTime("");
    setManualPollVisible(false);
    setManualPollTitle("Bugün ne pişirelim?");
    setManualPollOptions("");
    setManualMealShare("");
    setManualPollNotes("");
    setManualPollEndTime("");
    setPollAudience("parents");
    setPollMemberIds([]);
    setActiveMealPoll(null);
    setRecipeConfirmVisible(false);
  };

  useEffect(() => {
    if (route?.params?.resetMeal) {
      resetMealSectionState();
      navigation.setParams({ resetMeal: false });
    }
  }, [route?.params?.resetMeal, navigation]);

  useEffect(() => {
    setDailyPollSelection(null);
  }, [activeMealPoll?.id]);

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
      if (!isParent) {
        Alert.alert(
          "Onay bekliyor",
          "Ürün yöneticinin onayına gönderildi."
        );
      } else {
        const [listRes, matchRes] = await Promise.all([
          getShoppingListItems(),
          findMatchingShoppingItems([payload.product_name]),
        ]);
        const items = listRes?.items || [];
        const matches = matchRes?.matches || [];
        if (items.length > 0) {
          setShoppingRemoveItems(items);
          const matchedIds = matches.map((m: any) => m.id);
          setShoppingRemoveMatched(matchedIds);
          setShoppingRemoveSelected(matchedIds);
          setShoppingRemoveLabel(payload.product_name);
          setShoppingRemoveVisible(true);
        }
      }
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

  const handleMealSuggest = async () => {
    try {
      setMealLoading(true);
      const prefs = await getPreferences();
      if (prefs?.meal_preferences) {
        setMealPreferences(prev => ({ ...prev, ...prefs.meal_preferences }));
      }
      if (prefs?.meal_settings) {
        setMealSettings(prev => ({ ...prev, ...prefs.meal_settings }));
      }

      const inventoryItems = data?.items || [];
      if (!isParent) {
        const groups = [
          {
            label: "Benim önerilerim",
            memberNames: [profile?.full_name || profile?.email || "Ben"],
            prefs: {
              cuisine:
                prefs?.meal_preferences?.cuisine || mealPreferences.cuisine,
              calories:
                prefs?.meal_preferences?.calories || mealPreferences.calories,
              avoid: prefs?.meal_preferences?.avoid || mealPreferences.avoid,
            },
          },
        ];
        const aiRes = await generateMealSuggestionsAI({
          inventoryItems,
          groups,
          language: prefs?.preferred_language || "tr",
        });
        if (aiRes?.error) {
          Alert.alert("Hata", aiRes.error || "Öneri oluşturulamadı.");
          return;
        }
        setMealSuggestionGroups(aiRes?.groups || []);
        setSelectedSuggestionIds([]);
        return;
      }

      const selectedMemberIds =
        mealSettings?.memberIds?.length > 0 ? mealSettings.memberIds : null;
      const filteredMembers = selectedMemberIds
        ? familyMembers.filter(member => selectedMemberIds.includes(member.id))
        : familyMembers;

      const membersWithPrefs = filteredMembers.map(member => ({
        member,
        prefs: member.meal_preferences || {
          cuisine: "world",
          calories: "",
          avoid: "",
        },
      }));

      const grouped: Record<string, { memberNames: string[]; prefs: any }> = {};
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

      const groups = Object.values(grouped).map(group => ({
        label:
          group.memberNames.length >= 2
            ? `Topluluk: ${group.memberNames.join(", ")}`
            : group.memberNames[0],
        memberNames: group.memberNames,
        prefs: group.prefs,
      }));

      const aiRes = await generateMealSuggestionsAI({
        inventoryItems,
        groups,
        language: prefs?.preferred_language || "tr",
      });
      if (aiRes?.error) {
        Alert.alert("Hata", aiRes.error || "Öneri oluşturulamadı.");
        return;
      }
      setMealSuggestionGroups(aiRes?.groups || []);
      setSelectedSuggestionIds([]);
    } catch (error: any) {
      Alert.alert("Hata", error?.message || "Öneri oluşturulamadı.");
    } finally {
      setMealLoading(false);
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
            {!isParent ? (
              <View
                style={[
                  styles.infoCard,
                  isLight && styles.surfaceLift,
                  { backgroundColor: colors.card },
                ]}
              >
                <Text style={[styles.infoTitle, { color: colors.text }]}>
                  Stok görüntüleme kısıtlı
            </Text>
                <Text style={[styles.infoBody, { color: colors.textMuted }]}>
                  Yönetici olmayan kullanıcılar stok içeriğini göremez. Ürün
                  ekleyebilirsiniz; eklemeler yöneticinin onayına düşer.
            </Text>
          </View>
            ) : (
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
                  .map((item: any) => {
                    const pending = item.is_approved === false;
                    return (
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
                          {pending ? (
                            <View style={styles.pendingBadge}>
                              <Text style={styles.pendingText}>Onay Bekliyor</Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.itemRight}>
                          <Text style={[styles.qtyText, { color: colors.primary }]}>
                            {item.quantity} {item.unit}
                          </Text>
                          <View style={styles.itemActions}>
                            {pending ? (
                              <TouchableOpacity
                                style={[
                                  styles.iconButton,
                                  { borderColor: colors.primary },
                                ]}
                                onPress={() => handleApproveInventoryItem(item)}
                              >
                                <CheckCircle2 size={16} color={colors.primary} />
                              </TouchableOpacity>
                            ) : null}
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
                    );
                  })}
              </>
            )}
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
                const market = String(item.market_name || "").toLowerCase();
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

            <View
              style={[
                styles.infoCard,
                isLight && styles.surfaceLift,
                { backgroundColor: colors.card },
              ]}
            >
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                Günlük anket
              </Text>
              {activeMealPoll ? (
                <>
                  <Text style={[styles.infoBody, { color: colors.textMuted }]}>
                    {activeMealPoll.title}
                  </Text>
                  <View style={styles.selectionList}>
                    {(activeMealPoll.suggestions || []).map(
                      (item: any, idx: number) => {
                        const optionTitle = item.title || item;
                        const selected = dailyPollSelection === optionTitle;
                        return (
                          <TouchableOpacity
                            key={`${activeMealPoll.id}-${idx}`}
                            style={[
                              styles.selectionItem,
                              {
                                borderColor: selected
                                  ? colors.primary
                                  : colors.border,
                                backgroundColor: colors.background,
                              },
                            ]}
                            onPress={async () => {
                              if (dailyPollSelection === optionTitle) return;
                              setDailyPollSelection(optionTitle);
                              const res = await submitMealPollVote(
                                activeMealPoll.id,
                                optionTitle
                              );
                              if (res?.error) {
                                Alert.alert("Hata", res.error);
                                setDailyPollSelection(null);
                              }
                            }}
                          >
                            {selected ? (
                              <CheckCircle2 size={20} color={colors.primary} />
                            ) : (
                              <Circle size={20} color={colors.border} />
                            )}
                            <View style={styles.selectionInfo}>
                              <Text
                                style={[styles.selectionName, { color: colors.text }]}
                              >
                                {optionTitle}
                              </Text>
                              {selected ? (
                                <Text
                                  style={[
                                    styles.selectionMeta,
                                    { color: colors.textMuted },
                                  ]}
                                >
                                  Seçildi
                                </Text>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                  {activeMealPoll.created_by === user?.id &&
                  (!activeMealPoll.end_at ||
                    new Date(activeMealPoll.end_at).getTime() <= Date.now()) ? (
                    <TouchableOpacity
                      style={[
                        styles.mealPublishBtn,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={async () => {
                        const res = await approveMealPoll(activeMealPoll.id);
                        if (res?.success) {
                          Alert.alert(
                            "Başarılı",
                            "Eksik malzemeler listeye eklendi."
                          );
                          const pollRes = await getActiveMealPoll();
                          setActiveMealPoll(pollRes?.poll || null);
                          loadData();
                        } else {
                          Alert.alert(
                            "Hata",
                            res?.error || "Anket onaylanamadı."
                          );
                        }
                      }}
                    >
                      <Text style={styles.mealPublishText}>Onayla</Text>
                    </TouchableOpacity>
                  ) : activeMealPoll.created_by === user?.id ? (
                    <Text style={[styles.infoBody, { color: colors.textMuted }]}>
                      Anket bitince onaylayabilirsiniz.
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={[styles.infoBody, { color: colors.textMuted }]}>
                  Henüz aktif anket yok.
                </Text>
              )}
            </View>

            {isParent && mealSuggestionGroups.length === 0 ? (
              <Text style={[styles.mealHint, { color: colors.textMuted }]}>
                Öneri için alttaki yapay zeka butonuna basın.
              </Text>
            ) : isParent ? (
              <View style={styles.mealList}>
                {mealSuggestionGroups.map(group => (
                  <View key={group.label}>
                    <Text style={[styles.mealGroupTitle, { color: colors.text }]}>
                      {group.label}
                    </Text>
                    {group.suggestions.slice(0, 3).map((item, index) => {
                      const id = getSuggestionId(group.label, index);
                      const selected = selectedSuggestionIds.includes(id);
                      return (
                        <View
                          key={`${group.label}-${item.title}-${index}`}
                          style={[
                            styles.mealSuggestion,
                            isLight && styles.surfaceLift,
                            {
                              backgroundColor: colors.card,
                              borderColor: selected
                                ? colors.primary
                                : colors.border,
                              borderWidth: 1,
                            },
                          ]}
                        >
                          <View style={styles.mealSuggestionHeader}>
                            <TouchableOpacity
                              onPress={() =>
                                setSelectedSuggestionIds(prev =>
                                  prev.includes(id)
                                    ? prev.filter(val => val !== id)
                                    : [...prev, id]
                                )
                              }
                              style={styles.mealSuggestionSelect}
                            >
                              {selected ? (
                                <CheckCircle2 size={20} color={colors.primary} />
                              ) : (
                                <Circle size={20} color={colors.border} />
                              )}
                            </TouchableOpacity>
                            <Text
                              style={[
                                styles.mealSuggestionTitle,
                                { color: colors.text },
                              ]}
                            >
                              {item.title}
                            </Text>
                          </View>
                          {item.missing && item.missing.length > 0 ? (
                            <Text
                              style={[
                                styles.mealMissingText,
                                { color: colors.textMuted },
                              ]}
                            >
                              Eksik: {item.missing.join(", ")}
                            </Text>
                          ) : null}
                          <View style={styles.mealSuggestionActions}>
                            <TouchableOpacity
                              style={[
                                styles.mealActionBtn,
                                { borderColor: colors.border },
                              ]}
                              onPress={() =>
                                handleOpenRecipeConfirm(item.title, item.missing || [])
                              }
                            >
                              <Text
                                style={[
                                  styles.mealActionText,
                                  { color: colors.text },
                                ]}
                              >
                                Tarif
                              </Text>
                            </TouchableOpacity>
                            {item.missing && item.missing.length > 0 ? (
                              <TouchableOpacity
                                style={[
                                  styles.mealActionBtn,
                                  styles.mealActionPrimary,
                                  { backgroundColor: colors.primary },
                                ]}
                                onPress={() => handleAddMissingItems(item.missing)}
                              >
                                <Text style={styles.mealActionTextPrimary}>
                                  Eksikleri listeye ekle
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.mealPublishBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    if (selectedSuggestionIds.length === 0) {
                      Alert.alert(
                        "Seçim gerekli",
                        "Anket için en az bir öneri seçin."
                      );
                      return;
                    }
                    setPublishGroupLabel("Ebeveynler");
                    setPublishExtraNotes("");
                    setPublishEndTime("");
                    setPollAudience("parents");
                    setPollMemberIds([]);
                    setPublishModalVisible(true);
                  }}
                >
                  <Text style={styles.mealPublishText}>Anketi yayınla</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {isParent && (
              <TouchableOpacity
                style={[styles.mealPublishBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => {
                  setManualPollTitle("Bugün ne pişirelim?");
                  setManualPollOptions("");
                  setManualMealShare("");
                  setManualPollNotes("");
                  setManualPollEndTime("");
                  setManualPollVisible(true);
                }}
              >
                <Text style={[styles.mealPublishText, { color: colors.text }]}>
                  Manuel anket oluştur / Yemek paylaş
                </Text>
              </TouchableOpacity>
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

      {activeTab === "meal" && isParent && (
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

      <Modal
        visible={shoppingRemoveVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShoppingRemoveVisible(false)}
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
                İstek listesinden çıkar
              </Text>
              <Text style={[styles.modalHint, { color: colors.textMuted }]}>
                {shoppingRemoveLabel
                  ? `"${shoppingRemoveLabel}" için uygun olanları seç`
                  : "Listeden çıkarılacak ürünleri seç"}
              </Text>

              {shoppingRemoveItems.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  İstek listesi boş.
                </Text>
              ) : (
                <View style={styles.selectionList}>
                  <View style={styles.selectionActions}>
                    <TouchableOpacity
                      style={[styles.selectionActionBtn, { borderColor: colors.border }]}
                      onPress={() =>
                        setShoppingRemoveSelected(
                          shoppingRemoveItems.map(item => item.id)
                        )
                      }
                    >
                      <Text
                        style={[styles.selectionActionText, { color: colors.text }]}
                      >
                        Hepsini seç
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.selectionActionBtn, { borderColor: colors.border }]}
                      onPress={() => setShoppingRemoveSelected(shoppingRemoveMatched)}
                    >
                      <Text
                        style={[styles.selectionActionText, { color: colors.text }]}
                      >
                        Eşleşenleri seç
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.selectionActionBtn, { borderColor: colors.border }]}
                      onPress={() => setShoppingRemoveSelected([])}
                    >
                      <Text
                        style={[styles.selectionActionText, { color: colors.text }]}
                      >
                        Seçimi temizle
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {shoppingRemoveItems.map(item => {
                    const selected = shoppingRemoveSelected.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.selectionItem,
                          { borderColor: colors.border },
                        ]}
                        onPress={() => toggleRemoveSelection(item.id)}
                      >
                        {selected ? (
                          <CheckCircle2 size={22} color={colors.primary} />
                        ) : (
                          <Circle size={22} color={colors.border} />
                        )}
                        <View style={styles.selectionInfo}>
                          <Text
                            style={[styles.selectionName, { color: colors.text }]}
                          >
                            {item.product_name}
                          </Text>
                          <Text
                            style={[
                              styles.selectionMeta,
                              { color: colors.textMuted },
                            ]}
                          >
                            {item.quantity} {item.unit || "adet"}
                            {item.market_name ? ` • ${item.market_name}` : ""}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { borderColor: colors.border }]}
                  onPress={() => setShoppingRemoveVisible(false)}
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
                  onPress={async () => {
                    if (shoppingRemoveSelected.length === 0) {
                      Alert.alert("Bilgi", "Lütfen listeden ürün seçin.");
                      return;
                    }
                    await removeShoppingItemsByIds(shoppingRemoveSelected);
                    setShoppingRemoveVisible(false);
                    setShoppingRemoveSelected([]);
                    Alert.alert("Başarılı", "Seçili ürünler listeden çıkarıldı.");
                    loadData();
                  }}
                >
                  <Text style={styles.modalButtonTextPrimary}>Çıkar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={publishModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPublishModalVisible(false)}
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
                Anketi yayınla
              </Text>
              <Text style={[styles.modalHint, { color: colors.textMuted }]}>
                {publishGroupLabel} için seçilen öneriler:
              </Text>
              <Text style={[styles.modalHint, { color: colors.textMuted }]}>
                Hedef seçimi
              </Text>
              <View style={styles.selectionActions}>
                <TouchableOpacity
                  style={[
                    styles.selectionActionBtn,
                    { borderColor: colors.border },
                  ]}
                  onPress={() => {
                    setPollAudience("parents");
                    setPollMemberIds([]);
                  }}
                >
                  <Text
                    style={[
                      styles.selectionActionText,
                      {
                        color:
                          pollAudience === "parents" ? colors.primary : colors.text,
                      },
                    ]}
                  >
                    Ebeveynler
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.selectionActionBtn,
                    { borderColor: colors.border },
                  ]}
                  onPress={() => setPollAudience("members")}
                >
                  <Text
                    style={[
                      styles.selectionActionText,
                      {
                        color:
                          pollAudience === "members" ? colors.primary : colors.text,
                      },
                    ]}
                  >
                    Kişiler
                  </Text>
                </TouchableOpacity>
              </View>
              {pollAudience === "members" && familyMembers.length > 0 ? (
                <View style={styles.selectionList}>
                  {familyMembers.map(member => {
                    const active = pollMemberIds.includes(member.id);
                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.selectionItem,
                          { borderColor: colors.border },
                        ]}
                        onPress={() =>
                          setPollMemberIds(prev =>
                            active
                              ? prev.filter(id => id !== member.id)
                              : [...prev, member.id]
                          )
                        }
                      >
                        {active ? (
                          <CheckCircle2 size={20} color={colors.primary} />
                        ) : (
                          <Circle size={20} color={colors.border} />
                        )}
                        <Text style={[styles.selectionName, { color: colors.text }]}>
                          {member.full_name || member.email}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              {getSelectedMealsForPublish().length > 0 ? (
                <View style={styles.selectionList}>
                  {getSelectedMealsForPublish().map((item, idx) => (
                    <View
                      key={`${item.title}-${idx}`}
                      style={[
                        styles.selectedMealCard,
                        { borderColor: colors.border },
                      ]}
                    >
                      <Text
                        style={[styles.selectedMealTitle, { color: colors.text }]}
                      >
                        {item.title}
                      </Text>
                      {item.missing?.length ? (
                        <Text
                          style={[
                            styles.selectedMealMeta,
                            { color: colors.textMuted },
                          ]}
                        >
                          Eksik: {item.missing.join(", ")}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.mealHint, { color: colors.textMuted }]}>
                  Seçili öneri bulunamadı.
                </Text>
              )}

              <ModernInput
                label="Ekstra ankete eklemek istedikleriniz"
                value={publishExtraNotes}
                onChangeText={setPublishExtraNotes}
                placeholder="Örn: Tatlı önerisi, içecek..."
                multiline
              />
              <ModernInput
                label="Anket bitiş saati (yerel)"
                value={publishEndTime}
                onChangeText={setPublishEndTime}
                placeholder="Örn: 22:00"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { borderColor: colors.border }]}
                  onPress={() => setPublishModalVisible(false)}
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
                  onPress={async () => {
                    const timeOk =
                      !publishEndTime ||
                      /^\d{2}:\d{2}$/.test(publishEndTime.trim());
                    if (!timeOk) {
                      Alert.alert(
                        "Hata",
                        "Bitiş saati formatı HH:MM olmalı. Örn: 22:00"
                      );
                      return;
                    }
                    if (getSelectedMealsForPublish().length === 0) {
                      Alert.alert("Hata", "Seçili öneri bulunamadı.");
                      return;
                    }
                    const endAt = resolveEndAt(publishEndTime);
                    const selections = getSelectedMealsForPublish();
                    const missing = selections
                      .flatMap(item => item.missing || [])
                      .filter(Boolean);
                    await createMealPoll({
                      title: "Yemek anketi",
                      suggestions: selections,
                      missingItems: missing,
                      extraNotes: publishExtraNotes,
                      endAt,
                      audience: pollAudience,
                      memberIds: pollMemberIds,
                    });
                    const pollRes = await getActiveMealPoll();
                    setActiveMealPoll(pollRes?.poll || null);
                    setMealSuggestionGroups([]);
                    setSelectedSuggestionIds([]);
                    setPublishModalVisible(false);
                    Alert.alert("Başarılı", "Anket yayınlandı.");
                  }}
                >
                  <Text style={styles.modalButtonTextPrimary}>Yayınla</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={manualPollVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManualPollVisible(false)}
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
                Manuel anket / yemek paylaş
              </Text>
              <Text style={[styles.modalHint, { color: colors.textMuted }]}>
                Hedef seçimi
              </Text>
              <View style={styles.selectionActions}>
                <TouchableOpacity
                  style={[
                    styles.selectionActionBtn,
                    { borderColor: colors.border },
                  ]}
                  onPress={() => {
                    setPollAudience("parents");
                    setPollMemberIds([]);
                  }}
                >
                  <Text
                    style={[
                      styles.selectionActionText,
                      {
                        color:
                          pollAudience === "parents" ? colors.primary : colors.text,
                      },
                    ]}
                  >
                    Ebeveynler
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.selectionActionBtn,
                    { borderColor: colors.border },
                  ]}
                  onPress={() => setPollAudience("members")}
                >
                  <Text
                    style={[
                      styles.selectionActionText,
                      {
                        color:
                          pollAudience === "members" ? colors.primary : colors.text,
                      },
                    ]}
                  >
                    Kişiler
                  </Text>
                </TouchableOpacity>
              </View>
              {pollAudience === "members" && familyMembers.length > 0 ? (
                <View style={styles.selectionList}>
                  {familyMembers.map(member => {
                    const active = pollMemberIds.includes(member.id);
                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.selectionItem,
                          { borderColor: colors.border },
                        ]}
                        onPress={() =>
                          setPollMemberIds(prev =>
                            active
                              ? prev.filter(id => id !== member.id)
                              : [...prev, member.id]
                          )
                        }
                      >
                        {active ? (
                          <CheckCircle2 size={20} color={colors.primary} />
                        ) : (
                          <Circle size={20} color={colors.border} />
                        )}
                        <Text style={[styles.selectionName, { color: colors.text }]}>
                          {member.full_name || member.email}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              <ModernInput
                label="Anket başlığı"
                value={manualPollTitle}
                onChangeText={setManualPollTitle}
                placeholder="Örn: Bugün ne pişirelim?"
              />
              <ModernInput
                label="Anket seçenekleri (virgülle)"
                value={manualPollOptions}
                onChangeText={setManualPollOptions}
                placeholder="Örn: Menemen, Mercimek çorbası"
              />
              <ModernInput
                label="Yapılacak yemek (paylaşım)"
                value={manualMealShare}
                onChangeText={setManualMealShare}
                placeholder="Örn: Fırında tavuk"
              />
              <ModernInput
                label="Ekstra ankete eklemek istedikleriniz"
                value={manualPollNotes}
                onChangeText={setManualPollNotes}
                placeholder="Örn: Tatlı önerisi..."
                multiline
              />
              <ModernInput
                label="Anket bitiş saati (yerel)"
                value={manualPollEndTime}
                onChangeText={setManualPollEndTime}
                placeholder="Örn: 22:00"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { borderColor: colors.border }]}
                  onPress={() => setManualPollVisible(false)}
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
                  onPress={async () => {
                    const pollOptions = manualPollOptions
                      .split(",")
                      .map(v => v.trim())
                      .filter(Boolean);
                    const hasPoll = pollOptions.length > 0;
                    const hasShare = manualMealShare.trim().length > 0;
                    const timeOk =
                      !manualPollEndTime ||
                      /^\d{2}:\d{2}$/.test(manualPollEndTime.trim());
                    if (!timeOk) {
                      Alert.alert(
                        "Hata",
                        "Bitiş saati formatı HH:MM olmalı. Örn: 22:00"
                      );
                      return;
                    }
                    if (!hasPoll && !hasShare) {
                      Alert.alert(
                        "Eksik",
                        "Anket seçenekleri veya paylaşılacak yemek girin."
                      );
                      return;
                    }
                    const endAt = resolveEndAt(manualPollEndTime);
                    const optionSuggestions = pollOptions.map(title => ({
                      title,
                      missing: [],
                    }));
                    const suggestions =
                      optionSuggestions.length > 0
                        ? optionSuggestions
                        : [{ title: manualMealShare.trim(), missing: [] }];
                    await createMealPoll({
                      title: manualPollTitle.trim() || "Yemek anketi",
                      suggestions,
                      missingItems: [],
                      extraNotes: manualPollNotes,
                      endAt,
                      audience: pollAudience,
                      memberIds: pollMemberIds,
                    });
                    const pollRes = await getActiveMealPoll();
                    setActiveMealPoll(pollRes?.poll || null);
                    setMealSuggestionGroups([]);
                    setSelectedSuggestionIds([]);
                    setManualPollVisible(false);
                    Alert.alert("Başarılı", "Anket yayınlandı.");
                  }}
                >
                  <Text style={styles.modalButtonTextPrimary}>Yayınla</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={recipeConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRecipeConfirmVisible(false)}
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
                Malzeme kontrolü
              </Text>
              <Text style={[styles.modalHint, { color: colors.textMuted }]}>
                {recipeConfirmTitle} için elimizde var mı?
              </Text>
              <Text style={[styles.modalHint, { color: colors.textMuted }]}>
                Var: {recipeConfirmCheck.have.join(", ") || "-"}
              </Text>
              <Text style={[styles.modalHint, { color: colors.textMuted }]}>
                Eksik: {recipeConfirmCheck.missing.join(", ") || "-"}
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { borderColor: colors.border }]}
                  onPress={() => setRecipeConfirmVisible(false)}
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
                  onPress={() => {
                    if (recipeConfirmCheck.missing.length > 0) {
                      Alert.alert(
                        "Eksik malzeme",
                        "Eksikler var. Yine de tarifi açmak ister misiniz?",
                        [
                          { text: "Vazgeç", style: "cancel" },
                          {
                            text: "Devam",
                            onPress: () => {
                              setRecipeConfirmVisible(false);
                              navigation.navigate("TestRecipe", {
                                title: recipeConfirmTitle,
                              });
                            },
                          },
                        ]
                      );
                      return;
                    }
                    setRecipeConfirmVisible(false);
                    navigation.navigate("TestRecipe", { title: recipeConfirmTitle });
                  }}
                >
                  <Text style={styles.modalButtonTextPrimary}>Evet</Text>
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
  pendingBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: "#fde68a",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pendingText: { fontSize: 11, fontWeight: "700", color: "#92400e" },
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
  mealList: { marginTop: 12, gap: 14 },
  mealGroupTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 12,
  },
  mealSuggestion: {
    padding: 14,
    borderRadius: 18,
    marginBottom: 8,
  },
  mealSuggestionText: { fontSize: 14, fontWeight: "600" },
  infoCard: {
    padding: 16,
    borderRadius: 20,
    marginTop: 10,
  },
  infoTitle: { fontSize: 15, fontWeight: "800", marginBottom: 6 },
  infoBody: { fontSize: 13, lineHeight: 18 },
  emptyText: {
    textAlign: "center",
    padding: 12,
    fontSize: 12,
  },
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
  modalHint: { fontSize: 12, marginBottom: 12 },
  selectionList: { gap: 10, marginBottom: 12 },
  selectionItem: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectionInfo: { flex: 1 },
  selectionName: { fontSize: 14, fontWeight: "700" },
  selectionMeta: { fontSize: 12, marginTop: 2 },
  selectionActions: { flexDirection: "row", gap: 10, marginBottom: 8 },
  selectionActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  selectionActionText: { fontSize: 12, fontWeight: "700" },
  mealSuggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mealSuggestionTitle: { fontSize: 14, fontWeight: "800" },
  mealSuggestionSelect: { paddingRight: 8 },
  mealSuggestionActions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  mealActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  mealActionPrimary: {
    borderWidth: 0,
  },
  mealActionText: { fontSize: 12, fontWeight: "700" },
  mealActionTextPrimary: { color: "#fff", fontSize: 12, fontWeight: "700" },
  mealMissingText: { marginTop: 6, fontSize: 12 },
  mealPublishBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  mealPublishText: { color: "#fff", fontWeight: "700" },
  selectedMealCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  selectedMealTitle: { fontSize: 14, fontWeight: "800" },
  selectedMealMeta: { fontSize: 12, marginTop: 4 },
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
