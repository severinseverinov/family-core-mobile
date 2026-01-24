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
  Utensils,
  Store,
  Filter,
  ChevronDown,
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
  isProductMatch,
  normalizeProductName,
  removeShoppingItemsByIds,
  getShoppingListItems,
  generateMealSuggestionsAI,
  getMealRecipeAndMissingItems,
  approveInventoryItem,
  notifyMealPollPublished,
  createMealPoll,
  getActiveMealPoll,
  approveMealPoll,
  submitMealPollVote,
  deleteMealPoll,
  endMealPoll,
  updateMealPoll,
  reduceInventoryQuantity,
  checkDietShoppingNeeds,
} from "../../services/kitchen";
import { getFamilyMembers } from "../../services/family";
import { getPreferences } from "../../services/settings";
import HeartbeatLoader from "../../components/ui/HeartbeatLoader";
import ModernInput from "../../components/ui/ModernInput";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const [shoppingSelectionMode, setShoppingSelectionMode] = useState(false);
  const [selectedShoppingItems, setSelectedShoppingItems] = useState<Set<string>>(new Set());
  const [shoppingFilterModalVisible, setShoppingFilterModalVisible] = useState(false);
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
  const [publishEndTime, setPublishEndTime] = useState("15:00");
  const [manualPollVisible, setManualPollVisible] = useState(false);
  const [manualPollTitle, setManualPollTitle] = useState("Bugün ne pişirelim?");
  const [manualPollOptions, setManualPollOptions] = useState<string[]>(["", ""]);
  const [manualPollEndTime, setManualPollEndTime] = useState("12:00");
  const [deliveryRestaurantPollVisible, setDeliveryRestaurantPollVisible] = useState(false);
  const [deliveryRestaurantType, setDeliveryRestaurantType] = useState<"delivery" | "restaurant" | null>(null);
  const [deliveryRestaurantOptions, setDeliveryRestaurantOptions] = useState<string[]>(["", ""]);
  const [pollAudience, setPollAudience] = useState<"parents" | "members">(
    "parents"
  );
  const [pollMemberIds, setPollMemberIds] = useState<string[]>([]);
  const [pollMealType, setPollMealType] = useState<"cook" | "delivery" | "restaurant">("cook");
  const [activeMealPoll, setActiveMealPoll] = useState<any>(null);
  const [dailyPollSelection, setDailyPollSelection] = useState<string | null>(
    null
  );
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [approvedMealTitle, setApprovedMealTitle] = useState<string | null>(null);
  const [approvingMealPoll, setApprovingMealPoll] = useState(false);
  const [addedToShoppingList, setAddedToShoppingList] = useState<Set<string>>(new Set());
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
  const [finishCookingModalVisible, setFinishCookingModalVisible] = useState(false);
  const [finishCookingIngredients, setFinishCookingIngredients] = useState<Array<{
    name: string;
    usedQuantity: string;
    usedUnit: string;
    inventoryItem?: any;
  }>>([]);
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
      
      // Diyet programı aktif olanlar için ihtiyaç listesi kontrolü (haftalık)
      const checkDietNeeds = async () => {
        try {
          if (!profile?.family_id) return;
          
          const lastCheckKey = `diet_shopping_check_${profile.family_id}`;
          const lastCheckDate = await AsyncStorage.getItem(lastCheckKey);
          const now = new Date();
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          
          // Son kontrol 1 haftadan eskiyse veya hiç yapılmamışsa kontrol et
          if (!lastCheckDate || new Date(lastCheckDate) < oneWeekAgo) {
            const result = await checkDietShoppingNeeds();
            if (result.success && result.addedCount && result.addedCount > 0) {
              // Sessizce ekle, kullanıcıya bildirim gösterme (arka planda çalışır)
              console.log(`Diyet ihtiyaç listesi: ${result.addedCount} ürün eklendi`);
            }
            // Son kontrol tarihini kaydet
            await AsyncStorage.setItem(lastCheckKey, now.toISOString());
          }
        } catch (error) {
          console.warn("Diyet ihtiyaç listesi kontrolü hatası:", error);
        }
      };
      
      checkDietNeeds();
    }, [profile?.family_id])
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
              // State'i hemen güncelle
              setData((prev: any) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  items: (prev.items || []).filter((i: any) => i.id !== item.id),
                };
              });
              // Veriyi yeniden yükle
              await loadData();
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
              // State'i hemen güncelle
              setData((prev: any) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  items: (prev.items || []).filter((i: any) => i.id !== item.id),
                };
              });
              // Veriyi yeniden yükle
              await loadData();
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

  const handleAddMissingItems = async (missing: string[], mealTitle: string, showUrgentOption: boolean = false, forceUrgent: boolean = false) => {
    if (!missing || missing.length === 0) {
      Alert.alert("Bilgi", "Eksik malzeme bulunmuyor.");
      return;
    }
    
    // İlk kontrol - Alert gösterilmeden önce
    const matchRes = await findMatchingShoppingItems(missing);
    const existingMatches = matchRes?.matches || [];
    
    // Her bir missing ürünü için eşleşme var mı kontrol et
    const toAdd: string[] = [];
    const alreadyInList: string[] = [];
    
    missing.forEach(name => {
      const hasMatch = existingMatches.some((item: any) => 
        isProductMatch(name, item.product_name)
      );
      if (hasMatch) {
        alreadyInList.push(name);
      } else {
        toAdd.push(name);
      }
    });
    
    if (toAdd.length === 0) {
      Alert.alert("Bilgi", "Eksik malzemeler zaten listede.");
      setAddedToShoppingList(prev => {
        const newSet = new Set(prev);
        newSet.add(mealTitle);
        return newSet;
      });
      return;
    }
    
    let message = "";
    if (alreadyInList.length > 0) {
      message = `${alreadyInList.join(", ")} zaten listede.\n\n`;
    }
    message += `${toAdd.join(", ")} listeye eklensin mi?`;
    
    // Eğer forceUrgent true ise, direkt acil olarak ekle
    if (forceUrgent) {
      // Ekle butonuna basıldığında tekrar kontrol et
      const finalCheck = await findMatchingShoppingItems(toAdd);
      const finalMatches = finalCheck?.matches || [];
      
      const finalToAdd = toAdd.filter(name => {
        const hasMatch = finalMatches.some((item: any) => 
          isProductMatch(name, item.product_name)
        );
        return !hasMatch;
      });
      
      if (finalToAdd.length === 0) {
        Alert.alert("Bilgi", "Tüm ürünler zaten listede.");
        setAddedToShoppingList(prev => {
          const newSet = new Set(prev);
          newSet.add(mealTitle);
          return newSet;
        });
        return;
      }
      
      for (const name of finalToAdd) {
        // Genel isimle ekle (normalize edilmiş)
        const normalizedName = normalizeProductName(name);
        // Eğer normalize edilmiş isim boşsa, orijinal ismi kullan
        const finalName = normalizedName || name;
        await addShoppingItem(finalName, 1, "adet", undefined, true);
      }
      Alert.alert("Başarılı", `${finalToAdd.length} ürün listeye acil olarak eklendi.`);
      setAddedToShoppingList(prev => {
        const newSet = new Set(prev);
        newSet.add(mealTitle);
        return newSet;
      });
      loadData();
      return;
    }
    
    if (showUrgentOption) {
      Alert.alert(
        "Eksik malzemeleri ekle",
        message,
        [
          { text: "Vazgeç", style: "cancel" },
          {
            text: "Normal ekle",
            onPress: async () => {
              // Ekle butonuna basıldığında tekrar kontrol et
              const finalCheck = await findMatchingShoppingItems(toAdd);
              const finalMatches = finalCheck?.matches || [];
              
              const finalToAdd = toAdd.filter(name => {
                const hasMatch = finalMatches.some((item: any) => 
                  isProductMatch(name, item.product_name)
                );
                return !hasMatch;
              });
              
              if (finalToAdd.length === 0) {
                Alert.alert("Bilgi", "Tüm ürünler zaten listede.");
                return;
              }
              
              for (const name of finalToAdd) {
                // Genel isimle ekle (normalize edilmiş)
                const normalizedName = normalizeProductName(name);
                // Eğer normalize edilmiş isim boşsa, orijinal ismi kullan
                const finalName = normalizedName || name;
                await addShoppingItem(finalName, 1, "adet", undefined, false);
              }
              Alert.alert("Başarılı", `${finalToAdd.length} ürün listeye eklendi.`);
              setAddedToShoppingList(prev => {
                const newSet = new Set(prev);
                newSet.add(mealTitle);
                return newSet;
              });
              loadData();
            },
          },
          {
            text: "Acil olarak ekle",
            style: "default",
            onPress: async () => {
              // Ekle butonuna basıldığında tekrar kontrol et
              const finalCheck = await findMatchingShoppingItems(toAdd);
              const finalMatches = finalCheck?.matches || [];
              
              const finalToAdd = toAdd.filter(name => {
                const hasMatch = finalMatches.some((item: any) => 
                  isProductMatch(name, item.product_name)
                );
                return !hasMatch;
              });
              
              if (finalToAdd.length === 0) {
                Alert.alert("Bilgi", "Tüm ürünler zaten listede.");
                return;
              }
              
              for (const name of finalToAdd) {
                // Genel isimle ekle (normalize edilmiş)
                const normalizedName = normalizeProductName(name);
                // Eğer normalize edilmiş isim boşsa, orijinal ismi kullan
                const finalName = normalizedName || name;
                await addShoppingItem(finalName, 1, "adet", undefined, true);
              }
              Alert.alert("Başarılı", `${finalToAdd.length} ürün listeye acil olarak eklendi.`);
              setAddedToShoppingList(prev => {
                const newSet = new Set(prev);
                newSet.add(mealTitle);
                return newSet;
              });
              loadData();
            },
          },
        ]
      );
    } else {
      Alert.alert(
        "Eksik malzemeleri ekle",
        message,
        [
          { text: "Vazgeç", style: "cancel" },
          {
            text: "Ekle",
            onPress: async () => {
              // Ekle butonuna basıldığında tekrar kontrol et
              const finalCheck = await findMatchingShoppingItems(toAdd);
              const finalMatches = finalCheck?.matches || [];
              
              const finalToAdd = toAdd.filter(name => {
                const hasMatch = finalMatches.some((item: any) => 
                  isProductMatch(name, item.product_name)
                );
                return !hasMatch;
              });
              
              if (finalToAdd.length === 0) {
                Alert.alert("Bilgi", "Tüm ürünler zaten listede.");
                return;
              }
              
              for (const name of finalToAdd) {
                await addShoppingItem(name, 1, "adet", undefined, true);
              }
              Alert.alert("Başarılı", `${finalToAdd.length} ürün listeye eklendi.`);
              setAddedToShoppingList(prev => {
                const newSet = new Set(prev);
                newSet.add(mealTitle);
                return newSet;
              });
              loadData();
            },
          },
        ]
      );
    }
  };

  const handleOpenRecipeConfirm = (title: string, missing: string[], recipe?: string) => {
    // Sadece tarif göster
    navigation.navigate("Recipe", { title, showCookingButton: false, recipe, missingItems: missing });
  };

  const detectMealType = (title: string, suggestions: string[], extraNotes?: string): "cook" | "delivery" | "restaurant" => {
    const textToCheck = `${title} ${suggestions.join(" ")} ${extraNotes || ""}`.toLowerCase();
    
    // Restoran anahtar kelimeleri
    const restaurantKeywords = ["restoran", "restaurant", "dışarıda", "dışarıda yemek", "dışarıda yiyelim", "dışarıda yiyelim", "dışarı çıkalım"];
    // Paket servis anahtar kelimeleri
    const deliveryKeywords = ["sipariş", "paket", "getir", "yemeksepeti", "trendyol", "dışarıdan", "sipariş verelim", "paket servis"];
    
    if (restaurantKeywords.some(keyword => textToCheck.includes(keyword))) {
      return "restaurant";
    }
    if (deliveryKeywords.some(keyword => textToCheck.includes(keyword))) {
      return "delivery";
    }
    
    // Varsayılan olarak evde pişir
    return "cook";
  };

  const handleStartCooking = (title: string, missing: string[], recipe?: string) => {
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
    const stillMissing = normalizedMissing.filter(
      name => !have.includes(name)
    );
    
    if (stillMissing.length > 0) {
      Alert.alert(
        "Eksik malzemeler var",
        `Şu malzemeler envanterde yok: ${stillMissing.join(", ")}. Yine de yemek yapmaya başlamak ister misiniz?`,
        [
          { text: "Vazgeç", style: "cancel" },
          {
            text: "Onayla",
            onPress: () => {
              navigation.navigate("Recipe", { title, showCookingButton: true, recipe, missingItems: missing });
            },
          },
        ]
      );
    } else {
      navigation.navigate("Recipe", { title, showCookingButton: true, recipe, missingItems: missing });
    }
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
    setManualPollOptions(["", ""]);
    setManualPollEndTime("12:00");
    setPollAudience("parents");
    setPollMemberIds([]);
    setActiveMealPoll(null);
    setApprovedMealTitle(null);
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

  // Eksik malzemelerin listede olup olmadığını kontrol et
  useEffect(() => {
    const checkMissingItemsInList = async () => {
      if (!activeMealPoll || activeMealPoll.is_active) return;
      
      const suggestions = activeMealPoll.suggestions || [];
      const newAddedSet = new Set<string>();
      
      for (const item of suggestions) {
        const optionTitle = item.title || item;
        const missingItems = item.missing || [];
        
        if (missingItems.length === 0 || addedToShoppingList.has(optionTitle)) {
          continue;
        }
        
        const matchRes = await findMatchingShoppingItems(missingItems);
        const existingMatches = matchRes?.matches || [];
        
        const allInList = missingItems.every((name: string) => {
          return existingMatches.some((listItem: any) => 
            isProductMatch(name, listItem.product_name)
          );
        });
        
        if (allInList) {
          newAddedSet.add(optionTitle);
        }
      }
      
      if (newAddedSet.size > 0) {
        setAddedToShoppingList(prev => {
          const newSet = new Set(prev);
          newAddedSet.forEach(title => newSet.add(title));
          return newSet;
        });
      }
    };
    
    checkMissingItemsInList();
  }, [activeMealPoll, data?.items]);

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
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, paddingHorizontal: 8, gap: 8 }}>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: shoppingSelectionMode ? colors.primary : colors.border,
                  backgroundColor: shoppingSelectionMode ? colors.primary + "20" : colors.card,
                  minWidth: 70,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={() => {
                  if (shoppingSelectionMode) {
                    setSelectedShoppingItems(new Set());
                  }
                  setShoppingSelectionMode(prev => !prev);
                }}
              >
                <Text style={{
                  color: shoppingSelectionMode ? colors.primary : colors.text,
                  fontWeight: "700",
                  fontSize: 13,
                }}>
                  {shoppingSelectionMode ? "İptal" : "Seç"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: (shoppingStatus !== "all" || shoppingUrgentOnly) ? colors.primary : colors.border,
                  backgroundColor: (shoppingStatus !== "all" || shoppingUrgentOnly) ? colors.primary + "20" : colors.card,
                }}
                onPress={() => setShoppingFilterModalVisible(true)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Filter size={16} color={(shoppingStatus !== "all" || shoppingUrgentOnly) ? colors.primary : colors.text} />
                  <Text style={{
                    color: (shoppingStatus !== "all" || shoppingUrgentOnly) ? colors.primary : colors.text,
                    fontWeight: "700",
                    fontSize: 13,
                  }}>
                    {(() => {
                      if (shoppingUrgentOnly && shoppingStatus === "all") return "Acil";
                      if (shoppingUrgentOnly && shoppingStatus === "active") return "Acil • Aktif";
                      if (shoppingUrgentOnly && shoppingStatus === "done") return "Acil • Tamamlanan";
                      if (shoppingStatus === "active") return "Aktif";
                      if (shoppingStatus === "done") return "Tamamlanan";
                      return "Filtrele";
                    })()}
                  </Text>
                </View>
                <ChevronDown size={16} color={(shoppingStatus !== "all" || shoppingUrgentOnly) ? colors.primary : colors.text} />
          </TouchableOpacity>
        </View>

            {/* Toplu işlem butonları */}
            {shoppingSelectionMode && selectedShoppingItems.size > 0 && (
              <View style={{
                marginBottom: 12,
                paddingHorizontal: 8,
                gap: 8,
              }}>
                <View style={{
                  flexDirection: "row",
                  gap: 8,
                }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: colors.primary,
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: "center",
                    }}
                    onPress={async () => {
                      const itemIds = Array.from(selectedShoppingItems);
                      for (const itemId of itemIds) {
                        await toggleShoppingItem(itemId, true);
                      }
                      await loadData();
                      setSelectedShoppingItems(new Set());
                      setShoppingSelectionMode(false);
                      Alert.alert("Başarılı", `${itemIds.length} ürün onaylandı.`);
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                      Onayla ({selectedShoppingItems.size})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: colors.success || "#10b981",
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: "center",
                    }}
                    onPress={async () => {
                      const itemIds = Array.from(selectedShoppingItems);
                      const selectedItems = data?.shoppingList?.filter((item: any) => 
                        itemIds.includes(item.id)
                      ) || [];
                      
                      // Her bir ürünü envantere ekle
                      for (const item of selectedItems) {
                        await addInventoryItem({
                          product_name: item.product_name,
                          quantity: item.quantity || 1,
                          unit: item.unit || "adet",
                          price: 0,
                        });
                      }
                      
                      // Listeden sil
                      await removeShoppingItemsByIds(itemIds);
                      await loadData();
                      setSelectedShoppingItems(new Set());
                      setShoppingSelectionMode(false);
                      Alert.alert("Başarılı", `${itemIds.length} ürün envantere eklendi.`);
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                      Envantere Ekle
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.error || "#ef4444",
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                  }}
                  onPress={async () => {
                    Alert.alert(
                      "Ürünleri sil",
                      `Seçilen ${selectedShoppingItems.size} ürün listeden kaldırılsın mı?`,
                      [
                        { text: "Vazgeç", style: "cancel" },
                        {
                          text: "Sil",
                          style: "destructive",
                          onPress: async () => {
                            const itemIds = Array.from(selectedShoppingItems);
                            await removeShoppingItemsByIds(itemIds);
                            await loadData();
                            setSelectedShoppingItems(new Set());
                            setShoppingSelectionMode(false);
                            Alert.alert("Başarılı", `${itemIds.length} ürün silindi.`);
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                    Listeden Çıkar ({selectedShoppingItems.size})
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
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
                <View
                  key={item.id}
                  style={[
                    styles.itemCard,
                    isLight && styles.surfaceLift,
                    {
                      backgroundColor: colors.card,
                      opacity: item.is_completed ? 0.6 : 1,
                      flexDirection: "row",
                      alignItems: "center",
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
                    onPress={async () => {
                      if (shoppingSelectionMode) {
                        // Seçim modunda: checkbox'ı toggle et
                        setSelectedShoppingItems(prev => {
                          const next = new Set(prev);
                          if (next.has(item.id)) {
                            next.delete(item.id);
                          } else {
                            next.add(item.id);
                          }
                          return next;
                        });
                      } else {
                        // Normal modda: onayla/onayı kaldır
                        const result = await toggleShoppingItem(item.id, !item.is_completed);
                        if (result?.success) {
                          // State'i hemen güncelle
                          setData((prev: any) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              items: (prev.items || []).map((i: any) =>
                                i.id === item.id
                                  ? { ...i, is_completed: !item.is_completed }
                                  : i
                              ),
                            };
                          });
                          // Veriyi yeniden yükle
                          await loadData();
                        }
                      }
                    }}
                  >
                    {shoppingSelectionMode ? (
                      selectedShoppingItems.has(item.id) ? (
                        <CheckCircle2 size={22} color={colors.primary} />
                      ) : (
                        <Circle size={22} color={colors.border} />
                      )
                    ) : item.is_completed ? (
                      <CheckCircle2 size={22} color={colors.primary} />
                    ) : (
                      <Circle size={22} color={colors.border} />
                    )}
                    <View style={[styles.itemInfo, { marginLeft: 12, flex: 1 }]}>
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
                  {item.is_completed && (
                    <TouchableOpacity
                      style={{
                        padding: 8,
                        marginLeft: 8,
                      }}
                      onPress={async () => {
                        Alert.alert(
                          "Ürünü sil",
                          `"${item.product_name}" listeden tamamen kaldırılsın mı?`,
                          [
                            { text: "Vazgeç", style: "cancel" },
                            {
                              text: "Sil",
                              style: "destructive",
                              onPress: async () => {
                                const result = await removeShoppingItemsByIds([item.id]);
                                if (result?.success) {
                                  // State'i hemen güncelle
                                  setData((prev: any) => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      items: (prev.items || []).filter(
                                        (i: any) => i.id !== item.id
                                      ),
                                    };
                                  });
                                  // Veriyi yeniden yükle
                                  await loadData();
                                } else {
                                  Alert.alert("Hata", result?.error || "Ürün silinemedi.");
                                }
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Trash2 size={20} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
          </>
        ) : (
          <>
            <View
              style={[
                styles.infoCard,
                isLight && styles.surfaceLift,
                { backgroundColor: colors.card },
              ]}
            >
              {activeMealPoll ? (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
                      {activeMealPoll.title}
                    </Text>
                    {!activeMealPoll.is_active && (
                      <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "600" }}>
                        (Anket sonlandı)
                      </Text>
                    )}
                  </View>
                  {(() => {
                    const mealType = activeMealPoll.meal_type || "cook";
                    const isDeliveryRestaurant = mealType === "delivery" || mealType === "restaurant";
                    // Paket/restoran anketleri için her zaman aktif anket görünümünde kal (sonuç ekranına geçme)
                    const showActiveView = activeMealPoll.is_active || isDeliveryRestaurant;
                    
                    return showActiveView ? (
                      // Aktif anket - oy verme (paket/restoran için oy verenlerin isimlerini de göster)
                      <View style={styles.selectionList}>
                        {(activeMealPoll.suggestions || []).map(
                          (item: any, idx: number) => {
                            const optionTitle = item.title || item;
                            const selected = dailyPollSelection === optionTitle;
                            const votes = activeMealPoll.votes || {};
                            const voteEntry = votes[optionTitle] || {};
                            const votedMemberIds = voteEntry.memberIds || [];
                            
                            // Oy veren kişilerin isimlerini al
                            const votedNames = votedMemberIds
                              .map((id: string) => {
                                const member = familyMembers.find(m => m.id === id);
                                return member?.full_name || member?.email || "Bilinmeyen";
                              })
                              .join(", ");
                            
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
                                  } else {
                                    // Oy verdikten sonra anket durumunu güncelle
                                    const pollRes = await getActiveMealPoll();
                                    setActiveMealPoll(pollRes?.poll || null);
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
                                  <Text
                                    style={[
                                      styles.selectionMeta,
                                      { color: colors.textMuted },
                                    ]}
                                  >
                                    {selected 
                                      ? "Seçildi" 
                                      : (isDeliveryRestaurant && votedNames 
                                          ? `İsteyenler: ${votedNames}` 
                                          : (isDeliveryRestaurant ? "Henüz kimse seçmedi" : null))}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          }
                        )}
                        
                        {/* Paket/restoran anketleri için "Tamam" butonu */}
                        {isDeliveryRestaurant && isParent ? (
                          <View style={styles.selectionActions}>
                            <TouchableOpacity
                              style={[
                                styles.selectionActionBtn,
                                styles.mealActionPrimary,
                                {
                                  backgroundColor: colors.primary,
                                  flex: 1,
                                  paddingVertical: 12,
                                  marginTop: 16,
                                },
                              ]}
                              onPress={() => {
                                Alert.alert(
                                  "Tamam",
                                  "Anketi tamamlayıp ilk ekrana dönmek istiyor musunuz?",
                                  [
                                    { text: "Vazgeç", style: "cancel" },
                                    {
                                      text: "Tamam",
                                      onPress: async () => {
                                        // Anketi sil ve ilk ekrana dön
                                        const res = await deleteMealPoll(activeMealPoll.id);
                                        if (res?.success) {
                                          resetMealSectionState();
                                        } else {
                                          Alert.alert("Hata", res?.error || "Anket silinemedi.");
                                        }
                                      },
                                    },
                                  ]
                                );
                              }}
                            >
                              <Text style={[styles.mealActionTextPrimary, { fontSize: 16 }]}>
                                Tamam
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      // Sonlandırılmış anket - sonuçları göster
                      <>
                      {(() => {
                        // En fazla oy alan yemeği bul
                        const votes = activeMealPoll.votes || {};
                        let maxVotes = -1;
                        let mostVotedTitle: string | null = null;
                        Object.keys(votes).forEach(key => {
                          const entry = votes[key] || {};
                          const count = entry.count || 0;
                          if (count > maxVotes) {
                            maxVotes = count;
                            mostVotedTitle = key;
                          }
                        });
                        
                        // Onaylanmış yemek varsa sadece onu göster, yoksa tüm seçenekleri göster
                        const approvedMeal = approvedMealTitle || activeMealPoll.approved_meal;
                        const suggestionsToShow = approvedMeal
                          ? (activeMealPoll.suggestions || []).filter(
                              (item: any) => (item.title || item) === approvedMeal
                            )
                          : (activeMealPoll.suggestions || []);
                        
                        return (
                          <View style={styles.selectionList}>
                            {suggestionsToShow.map((item: any, idx: number) => {
                              const optionTitle = item.title || item;
                              // missingItems'ı daha güvenli bir şekilde al
                              const missingItems = Array.isArray(item.missing) ? item.missing : (item.missingItems || []);
                              // recipe bilgisini al
                              const recipe = item.recipe || "";
                              const voteEntry = votes[optionTitle] || {};
                              const voteCount = voteEntry.count || 0;
                              const votedMemberIds = voteEntry.memberIds || [];
                              const isWinner = activeMealPoll.approved_meal === optionTitle;
                              const isMostVoted = optionTitle === mostVotedTitle;
                              
                              // Oy veren kişilerin isimlerini al
                              const votedNames = votedMemberIds
                                .map((id: string) => {
                                  const member = familyMembers.find(m => m.id === id);
                                  return member?.full_name || member?.email || "Bilinmeyen";
                                })
                                .join(", ");
                              
                              return (
                                <View key={`${activeMealPoll.id}-${idx}`}>
                                  <View
                                    style={[
                                      styles.selectionItem,
                                      {
                                        borderColor: isWinner ? colors.primary : colors.border,
                                        backgroundColor: isWinner ? colors.primary + "10" : colors.background,
                                      },
                                    ]}
                                  >
                                    {isWinner ? (
                                      (() => {
                                        const mealType = activeMealPoll.meal_type || "cook";
                                        if (mealType === "delivery") {
                                          return <Package size={20} color={colors.primary} />;
                                        } else if (mealType === "restaurant") {
                                          return <Store size={20} color={colors.primary} />;
                                        } else {
                                          return <Utensils size={20} color={colors.primary} />;
                                        }
                                      })()
                                    ) : (
                                      <Circle size={20} color={colors.border} />
                                    )}
                                    <View style={styles.selectionInfo}>
                                      <Text
                                        style={[styles.selectionName, { color: colors.text }]}
                                      >
                                        {optionTitle}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.selectionMeta,
                                          { color: colors.textMuted },
                                        ]}
                                      >
                                        {(() => {
                                          const mealType = activeMealPoll?.meal_type || "cook";
                                          // Paket servis/restoran anketlerinde "Kazanan" metni gösterilmesin
                                          if ((mealType === "delivery" || mealType === "restaurant") && isWinner) {
                                            return voteCount > 0 ? votedNames : "Henüz oy yok";
                                          }
                                          return `${voteCount > 0 ? votedNames : "Henüz oy yok"}${isWinner ? " • Kazanan" : ""}`;
                                        })()}
                                      </Text>
                                    </View>
                                    {!approvedMeal && isMostVoted && isParent && (() => {
                                      // Seçenek metninde paket/restoran kontrolü
                                      const optionLower = optionTitle.toLowerCase();
                                      const isDeliveryOption = optionLower.includes("paket") || optionLower.includes("delivery") || optionLower.includes("sipariş");
                                      const isRestaurantOption = optionLower.includes("restoran") || optionLower.includes("restaurant") || optionLower.includes("dışarı");
                                      
                                      // Eğer paket/restoran seçeneği kazandıysa, "Paket/Restoran Anketi Oluştur" butonu göster
                                      if (isDeliveryOption || isRestaurantOption) {
                                        const detectedType = isDeliveryOption ? "delivery" : "restaurant";
                                        return (
                                          <TouchableOpacity
                                            style={[
                                              styles.mealActionBtn,
                                              {
                                                backgroundColor: colors.primary,
                                                marginLeft: "auto",
                                                paddingVertical: 6,
                                                paddingHorizontal: 12,
                                              },
                                            ]}
                                            onPress={() => {
                                              // Modal'ı aç ve seçenekleri boş olarak hazırla
                                              setDeliveryRestaurantType(detectedType);
                                              setDeliveryRestaurantOptions(["", ""]);
                                              setDeliveryRestaurantPollVisible(true);
                                            }}
                                          >
                                            <Text
                                              style={{
                                                color: "#fff",
                                                fontSize: 12,
                                                fontWeight: "700",
                                              }}
                                            >
                                              {isDeliveryOption ? "Paket Anketi Oluştur" : "Restoran Anketi Oluştur"}
                                            </Text>
                                          </TouchableOpacity>
                                        );
                                      }
                                      
                                      // Normal anket için "Onayla" butonu
                                      return (
                                        <TouchableOpacity
                                          style={[
                                            styles.mealActionBtn,
                                            {
                                              backgroundColor: colors.primary,
                                              marginLeft: "auto",
                                              paddingVertical: 6,
                                              paddingHorizontal: 12,
                                              opacity: approvingMealPoll ? 0.6 : 1,
                                            },
                                          ]}
                                          onPress={async () => {
                                          setApprovingMealPoll(true);
                                          try {
                                            // meal_type'ı sakla (onaylandıktan sonra kullanmak için)
                                            const currentMealType = activeMealPoll?.meal_type || "cook";
                                            const result = await approveMealPoll(activeMealPoll.id);
                                            if (result?.success) {
                                              setApprovedMealTitle(optionTitle);
                                              // Anketi yeniden yükle (AI ile güncellenmiş missing bilgileriyle)
                                              // Kısa bir gecikme ekle (database güncellemesinin tamamlanması için)
                                              await new Promise(resolve => setTimeout(resolve, 300));
                                              const pollRes = await getActiveMealPoll();
                                              if (pollRes?.poll) {
                                                // meal_type'ı koru (eğer gelmediyse)
                                                const updatedPoll = {
                                                  ...pollRes.poll,
                                                  meal_type: pollRes.poll.meal_type || currentMealType,
                                                };
                                                setActiveMealPoll(updatedPoll);
                                              } else {
                                                // Fallback: Eğer poll gelmediyse, mevcut poll'u güncelle
                                                setActiveMealPoll({
                                                  ...activeMealPoll,
                                                  approved_meal: optionTitle,
                                                  is_approved: true,
                                                  is_active: false,
                                                  meal_type: currentMealType,
                                                });
                                              }
                                            } else {
                                              Alert.alert("Hata", result?.error || "Onaylama başarısız.");
                                            }
                                          } finally {
                                            setApprovingMealPoll(false);
                                          }
                                        }}
                                        disabled={approvingMealPoll}
                                      >
                                        <Text
                                          style={{
                                            color: "#fff",
                                            fontSize: 12,
                                            fontWeight: "700",
                                          }}
                                        >
                                          {approvingMealPoll ? "Onaylanıyor..." : "Onayla"}
                                        </Text>
                                      </TouchableOpacity>
                                      );
                                    })()}
                                  </View>
                                  {isParent && approvedMeal && optionTitle === approvedMeal && (
                                    <View style={styles.mealSuggestionActions}>
                                      {(() => {
                                        // meal_type kontrolü - eğer undefined/null ise "cook" varsayalım
                                        const mealType = activeMealPoll?.meal_type || "cook";
                                        // Paket servis veya restoran anketlerinde onaylandıktan sonra buton gösterilmesin
                                        // Sadece alttaki "Tamam" butonu kullanılacak
                                        if (mealType === "delivery" || mealType === "restaurant") {
                                          return null;
                                        }
                                        // Evde pişir için normal butonlar
                                        return (
                                          <>
                                          <TouchableOpacity
                                            style={[
                                              styles.mealActionBtn,
                                              { borderColor: colors.border },
                                            ]}
                                            onPress={() =>
                                              handleOpenRecipeConfirm(optionTitle, missingItems, recipe)
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
                                          <TouchableOpacity
                                            style={[
                                              styles.mealActionBtn,
                                              styles.mealActionPrimary,
                                              { backgroundColor: colors.primary },
                                            ]}
                                            onPress={() =>
                                              handleStartCooking(optionTitle, missingItems, recipe)
                                            }
                                          >
                                            <Text style={styles.mealActionTextPrimary}>
                                              Yemeğe Başla
                                            </Text>
                                          </TouchableOpacity>
                                          {Array.isArray(missingItems) && missingItems.length > 0 && !addedToShoppingList.has(optionTitle) && (
                                            <TouchableOpacity
                                              style={[
                                                styles.mealActionBtn,
                                                styles.mealActionPrimary,
                                                { backgroundColor: colors.primary },
                                              ]}
                                              onPress={() => {
                                                // Manuel anketten gelen yemek için direkt acil olarak ekle
                                                // Manuel anketten gelen yemekler genelde AI önerilerinden farklı bir yapıda olur
                                                // Eğer suggestion'da recipe yoksa veya missing yoksa, manuel anketten gelmiş olabilir
                                                const suggestion = activeMealPoll?.suggestions?.find((s: any) => s.title === optionTitle);
                                                const isManualPoll = !suggestion?.recipe || !suggestion?.missing || suggestion.missing.length === 0;
                                                handleAddMissingItems(missingItems, optionTitle, true, isManualPoll);
                                              }}
                                            >
                                              <Text style={styles.mealActionTextPrimary}>
                                                İstek listesine ekle
                                              </Text>
                                            </TouchableOpacity>
                                          )}
                                          <TouchableOpacity
                                            style={[
                                              styles.mealActionBtn,
                                              styles.mealActionPrimary,
                                              { backgroundColor: colors.primary },
                                            ]}
                                            onPress={async () => {
                                              // Yemeğin malzemelerini bul
                                              const approvedMeal = approvedMealTitle || activeMealPoll.approved_meal;
                                              const mealSuggestion = (activeMealPoll.suggestions || []).find(
                                                (item: any) => (item.title || item) === approvedMeal
                                              );
                                              
                                              // Malzemeleri al (missing array'inden veya tariften parse et)
                                              const missingItems = Array.isArray(mealSuggestion?.missing) 
                                                ? mealSuggestion.missing 
                                                : [];
                                              
                                              // Envanterdeki mevcut malzemeleri eşleştir
                                              const inventoryItems = data?.items || [];
                                              const ingredients: Array<{
                                                name: string;
                                                usedQuantity: string;
                                                usedUnit: string;
                                                inventoryItem?: any;
                                              }> = [];
                                              
                                              for (const missingItem of missingItems) {
                                                // Envanterde eşleşen ürünü bul
                                                const matchedInventory = inventoryItems.find((inv: any) =>
                                                  isProductMatch(inv.product_name, missingItem)
                                                );
                                                
                                                if (matchedInventory) {
                                                  // Varsayılan olarak envanterdeki miktarın tamamını kullan
                                                  ingredients.push({
                                                    name: missingItem,
                                                    usedQuantity: String(matchedInventory.quantity || "1"),
                                                    usedUnit: matchedInventory.unit || "adet",
                                                    inventoryItem: matchedInventory,
                                                  });
                                                } else {
                                                  // Envanterde yoksa varsayılan değerler
                                                  ingredients.push({
                                                    name: missingItem,
                                                    usedQuantity: "1",
                                                    usedUnit: "adet",
                                                  });
                                                }
                                              }
                                              
                                              // Eğer malzeme yoksa direkt onayla
                                              if (ingredients.length === 0) {
                                                Alert.alert(
                                                  "Yemek Hazır",
                                                  "Yemeğin hazır olduğunu onaylıyor musunuz?",
                                                  [
                                                    { text: "Vazgeç", style: "cancel" },
                                                    {
                                                      text: "Onayla",
                                                      onPress: async () => {
                                                        if (activeMealPoll?.id) {
                                                          try {
                                                            await deleteMealPoll(activeMealPoll.id, true);
                                                          } catch (error) {
                                                            console.error("Anket kapatma hatası:", error);
                                                          }
                                                        }
                                                        Alert.alert("Afiyet olsun", "", [
                                                          {
                                                            text: "Tamam",
                                                            onPress: () => {
                                                              resetMealSectionState();
                                                            },
                                                          },
                                                        ]);
                                                      },
                                                    },
                                                  ]
                                                );
                                                return;
                                              }
                                              
                                              // Modal'ı aç
                                              setFinishCookingIngredients(ingredients);
                                              setFinishCookingModalVisible(true);
                                            }}
                                          >
                                            <Text style={styles.mealActionTextPrimary}>
                                              Yemek Hazır
                                            </Text>
                                          </TouchableOpacity>
                                        </>
                                        );
                                      })()}
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        );
                      })()}
                    </>
                    );
                  })()}
                  {activeMealPoll.is_active && activeMealPoll.created_by === user?.id ? (
                    <View style={styles.selectionActions}>
                      <TouchableOpacity
                        style={[
                          styles.selectionActionBtn,
                          { borderColor: colors.error || "#ef4444", flex: 1 },
                        ]}
                        onPress={async () => {
                          Alert.alert(
                            "Anketi Sil",
                            "Bu anketi silmek istediğinize emin misiniz?",
                            [
                              { text: "Vazgeç", style: "cancel" },
                              {
                                text: "Sil",
                                style: "destructive",
                                onPress: async () => {
                                  const res = await deleteMealPoll(activeMealPoll.id);
                                  if (res?.success) {
                                    const pollRes = await getActiveMealPoll();
                                    setActiveMealPoll(pollRes?.poll || null);
                                    Alert.alert("Başarılı", "Anket silindi.");
                                  } else {
                                    Alert.alert("Hata", res?.error || "Anket silinemedi.");
                                  }
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <Text style={[styles.selectionActionText, { color: colors.error || "#ef4444" }]}>
                          Sil
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.selectionActionBtn,
                          { borderColor: colors.primary, flex: 1 },
                        ]}
                        onPress={() => {
                          // Mevcut anket verilerini modal'a yükle
                          const suggestions = activeMealPoll.suggestions || [];
                          const options = suggestions.map((s: any) => s.title || s).filter(Boolean);
                          // En az 2, en fazla 5 seçenek için array doldur
                          const optionsArray: string[] = [];
                          for (let i = 0; i < Math.max(2, Math.min(5, options.length)); i++) {
                            optionsArray.push(options[i] || "");
                          }
                          // Eğer 5'ten az varsa, boş string'ler ekle
                          while (optionsArray.length < 2) {
                            optionsArray.push("");
                          }
                          
                          setManualPollTitle(activeMealPoll.title || "Bugün ne pişirelim?");
                          setManualPollOptions(optionsArray);
                          
                          // End time formatını dönüştür (ISO -> HH:MM)
                          if (activeMealPoll.end_at) {
                            const endDate = new Date(activeMealPoll.end_at);
                            const hours = String(endDate.getHours()).padStart(2, "0");
                            const minutes = String(endDate.getMinutes()).padStart(2, "0");
                            setManualPollEndTime(`${hours}:${minutes}`);
                          } else {
                            setManualPollEndTime("12:00");
                          }
                          
                          setPollAudience(activeMealPoll.audience || "parents");
                          setPollMemberIds(activeMealPoll.member_ids || []);
                          setPollMealType(activeMealPoll.meal_type || "cook");
                          setEditingPollId(activeMealPoll.id);
                          setManualPollVisible(true);
                        }}
                      >
                        <Text style={[styles.selectionActionText, { color: colors.primary }]}>
                          Değiştir
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.selectionActionBtn,
                          { borderColor: colors.warning || "#f59e0b", flex: 1 },
                        ]}
                        onPress={async () => {
                          Alert.alert(
                            "Anketi Erken Bitir",
                            "Bu anketi şimdi sonlandırmak istediğinize emin misiniz?",
                            [
                              { text: "Vazgeç", style: "cancel" },
                              {
                                text: "Bitir",
                                style: "default",
                                onPress: async () => {
                                  const res = await endMealPoll(activeMealPoll.id);
                                  if (res?.success) {
                                    const pollRes = await getActiveMealPoll();
                                    setActiveMealPoll(pollRes?.poll || null);
                                    Alert.alert("Başarılı", "Anket sonlandırıldı.");
                                  } else {
                                    Alert.alert("Hata", res?.error || "Anket sonlandırılamadı.");
                                  }
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <Text style={[styles.selectionActionText, { color: colors.warning || "#f59e0b" }]}>
                          Erken Bitir
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={[styles.infoBody, { color: colors.textMuted, marginBottom: 16 }]}>
                    Henüz aktif anket yok.
                  </Text>
                  
                  {/* Yeni anket oluştur butonları */}
                  {isParent && (
                    <View style={{ gap: 12, marginTop: 8 }}>
                      <TouchableOpacity
                        style={[
                          styles.selectionActionBtn,
                          {
                            backgroundColor: colors.primary,
                            borderWidth: 0,
                            paddingVertical: 14,
                          },
                        ]}
                        onPress={handleMealSuggest}
                        disabled={mealLoading}
                      >
                        {mealLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Sparkles size={18} color="#fff" />
                            <Text
                              style={[
                                styles.selectionActionText,
                                {
                                  color: "#fff",
                                  marginLeft: 8,
                                  fontWeight: "600",
                                },
                              ]}
                            >
                              AI ile yemek öner
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[
                          styles.selectionActionBtn,
                          {
                            borderColor: colors.primary,
                            backgroundColor: colors.card,
                            paddingVertical: 14,
                          },
                        ]}
                        onPress={() => {
                          setManualPollTitle("Bugün ne pişirelim?");
                          setManualPollOptions(["", ""]);
                          setManualPollEndTime("12:00");
                          setPollAudience("parents");
                          setPollMemberIds([]);
                          setPollMealType("cook");
                          setEditingPollId(null);
                          setManualPollVisible(true);
                        }}
                      >
                        <Plus size={18} color={colors.primary} />
                        <Text
                          style={[
                            styles.selectionActionText,
                            {
                              color: colors.primary,
                              marginLeft: 8,
                              fontWeight: "600",
                            },
                          ]}
                        >
                          Manuel anket oluştur
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[
                          styles.selectionActionBtn,
                          {
                            borderColor: colors.primary,
                            backgroundColor: colors.card,
                            paddingVertical: 14,
                          },
                        ]}
                        onPress={() => {
                          setDeliveryRestaurantType(null);
                          setDeliveryRestaurantOptions(["", ""]);
                          setDeliveryRestaurantPollVisible(true);
                        }}
                      >
                        <Package size={18} color={colors.primary} />
                        <Text
                          style={[
                            styles.selectionActionText,
                            {
                              color: colors.primary,
                              marginLeft: 8,
                              fontWeight: "600",
                            },
                          ]}
                        >
                          Paket yada restoranda yiyelim
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>

            {isParent && mealSuggestionGroups.length > 0 && !approvedMealTitle && !activeMealPoll?.approved_meal ? (
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
                    setPublishEndTime("15:00");
                    setPollAudience("parents");
                    setPollMemberIds([]);
                    // Seçili önerilere göre otomatik meal type belirleme
                    const selections = getSelectedMealsForPublish();
                    const detectedMealType = detectMealType(
                      "Yemek anketi",
                      selections.map(s => s.title),
                      undefined
                    );
                    setPollMealType(detectedMealType);
                    setPublishModalVisible(true);
                  }}
                >
                  <Text style={styles.mealPublishText}>Anketi yayınla</Text>
                </TouchableOpacity>
              </View>
            ) : null}
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

              <Text style={[styles.modalHint, { color: colors.textMuted, marginBottom: 8 }]}>
                Anket bitiş saati (yerel)
              </Text>
              <View style={[styles.timePickerContainer, { borderColor: colors.border }]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.timePickerScroll}
                >
                  {Array.from({ length: 8 }, (_, i) => {
                    const hour = 15 + i;
                    const timeStr = `${String(hour).padStart(2, "0")}:00`;
                    const isSelected = publishEndTime === timeStr;
                    return (
                      <TouchableOpacity
                        key={timeStr}
                        style={[
                          styles.timeOption,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.card,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setPublishEndTime(timeStr)}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            { color: isSelected ? "#fff" : colors.text },
                          ]}
                        >
                          {timeStr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

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
                    const endAt = resolveEndAt(publishEndTime);
                    const selections = getSelectedMealsForPublish();
                    const missing = selections
                      .flatMap(item => item.missing || [])
                      .filter(Boolean);
                    
                    // En az bir seçenek olmalı
                    if (selections.length === 0) {
                      Alert.alert("Hata", "En az bir anket seçeneği gerekli.");
                      return;
                    }
                    
                    // AI anketi için meal_type her zaman "cook"
                    const finalMealType = "cook";
                    
                    const createRes = await createMealPoll({
                      title: "Yemek anketi",
                      suggestions: selections,
                      missingItems: missing,
                      extraNotes: "",
                      endAt,
                      audience: pollAudience,
                      memberIds: pollMemberIds,
                      mealType: finalMealType,
                    });
                    if (createRes.error) {
                      Alert.alert("Hata", createRes.error);
                      return;
                    }
                    // Yeni oluşturulan anketi direkt state'e set et
                    if (createRes.poll) {
                      setActiveMealPoll(createRes.poll);
                    } else {
                      // Fallback: Eğer poll döndürülmediyse getActiveMealPoll ile al
                      const pollRes = await getActiveMealPoll();
                      setActiveMealPoll(pollRes?.poll || null);
                    }
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
                {editingPollId ? "Anketi Düzenle" : "Manuel Anket Paylaş"}
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
              <Text style={[styles.modalHint, { color: colors.textMuted, marginBottom: 8 }]}>
                Anket seçenekleri (en fazla 5)
              </Text>
              {manualPollOptions.map((option, index) => (
                <ModernInput
                  key={index}
                  label={`Seçenek ${index + 1}`}
                  value={option}
                  onChangeText={(text) => {
                    const newOptions = [...manualPollOptions];
                    newOptions[index] = text;
                    // Eğer bu son input doluysa ve 5'ten az seçenek varsa yeni boş input ekle
                    if (text.trim() && index === newOptions.length - 1 && newOptions.length < 5) {
                      newOptions.push("");
                    }
                    setManualPollOptions(newOptions);
                  }}
                  placeholder={`Örn: ${index === 0 ? "Menemen" : index === 1 ? "Mercimek çorbası" : "Yemek adı"}`}
                />
              ))}
              <Text style={[styles.modalHint, { color: colors.textMuted, marginBottom: 8 }]}>
                Anket bitiş saati (yerel)
              </Text>
              <View style={[styles.timePickerContainer, { borderColor: colors.border }]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.timePickerScroll}
                >
                  {Array.from({ length: 11 }, (_, i) => {
                    const hour = 12 + i;
                    const timeStr = `${String(hour).padStart(2, "0")}:00`;
                    const isSelected = manualPollEndTime === timeStr;
                    return (
                      <TouchableOpacity
                        key={timeStr}
                        style={[
                          styles.timeOption,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.card,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setManualPollEndTime(timeStr)}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            { color: isSelected ? "#fff" : colors.text },
                          ]}
                        >
                          {timeStr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { borderColor: colors.border }]}
                  onPress={() => {
                    setManualPollVisible(false);
                    setEditingPollId(null);
                  }}
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
                      .map(v => v.trim())
                      .filter(Boolean);
                    if (pollOptions.length < 2) {
                      Alert.alert(
                        "Eksik",
                        "En az 2 anket seçeneği girin."
                      );
                      return;
                    }
                    const endAt = resolveEndAt(manualPollEndTime);
                    const suggestions = pollOptions.map(title => ({
                      title,
                      missing: [],
                    }));
                    
                    let result;
                    if (editingPollId) {
                      // Düzenleme modu - kullanıcı seçimini koru
                      result = await updateMealPoll(editingPollId, {
                        title: manualPollTitle.trim() || "Yemek anketi",
                        suggestions,
                        missingItems: [],
                        endAt,
                        audience: pollAudience,
                        memberIds: pollMemberIds,
                        mealType: pollMealType,
                      });
                      if (result.error) {
                        Alert.alert("Hata", result.error);
                        return;
                      }
                      // Güncellenmiş anketi state'e set et
                      if (result.poll) {
                        setActiveMealPoll(result.poll);
                      } else {
                        const pollRes = await getActiveMealPoll();
                        setActiveMealPoll(pollRes?.poll || null);
                      }
                      Alert.alert("Başarılı", "Anket güncellendi.");
                    } else {
                      // Yeni anket oluşturma - meal_type her zaman "cook"
                      result = await createMealPoll({
                        title: manualPollTitle.trim() || "Yemek anketi",
                        suggestions,
                        missingItems: [],
                        endAt,
                        audience: pollAudience,
                        memberIds: pollMemberIds,
                        mealType: "cook",
                      });
                      if (result.error) {
                        Alert.alert("Hata", result.error);
                        return;
                      }
                      Alert.alert("Başarılı", "Anket yayınlandı.");
                    }
                    
                    // Yeni oluşturulan anketi direkt state'e set et
                    if (result.poll) {
                      setActiveMealPoll(result.poll);
                    } else {
                      // Fallback: Eğer poll döndürülmediyse getActiveMealPoll ile al
                      const pollRes = await getActiveMealPoll();
                      setActiveMealPoll(pollRes?.poll || null);
                    }
                    setMealSuggestionGroups([]);
                    setSelectedSuggestionIds([]);
                    setEditingPollId(null);
                    setManualPollVisible(false);
                  }}
                >
                  <Text style={styles.modalButtonTextPrimary}>
                    {editingPollId ? "Güncelle" : "Yayınla"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Restoran/Paket Servis Anket Modal */}
      <Modal
        visible={deliveryRestaurantPollVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeliveryRestaurantPollVisible(false)}
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
                Restoran/Paket Servis Anketi
              </Text>

              {!deliveryRestaurantType ? (
                <>
                  <Text style={[styles.modalHint, { color: colors.textMuted, marginBottom: 16 }]}>
                    Anket türünü seçin
                  </Text>
                  <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
                    <TouchableOpacity
                      style={[
                        styles.selectionActionBtn,
                        {
                          flex: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.card,
                        },
                      ]}
                      onPress={() => {
                        setDeliveryRestaurantType("delivery");
                        setDeliveryRestaurantOptions(["", ""]);
                      }}
                    >
                      <Package size={20} color={colors.primary} />
                      <Text
                        style={[
                          styles.selectionActionText,
                          {
                            color: colors.text,
                            marginLeft: 6,
                          },
                        ]}
                      >
                        Paket Servis
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.selectionActionBtn,
                        {
                          flex: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.card,
                        },
                      ]}
                      onPress={() => {
                        setDeliveryRestaurantType("restaurant");
                        setDeliveryRestaurantOptions(["", ""]);
                      }}
                    >
                      <Store size={20} color={colors.primary} />
                      <Text
                        style={[
                          styles.selectionActionText,
                          {
                            color: colors.text,
                            marginLeft: 6,
                          },
                        ]}
                      >
                        Restoran
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.modalHint, { color: colors.textMuted, marginBottom: 16 }]}>
                    {deliveryRestaurantType === "delivery" 
                      ? "Dışarıdan ne söylemek istesiniz?" 
                      : "Hangi restoran?"}
                  </Text>
                  
                  {deliveryRestaurantOptions.map((option, idx) => (
                    <View key={idx} style={{ marginBottom: 12 }}>
                      <ModernInput
                        label={`Seçenek ${idx + 1}`}
                        value={option}
                        onChangeText={(text) => {
                          const newOptions = [...deliveryRestaurantOptions];
                          newOptions[idx] = text;
                          // Eğer ilk seçenek doldurulduysa ve son seçenek değilse, yeni bir boş seçenek ekle
                          if (text && idx === deliveryRestaurantOptions.length - 1 && deliveryRestaurantOptions.length < 5) {
                            newOptions.push("");
                          }
                          setDeliveryRestaurantOptions(newOptions);
                        }}
                        placeholder={deliveryRestaurantType === "delivery" ? "Örn: Pizza" : "Örn: Pizza Hut"}
                      />
                    </View>
                  ))}

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        { borderColor: colors.border, flex: 1 },
                      ]}
                      onPress={() => setDeliveryRestaurantType(null)}
                    >
                      <Text style={[styles.modalButtonText, { color: colors.text }]}>
                        Geri
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        { borderColor: colors.border, flex: 1 },
                      ]}
                      onPress={() => {
                        setDeliveryRestaurantType(null);
                        setDeliveryRestaurantOptions(["", ""]);
                        setDeliveryRestaurantPollVisible(false);
                      }}
                    >
                      <Text style={[styles.modalButtonText, { color: colors.text }]}>
                        Vazgeç
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {deliveryRestaurantType && (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.modalButtonPrimary,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={async () => {
                      const filteredOptions = deliveryRestaurantOptions.filter(opt => opt.trim());
                      if (filteredOptions.length < 2) {
                        Alert.alert("Hata", "En az 2 seçenek gereklidir.");
                        return;
                      }

                      // meal_type kontrolü
                      if (!deliveryRestaurantType || (deliveryRestaurantType !== "delivery" && deliveryRestaurantType !== "restaurant")) {
                        Alert.alert("Hata", "Anket türü seçilmemiş.");
                        return;
                      }

                      const endAt = resolveEndAt("15:00");
                      const suggestions = filteredOptions.map(title => ({ title, missing: [] }));

                      const createRes = await createMealPoll({
                        title: "Yemek anketi",
                        suggestions,
                        missingItems: [],
                        extraNotes: undefined,
                        endAt,
                        audience: "parents",
                        memberIds: [],
                        mealType: deliveryRestaurantType, // "delivery" veya "restaurant"
                      });

                      if (createRes.error) {
                        Alert.alert("Hata", createRes.error);
                        return;
                      }

                      if (createRes.poll) {
                        setActiveMealPoll(createRes.poll);
                      } else {
                        const pollRes = await getActiveMealPoll();
                        setActiveMealPoll(pollRes?.poll || null);
                      }

                      setDeliveryRestaurantType(null);
                      setDeliveryRestaurantOptions(["", ""]);
                      setDeliveryRestaurantPollVisible(false);
                      Alert.alert("Başarılı", "Anket yayınlandı.");
                    }}
                  >
                    <Text style={styles.modalButtonTextPrimary}>Yayınla</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={finishCookingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFinishCookingModalVisible(false)}
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
                Kullanılan Malzemeler
              </Text>
              <Text style={[styles.modalHint, { color: colors.textMuted, marginBottom: 16 }]}>
                Yemek hazır! Kullandığınız malzeme miktarlarını düzenleyin.
              </Text>

              {finishCookingIngredients.map((ingredient, index) => (
                <View
                  key={index}
                  style={[
                    {
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 12,
                    },
                  ]}
                >
                  <Text style={[styles.modalHint, { color: colors.text, marginBottom: 8, fontWeight: "700" }]}>
                    {ingredient.name}
                  </Text>
                  {ingredient.inventoryItem && (
                    <Text style={[styles.modalHint, { color: colors.textMuted, fontSize: 11, marginBottom: 8 }]}>
                      Envanterde: {ingredient.inventoryItem.quantity} {ingredient.inventoryItem.unit}
                    </Text>
                  )}
                  <View style={styles.modalRow}>
                    <View style={{ flex: 1 }}>
                      <ModernInput
                        label="Kullanılan Miktar"
                        value={ingredient.usedQuantity}
                        onChangeText={(text) => {
                          const newIngredients = [...finishCookingIngredients];
                          newIngredients[index].usedQuantity = text;
                          setFinishCookingIngredients(newIngredients);
                        }}
                        placeholder="1"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ModernInput
                        label="Birim"
                        value={ingredient.usedUnit}
                        onChangeText={(text) => {
                          const newIngredients = [...finishCookingIngredients];
                          newIngredients[index].usedUnit = text;
                          setFinishCookingIngredients(newIngredients);
                        }}
                        placeholder="adet / kg / gr"
                      />
                    </View>
                  </View>
                </View>
              ))}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { borderColor: colors.border }]}
                  onPress={() => setFinishCookingModalVisible(false)}
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
                    // Her malzeme için envanterden düş
                    let hasError = false;
                    for (const ingredient of finishCookingIngredients) {
                      const usedQty = Number(ingredient.usedQuantity);
                      if (isNaN(usedQty) || usedQty <= 0) {
                        Alert.alert("Hata", `"${ingredient.name}" için geçerli bir miktar girin.`);
                        hasError = true;
                        break;
                      }

                      const result = await reduceInventoryQuantity(
                        ingredient.name,
                        usedQty,
                        ingredient.usedUnit
                      );

                      if (result.error) {
                        Alert.alert("Hata", result.error);
                        hasError = true;
                        break;
                      }
                    }

                    if (hasError) return;

                    // Anketi kapat
                    if (activeMealPoll?.id) {
                      try {
                        await deleteMealPoll(activeMealPoll.id, true);
                      } catch (error) {
                        console.error("Anket kapatma hatası:", error);
                      }
                    }

                    setFinishCookingModalVisible(false);
                    Alert.alert("Afiyet olsun", "", [
                      {
                        text: "Tamam",
                        onPress: () => {
                          resetMealSectionState();
                        },
                      },
                    ]);
                  }}
                >
                  <Text style={styles.modalButtonTextPrimary}>Onayla</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={shoppingFilterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShoppingFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
          activeOpacity={1}
          onPress={() => setShoppingFilterModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.modalCard,
              isLight && styles.surfaceLift,
              { backgroundColor: colors.card, width: "100%", maxWidth: 400 },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Filtrele
            </Text>
            
            <Text style={[styles.modalHint, { color: colors.textMuted, marginBottom: 8 }]}>
              Durum
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, alignItems: "center" }}>
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
                        flex: option.id === "done" ? 1.3 : 1,
                        backgroundColor: isActive
                          ? colors.primary
                          : colors.card,
                        borderColor: isActive ? colors.primary : colors.border,
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 44,
                        paddingHorizontal: 8,
                      },
                    ]}
                    onPress={() => setShoppingStatus(option.id as "all" | "active" | "done")}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { 
                          color: isActive ? "#fff" : colors.text, 
                          textAlign: "center",
                          fontSize: option.id === "done" ? 11 : 12,
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.modalHint, { color: colors.textMuted, marginBottom: 8 }]}>
              Öncelik
            </Text>
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
                  marginBottom: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 44,
                },
              ]}
              onPress={() => setShoppingUrgentOnly(prev => !prev)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: shoppingUrgentOnly ? "#fff" : colors.text, textAlign: "center" },
                ]}
              >
                Sadece Acil Ürünler
              </Text>
            </TouchableOpacity>

            <Text style={[styles.modalHint, { color: colors.textMuted, marginBottom: 8 }]}>
              Sıralama
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { id: "date_desc", label: "Yeni → Eski" },
                { id: "date_asc", label: "Eski → Yeni" },
                { id: "name_az", label: "A-Z" },
                { id: "name_za", label: "Z-A" },
              ].map(option => {
                const isActive = false; // Burada sıralama state'i eklenebilir
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
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 44,
                        flex: 1,
                        minWidth: "47%",
                      },
                    ]}
                    onPress={() => {
                      // Sıralama işlemi burada yapılabilir
                    }}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isActive ? "#fff" : colors.text, textAlign: "center" },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => setShoppingFilterModalVisible(false)}
              >
                <Text style={styles.modalButtonTextPrimary}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
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
                              navigation.navigate("Recipe", {
                                title: recipeConfirmTitle,
                              });
                            },
                          },
                        ]
                      );
                      return;
                    }
                    setRecipeConfirmVisible(false);
                    navigation.navigate("Recipe", { title: recipeConfirmTitle });
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

  // YENİ BUTON KONUMLANDIRMASI (Özet ekranıyla aynı yükseklik: 85/75)
  fabWrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 98 : 88,
    right: 12,
    flexDirection: "column",
    gap: 12,
  },
  fabInventoryOffset: {
    bottom: Platform.OS === "ios" ? 98 : 88,
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
  timePickerContainer: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    marginBottom: 12,
  },
  timePickerScroll: {
    paddingHorizontal: 4,
    gap: 8,
  },
  timeOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 70,
    alignItems: "center",
  },
  timeOptionText: {
    fontSize: 14,
    fontWeight: "700",
  },
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
