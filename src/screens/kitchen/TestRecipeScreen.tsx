import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";

export default function TestRecipeScreen({ navigation, route }: any) {
  const { colors, themeMode } = useTheme();
  const isLight = themeMode === "light";
  const title = route?.params?.title || "Tavuk sote";
  const showCookingButton = route?.params?.showCookingButton !== false; // Default true
  const recipeText = route?.params?.recipe || "";
  const missingItems = route?.params?.missingItems || [];

  const [cookingActive, setCookingActive] = useState(false);
  const [cookingElapsed, setCookingElapsed] = useState(0);
  const [cookingStepIndex, setCookingStepIndex] = useState(0);
  const [cookingStartAt, setCookingStartAt] = useState<number | null>(null);
  const cookingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cookingNotifIdsRef = useRef<string[]>([]);

  // Recipe'yi parse et ve cookingSteps'e çevir
  const cookingSteps = useMemo(() => {
    if (recipeText) {
      // Recipe metnini satırlara böl ve her satırı bir adım olarak kabul et
      const lines = recipeText.split('\n').filter((line: string) => line.trim());
      return lines.map((line: string, index: number) => {
        // Her adım için varsayılan süre (5 dakika)
        // Eğer satırda dakika bilgisi varsa onu kullan
        const minuteMatch = line.match(/(\d+)\s*(?:dakika|dk|minute|min)/i);
        const seconds = minuteMatch ? parseInt(minuteMatch[1]) * 60 : 300;
        return {
          title: line.trim(),
          seconds: seconds,
        };
      });
    }
    // Fallback: Eğer recipe yoksa varsayılan adımları kullan
    return [
      { title: "Tavukları yüksek ateşte sotele", seconds: 300 },
      { title: "Soğan ve biberi ekle", seconds: 300 },
      { title: "Baharatla ve 2-3 dk pişir", seconds: 180 },
      { title: "Ocaktan al ve servis et", seconds: 0 },
    ];
  }, [recipeText]);

  const getCookingTotalSeconds = () =>
    cookingSteps.reduce((acc: number, step: any) => acc + step.seconds, 0);

  const getStepIndexByElapsed = (elapsed: number) => {
    let acc = 0;
    for (let i = 0; i < cookingSteps.length; i += 1) {
      const stepSeconds = cookingSteps[i].seconds;
      if (elapsed < acc + stepSeconds) {
        return i;
      }
      acc += stepSeconds;
    }
    return cookingSteps.length - 1;
  };

  const getStepRemainingSeconds = (elapsed: number) => {
    let acc = 0;
    for (let i = 0; i < cookingSteps.length; i += 1) {
      const stepSeconds = cookingSteps[i].seconds;
      if (elapsed < acc + stepSeconds) {
        return acc + stepSeconds - elapsed;
      }
      acc += stepSeconds;
    }
    return 0;
  };

  const formatTimer = (seconds: number) => {
    const safe = Math.max(0, seconds);
    const min = Math.floor(safe / 60);
    const sec = safe % 60;
    return `${min}:${String(sec).padStart(2, "0")}`;
  };

  const ensureNotificationPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") return true;
    const res = await Notifications.requestPermissionsAsync();
    return res.status === "granted";
  };

  const cancelCookingNotifications = async () => {
    const ids = cookingNotifIdsRef.current;
    cookingNotifIdsRef.current = [];
    await Promise.all(
      ids.map(id => Notifications.cancelScheduledNotificationAsync(id))
    );
  };

  const handleStopCooking = async () => {
    setCookingActive(false);
    setCookingElapsed(0);
    setCookingStepIndex(0);
    setCookingStartAt(null);
    if (cookingTimerRef.current) {
      clearInterval(cookingTimerRef.current);
      cookingTimerRef.current = null;
    }
    await cancelCookingNotifications();
    await AsyncStorage.removeItem("@kitchen_cooking_state");
  };

  const handleStartCooking = async () => {
    const ok = await ensureNotificationPermission();
    if (!ok) {
      Alert.alert(
        "Bildirim izni gerekli",
        "Ekran kapalıyken hatırlatma için bildirim izni verin."
      );
    }
    await cancelCookingNotifications();
    const startAt = Date.now();
    setCookingActive(true);
    setCookingElapsed(0);
    setCookingStepIndex(0);
    setCookingStartAt(startAt);
    await AsyncStorage.setItem(
      "@kitchen_cooking_state",
      JSON.stringify({ active: true, startAt })
    );

    let accSeconds = 0;
    const notifIds: string[] = [];
    
    // Her adımın sonunda bildirim gönder
    for (let i = 0; i < cookingSteps.length; i += 1) {
      const step = cookingSteps[i];
      accSeconds += step.seconds;
      
      // Adımın sonunda bildirim gönder
      const triggerSeconds = Math.max(1, accSeconds);
      const nextStep = cookingSteps[i + 1];
      const bodyText = nextStep
        ? `Adım ${i + 1} tamamlandı. Şimdi: ${nextStep.title}`
        : "Tüm adımlar tamamlandı!";
      
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Mutfak asistanı",
          body: bodyText,
          sound: "default",
        },
        trigger: {
          type: "timeInterval",
          seconds: triggerSeconds,
          repeats: false,
        } as Notifications.TimeIntervalTriggerInput,
      });
      notifIds.push(id);
    }
    
    // Yemek hazır bildirimi
    const finishId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Mutfak asistanı",
        body: "Yemek hazır, afiyet olsun!",
        sound: "default",
      },
      trigger: {
        type: "timeInterval",
        seconds: Math.max(1, accSeconds),
        repeats: false,
      } as Notifications.TimeIntervalTriggerInput,
    });
    notifIds.push(finishId);
    cookingNotifIdsRef.current = notifIds;
  };

  const handleFinishCooking = async () => {
    await handleStopCooking();
    navigation.navigate("Kitchen", { resetMeal: true });
  };

  useEffect(() => {
    const restoreCookingState = async () => {
      const raw = await AsyncStorage.getItem("@kitchen_cooking_state");
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (!parsed?.active || !parsed?.startAt) {
          return;
        }
        const elapsed = Math.floor((Date.now() - parsed.startAt) / 1000);
        const total = getCookingTotalSeconds();
        if (elapsed >= total) {
          await AsyncStorage.removeItem("@kitchen_cooking_state");
          return;
        }
        setCookingStartAt(parsed.startAt);
        setCookingActive(true);
        setCookingElapsed(elapsed);
        setCookingStepIndex(getStepIndexByElapsed(elapsed));
      } catch (error) {
        await AsyncStorage.removeItem("@kitchen_cooking_state");
      }
    };
    restoreCookingState();
  }, []);

  useEffect(() => {
    if (!cookingActive || !cookingStartAt) return undefined;
    if (cookingTimerRef.current) {
      clearInterval(cookingTimerRef.current);
    }
    cookingTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - cookingStartAt) / 1000);
      const total = getCookingTotalSeconds();
      if (elapsed >= total) {
        handleStopCooking();
        setCookingElapsed(total);
        return;
      }
      setCookingElapsed(elapsed);
      setCookingStepIndex(getStepIndexByElapsed(elapsed));
    }, 1000);
    return () => {
      if (cookingTimerRef.current) {
        clearInterval(cookingTimerRef.current);
        cookingTimerRef.current = null;
      }
    };
  }, [cookingActive, cookingStartAt]);

  const cookingTotalSeconds = getCookingTotalSeconds();
  const cookingRemainingSeconds = cookingTotalSeconds - cookingElapsed;
  const currentCookingStep =
    cookingSteps[Math.min(cookingStepIndex, cookingSteps.length - 1)];
  const currentStepRemainingSeconds = getStepRemainingSeconds(cookingElapsed);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.backBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ChevronLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Tarif</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.formCard,
              { backgroundColor: colors.card, shadowColor: "#000" },
            ]}
          >
            <View style={styles.recipeHeader}>
              <Text style={[styles.recipeTitle, { color: colors.text }]}>
                {title}
              </Text>
              <Text style={[styles.recipeSubtitle, { color: colors.textMuted }]}>
                Hızlı • Pratik • Günlük
              </Text>
            </View>
            <View
              style={[
                styles.recipeHero,
                { backgroundColor: isLight ? "#f8fafc" : colors.surface },
              ]}
            >
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1604909054103-4a6d7408d0b9?auto=format&fit=crop&w=1200&q=80",
                }}
                style={styles.recipeHeroImage}
              />
              <View style={styles.recipeHeroOverlay} />
              <Text style={[styles.recipeHeroText, { color: "#fff" }]}>{title}</Text>
            </View>
            <View style={styles.recipeMetaRow}>
              {["Hazırlık 10 dk", "Pişirme 15 dk", "2 kişilik", "380 kcal"].map(
                item => (
                  <View
                    key={item}
                    style={[styles.recipeMetaChip, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.recipeMetaText, { color: colors.text }]}>
                      {item}
                    </Text>
                  </View>
                )
              )}
            </View>
            <View style={styles.recipeTagRow}>
              {["Protein", "Glutensiz", "Hafif"].map(tag => (
                <View
                  key={tag}
                  style={[
                    styles.recipeTagChip,
                    { backgroundColor: isLight ? "#eef2ff" : "#1f2a44" },
                  ]}
                >
                  <Text style={[styles.recipeTagText, { color: colors.text }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
            <View
              style={[
                styles.recipeSection,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <Text style={[styles.recipeSectionTitle, { color: colors.text }]}>
                Malzemeler
              </Text>
              <View style={styles.recipeList}>
                {missingItems.length > 0 ? (
                  missingItems.map((item: string, index: number) => (
                    <Text
                      key={index}
                      style={[styles.recipeListItem, { color: colors.textMuted }]}
                    >
                      • {item}
                    </Text>
                  ))
                ) : (
                  [
                    "300g tavuk göğsü",
                    "1 adet soğan",
                    "1 adet yeşil biber",
                    "1 yemek kaşığı yağ",
                    "Tuz, karabiber",
                  ].map(item => (
                    <Text
                      key={item}
                      style={[styles.recipeListItem, { color: colors.textMuted }]}
                    >
                      • {item}
                    </Text>
                  ))
                )}
              </View>
            </View>
            <View
              style={[
                styles.recipeSection,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <Text style={[styles.recipeSectionTitle, { color: colors.text }]}>
                Yapılışı
              </Text>
              <View style={styles.recipeSteps}>
                {recipeText ? (
                  recipeText.split('\n').filter((line: string) => line.trim()).map((step: string, idx: number) => (
                    <View key={idx} style={styles.recipeStepRow}>
                      <View
                        style={[
                          styles.recipeStepIndex,
                          { borderColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[styles.recipeStepIndexText, { color: colors.text }]}
                        >
                          {idx + 1}
                        </Text>
                      </View>
                      <Text style={[styles.recipeStepText, { color: colors.text }]}>
                        {step.trim()}
                      </Text>
                    </View>
                  ))
                ) : (
                  [
                    "Tavukları kuşbaşı doğrayıp sotele.",
                    "Soğan ve biberi ekleyip yumuşayana kadar pişir.",
                    "Baharatları ekleyip 2-3 dk daha karıştır.",
                  ].map((step: string, idx: number) => (
                    <View key={step} style={styles.recipeStepRow}>
                      <View
                        style={[
                          styles.recipeStepIndex,
                          { borderColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[styles.recipeStepIndexText, { color: colors.text }]}
                        >
                          {idx + 1}
                        </Text>
                      </View>
                      <Text
                        style={[styles.recipeStepText, { color: colors.textMuted }]}
                      >
                        {step}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
            <View
              style={[
                styles.recipeSection,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <Text style={[styles.recipeSectionTitle, { color: colors.text }]}>
                Pişirme asistanı
              </Text>
              <Text
                style={[styles.recipeAssistantText, { color: colors.textMuted, marginBottom: 16 }]}
              >
                Ekran kapalıyken hatırlatma için bildirimle uyarır.
              </Text>
              
              {/* Toplam süre bilgisi */}
              <View style={[styles.recipeAssistantRow, { marginBottom: 16 }]}>
                <View style={styles.recipeAssistantInfo}>
                  <Text
                    style={[
                      styles.recipeAssistantLabel,
                      { color: colors.textMuted },
                    ]}
                  >
                    Toplam süre
                  </Text>
                  <Text style={[styles.recipeAssistantValue, { color: colors.text }]}>
                    {formatTimer(cookingTotalSeconds)}
                  </Text>
                </View>
                <View style={styles.recipeAssistantInfo}>
                  <Text
                    style={[
                      styles.recipeAssistantLabel,
                      { color: colors.textMuted },
                    ]}
                  >
                    {cookingActive ? "Kalan süre" : "Başlamak için"}
                  </Text>
                  <Text style={[styles.recipeAssistantValue, { color: colors.text }]}>
                    {cookingActive
                      ? formatTimer(cookingRemainingSeconds)
                      : formatTimer(cookingTotalSeconds)}
                  </Text>
                </View>
              </View>

              {/* Adımlar listesi */}
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.recipeAssistantLabel, { color: colors.textMuted, marginBottom: 12 }]}>
                  Adımlar
                </Text>
                {cookingSteps.map((step: any, index: number) => {
                  const stepStartTime = cookingSteps.slice(0, index).reduce((acc: number, s: any) => acc + s.seconds, 0);
                  const stepEndTime = stepStartTime + step.seconds;
                  const isActive = cookingActive && cookingStepIndex === index;
                  const isCompleted = cookingActive && cookingStepIndex > index;
                  const isCurrentStep = cookingActive && cookingElapsed >= stepStartTime && cookingElapsed < stepEndTime;
                  
                  return (
                    <View
                      key={index}
                      style={[
                        {
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          marginBottom: 8,
                          borderRadius: 8,
                          backgroundColor: isActive || isCurrentStep
                            ? colors.primary + "15"
                            : isCompleted
                            ? colors.surface
                            : "transparent",
                          borderWidth: 1,
                          borderColor: isActive || isCurrentStep
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: isCompleted
                            ? colors.primary
                            : isActive || isCurrentStep
                            ? colors.primary
                            : colors.surface,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        {isCompleted ? (
                          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
                            ✓
                          </Text>
                        ) : (
                          <Text
                            style={{
                              color: isActive || isCurrentStep ? "#fff" : colors.textMuted,
                              fontWeight: "bold",
                              fontSize: 14,
                            }}
                          >
                            {index + 1}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: isActive || isCurrentStep ? colors.primary : colors.text,
                            fontWeight: isActive || isCurrentStep ? "600" : "400",
                            fontSize: 14,
                            marginBottom: 4,
                          }}
                        >
                          {step.title}
                        </Text>
                        <Text
                          style={{
                            color: colors.textMuted,
                            fontSize: 12,
                          }}
                        >
                          {formatTimer(step.seconds)}
                        </Text>
                      </View>
                      {(isActive || isCurrentStep) && (
                        <View style={{ marginLeft: 8 }}>
                          <Text
                            style={{
                              color: colors.primary,
                              fontWeight: "600",
                              fontSize: 12,
                            }}
                          >
                            {formatTimer(
                              cookingActive
                                ? Math.max(0, stepEndTime - cookingElapsed)
                                : step.seconds
                            )}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
              {showCookingButton && (
                <View style={styles.recipeAssistantActions}>
                  {cookingActive ? (
                    <TouchableOpacity
                      style={[
                        styles.saveBtn,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                      onPress={handleStopCooking}
                    >
                      <Text style={[styles.saveBtnText, { color: colors.text }]}>
                        Durdur
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.saveBtn,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={handleStartCooking}
                    >
                      <Text style={styles.saveBtnText}>Yemek yapmaya başla</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            <View
              style={[
                styles.recipeSection,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <Text style={[styles.recipeSectionTitle, { color: colors.text }]}>
                Püf noktası
              </Text>
              <Text style={[styles.recipeTipText, { color: colors.textMuted }]}>
                Tavukları yüksek ateşte kısa süre soteleyin; suyunu salmadan yumuşak
                kalır.
              </Text>
            </View>
            <View
              style={[
                styles.recipeSection,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <Text style={[styles.recipeSectionTitle, { color: colors.text }]}>
                Servis önerisi
              </Text>
              <Text style={[styles.recipeTipText, { color: colors.textMuted }]}>
                Yanına sade pilav ve yeşil salata önerilir.
              </Text>
            </View>
            <View
              style={[
                styles.recipeSection,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <Text style={[styles.recipeSectionTitle, { color: colors.text }]}>
                Yaklaşık maliyet
              </Text>
              <Text style={[styles.recipeTipText, { color: colors.textMuted }]}>
                2 kişilik ortalama 140–180 TL
              </Text>
            </View>
            <View
              style={[
                styles.recipeSection,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <Text style={[styles.recipeSectionTitle, { color: colors.text }]}>
                Besin değeri (1 porsiyon)
              </Text>
              <View style={styles.recipeNutritionRow}>
                {[
                  ["Protein", "32g"],
                  ["Karbonhidrat", "12g"],
                  ["Yağ", "18g"],
                ].map(item => (
                  <View
                    key={item[0]}
                    style={[
                      styles.recipeNutritionCard,
                      { borderColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.recipeNutritionLabel,
                        { color: colors.textMuted },
                      ]}
                    >
                      {item[0]}
                    </Text>
                    <Text
                      style={[styles.recipeNutritionValue, { color: colors.text }]}
                    >
                      {item[1]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <View
              style={[
                styles.recipeSection,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <Text style={[styles.recipeSectionTitle, { color: colors.text }]}>
                Alerjen uyarısı
              </Text>
              <Text style={[styles.recipeTipText, { color: colors.textMuted }]}>
                Alerjen yok. Baharat karışımı kullanıyorsanız içeriğini kontrol edin.
              </Text>
            </View>
            <View
              style={[
                styles.recipeSection,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <Text style={[styles.recipeSectionTitle, { color: colors.text }]}>
                Notlar
              </Text>
              <Text style={[styles.recipeTipText, { color: colors.textMuted }]}>
                Dilerseniz mantar ekleyebilirsiniz.
              </Text>
            </View>
            <View style={{ height: 120 }} />
          </View>
        </ScrollView>

        {cookingActive && cookingElapsed < cookingTotalSeconds ? (
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
              onPress={handleFinishCooking}
            >
              <Text style={styles.saveBtnText}>Yemeği bitirdim</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  scrollContainer: {
    paddingHorizontal: 6,
    paddingTop: 8,
  },
  formCard: {
    borderRadius: 28,
    padding: 18,
    width: "100%",
    alignSelf: "stretch",
    maxWidth: 640,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    gap: 8,
  },
  recipeHeader: { alignItems: "flex-start", gap: 4 },
  recipeTitle: { fontSize: 20, fontWeight: "800" },
  recipeSubtitle: { fontSize: 12, fontWeight: "600" },
  recipeHero: {
    marginTop: 12,
    height: 160,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  recipeHeroImage: { width: "100%", height: "100%" },
  recipeHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  recipeHeroText: { fontSize: 14, fontWeight: "700", position: "absolute" },
  recipeMetaRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  recipeMetaChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  recipeMetaText: { fontSize: 12, fontWeight: "700" },
  recipeTagRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  recipeTagChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  recipeTagText: { fontSize: 12, fontWeight: "700" },
  recipeSection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  recipeSectionTitle: { fontSize: 14, fontWeight: "800", marginBottom: 8 },
  recipeList: { gap: 6 },
  recipeListItem: { fontSize: 12, lineHeight: 18 },
  recipeSteps: { gap: 10 },
  recipeStepRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  recipeStepIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeStepIndexText: { fontSize: 12, fontWeight: "700" },
  recipeStepText: { flex: 1, fontSize: 12, lineHeight: 18 },
  recipeTipText: { fontSize: 12, lineHeight: 18 },
  recipeAssistantText: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  recipeAssistantRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  recipeAssistantInfo: {
    flexBasis: "30%",
    gap: 4,
  },
  recipeAssistantLabel: { fontSize: 11, fontWeight: "600" },
  recipeAssistantValue: { fontSize: 12, fontWeight: "700" },
  recipeAssistantActions: { marginTop: 12 },
  recipeNutritionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  recipeNutritionCard: {
    flexBasis: "30%",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  recipeNutritionLabel: { fontSize: 11, fontWeight: "600" },
  recipeNutritionValue: { fontSize: 13, fontWeight: "800", marginTop: 4 },
  footer: {
    padding: 20,
    paddingBottom: 4,
    borderTopWidth: 1,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  saveBtn: {
    flexDirection: "row",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
