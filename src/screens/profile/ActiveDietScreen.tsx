import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Platform,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  subDays,
  startOfDay,
  endOfDay,
  eachHourOfInterval,
  isSameDay,
  addDays,
} from "date-fns";
import { tr } from "date-fns/locale";
import { format } from "date-fns";
import {
  ChevronLeft,
  Apple,
  Calendar,
  CheckCircle2,
  Circle,
  Target,
  Flame,
  Plus,
  TrendingDown,
  TrendingUp,
  X,
  Droplet,
  UtensilsCrossed,
  Dumbbell,
  Settings,
} from "lucide-react-native";
import { getMemberById, FamilyMember, updateMemberDetails } from "../../services/family";
import { getPreferences, updatePreferences } from "../../services/settings";
import { setupWaterRemindersForFamily } from "../../services/waterReminder";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ModernInput from "../../components/ui/ModernInput";

export default function ActiveDietScreen({ navigation }: any) {
  const { colors, themeMode } = useTheme();
  const isLight = themeMode === "light";
  const { profile } = useAuth();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [dietProgress, setDietProgress] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [weightHistory, setWeightHistory] = useState<
    Array<{ date: string; weight: number; week: number }>
  >([]);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [waterReminderEnabled, setWaterReminderEnabled] = useState(false);
  const [savingWaterReminder, setSavingWaterReminder] = useState(false);
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("monthly");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  // Diyet ilerlemesini yükle
  const loadDietProgress = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const stored = await AsyncStorage.getItem(`diet_progress_${profile.id}`);
      if (stored) {
        setDietProgress(JSON.parse(stored));
      }
      // Kilo geçmişini yükle
      const weightStored = await AsyncStorage.getItem(
        `diet_weight_history_${profile.id}`
      );
      if (weightStored) {
        setWeightHistory(JSON.parse(weightStored));
      }
    } catch (error) {
      console.error("Diyet ilerlemesi yüklenemedi:", error);
    }
  }, [profile?.id]);

  // Üye bilgilerini yükle
  const loadMember = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const res = await getMemberById(profile.id);
      if (res.member) {
        setMember(res.member as FamilyMember);
        await loadDietProgress();
      }
    } catch (error) {
      Alert.alert("Hata", "Bilgiler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [profile?.id, loadDietProgress]);

  useFocusEffect(
    useCallback(() => {
      loadMember();
    }, [loadMember])
  );

  // Su hatırlatıcısı tercihlerini yükle
  useEffect(() => {
    const loadWaterPref = async () => {
      try {
        const prefs = await getPreferences();
        if (prefs) {
          setWaterReminderEnabled(!!prefs.water_reminder_enabled);
        }
      } catch (e) {
        console.error("Su hatırlatıcısı tercihi yüklenemedi:", e);
      }
    };
    loadWaterPref();
  }, []);

  // Gün işaretleme (yapıldı/yapılmadı)
  const toggleDay = async (date: string) => {
    if (saving || !profile?.id) return;

    setSaving(true);
    try {
      const newProgress = {
        ...dietProgress,
        [date]: !dietProgress[date],
      };
      setDietProgress(newProgress);
      await AsyncStorage.setItem(
        `diet_progress_${profile.id}`,
        JSON.stringify(newProgress)
      );
    } catch (error) {
      Alert.alert("Hata", "Güncelleme yapılamadı.");
    } finally {
      setSaving(false);
    }
  };

  // Pazartesi kontrolü
  const isMonday = () => {
    const today = new Date();
    return today.getDay() === 1; // 1 = Pazartesi
  };

  // Modal açma kontrolü (kilo)
  const handleOpenWeightModal = () => {
    if (!isMonday()) {
      const today = new Date();
      const dayNames = [
        "Pazar",
        "Pazartesi",
        "Salı",
        "Çarşamba",
        "Perşembe",
        "Cuma",
        "Cumartesi",
      ];
      const todayName = dayNames[today.getDay()];
      const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
      Alert.alert(
        "Haftalık Kilo Girişi",
        `Haftalık kilo girişi sadece Pazartesi günleri yapılabilir.\n\nBugün: ${todayName}\nBir sonraki Pazartesi: ${daysUntilMonday} gün sonra`
      );
      return;
    }
    setWeightModalVisible(true);
  };

  // Haftalık kilo girişi
  const handleWeightSubmit = async () => {
    if (!newWeight || !profile?.id) return;

    const mealPrefs = member?.meal_preferences || {};
    const dietStartDate = mealPrefs.diet_start_date
      ? new Date(mealPrefs.diet_start_date)
      : null;

    if (!dietStartDate) {
      Alert.alert("Hata", "Diyet başlangıç tarihi bulunamadı.");
      return;
    }

    if (!isMonday()) {
      Alert.alert(
        "Hata",
        "Haftalık kilo girişi sadece Pazartesi günleri yapılabilir."
      );
      return;
    }

    const weightValue = parseFloat(newWeight.replace(",", "."));
    if (isNaN(weightValue) || weightValue <= 0 || weightValue > 300) {
      Alert.alert("Hata", "Geçerli bir kilo girin (0-300 kg arası).");
      return;
    }

    setSaving(true);
    try {
      const today = new Date();
      const weekNumber =
        Math.floor(
          (today.getTime() - dietStartDate.getTime()) /
            (1000 * 60 * 60 * 24 * 7)
        ) + 1;

      const newEntry = {
        date: today.toISOString().split("T")[0],
        weight: weightValue,
        week: weekNumber,
      };

      const updatedHistory = weightHistory.filter(
        (entry) => entry.week !== weekNumber
      );
      updatedHistory.push(newEntry);
      updatedHistory.sort((a, b) => a.week - b.week);

      setWeightHistory(updatedHistory);
      await AsyncStorage.setItem(
        `diet_weight_history_${profile.id}`,
        JSON.stringify(updatedHistory)
      );
      setWeightModalVisible(false);
      setNewWeight("");
      Alert.alert("Başarılı", "Kilo kaydedildi.");
    } catch (error) {
      Alert.alert("Hata", "Kilo kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  // Diyet bilgileri
  const mealPrefs = member?.meal_preferences || {};
  const dietStartDate = mealPrefs.diet_start_date
    ? new Date(mealPrefs.diet_start_date)
    : null;
  const dietDays = dietStartDate
    ? Math.floor(
        (new Date().getTime() - dietStartDate.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 0;
  const remainingDays = dietStartDate ? Math.max(0, 30 - dietDays) : 0;

  // BMI hesaplama
  const calculateBMI = (weight?: number, height?: number) => {
    if (!weight || !height || height === 0) return null;
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10;
  };

  const bmi = calculateBMI(member?.weight, member?.height);
  const bmiCategory = bmi
    ? bmi < 18.5
      ? { status: "Zayıf", color: "#3b82f6" }
      : bmi < 25
      ? { status: "Normal", color: "#10b981" }
      : bmi < 30
      ? { status: "Fazla Kilolu", color: "#f59e0b" }
      : { status: "Obez", color: "#ef4444" }
    : null;

  // Son 30 günü CalendarWidget gibi grid yapısında oluştur
  const generateDays = () => {
    const today = new Date();
    const startDate = subDays(today, 29); // Son 30 günün başlangıcı
    const endDate = today; // Bugün

    // Haftanın başlangıcına göre grid başlangıcı
    const gridStart = startOfWeek(startDate, { weekStartsOn: 1 });
    // Haftanın sonuna göre grid bitişi
    const gridEnd = endOfWeek(endDate, { weekStartsOn: 1 });

    // Grid için tüm günleri oluştur
    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

    // Son 30 günün tarihlerini set olarak tut (hızlı kontrol için)
    const last30DaysSet = new Set<string>();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last30DaysSet.add(date.toISOString().split("T")[0]);
    }

    return allDays.map(day => {
      const dateStr = day.toISOString().split("T")[0];
      const isInLast30Days = last30DaysSet.has(dateStr);
      return {
        date: dateStr,
        dayNumber: day.getDate(),
        dayOfWeek: day.getDay() === 0 ? 6 : day.getDay() - 1, // Pazartesi = 0
        isInLast30Days,
      };
    });
  };

  const days = generateDays();
  const completedDays = Object.values(dietProgress).filter(Boolean).length;
  const completionRate = Math.round((completedDays / 30) * 100);

  const startWeight = member?.weight || 0;
  const lastWeightEntry =
    weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null;
  const currentWeight = lastWeightEntry?.weight || startWeight;
  const weightChange = currentWeight - startWeight;
  const weightChangePercent =
    startWeight > 0
      ? ((weightChange / startWeight) * 100).toFixed(1)
      : "0";

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!member?.meal_preferences?.diet_active) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: colors.card }]}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Aktif Diyet Programı
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
          <Apple size={64} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            Aktif bir diyet programınız bulunmuyor.
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            Diyet programı oluşturmak için üye detaylarınızı ziyaret edin.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} pointerEvents="box-none">
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: colors.card }]}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Aktif Diyet Programı
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* GÜNLÜK TAKİP */}
        <View
          style={[
            styles.trackingCard,
            isLight && styles.surfaceLift,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.trackingHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Günlük Takip
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                {viewMode === "daily"
                  ? format(selectedDate, "d MMMM yyyy", { locale: tr })
                  : "Son 30 Gün"}
              </Text>
            </View>

            {/* GÖRÜNÜM MODU SEÇİCİ */}
            <View
              style={[styles.toggleRow, { backgroundColor: colors.background }]}
            >
              {(["daily", "monthly"] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setViewMode(m)}
                  style={[
                    styles.modeBtn,
                    viewMode === m && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.modeText,
                      { color: viewMode === m ? "#fff" : colors.textMuted },
                    ]}
                  >
                    {m === "daily" ? "Gün" : "Ay"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* GÜNLÜK GÖRÜNÜM - SAATLİK ÇİZELGE */}
          {viewMode === "daily" && (
            <View style={styles.dailyView}>
              <View style={styles.dailyHeader}>
                <TouchableOpacity
                  onPress={() => setSelectedDate(subDays(selectedDate, 1))}
                  style={styles.navButton}
                >
                  <ChevronLeft size={20} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.dailyInfo}>
                  <Text style={[styles.dailyDate, { color: colors.text }]}>
                    {format(selectedDate, "EEEE, d MMMM yyyy", { locale: tr })}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedDate(addDays(selectedDate, 1))}
                  style={styles.navButton}
                  disabled={
                    isSameDay(selectedDate, new Date()) ||
                    selectedDate > new Date()
                  }
                >
                  <ChevronLeft
                    size={20}
                    color={
                      isSameDay(selectedDate, new Date()) ||
                      selectedDate > new Date()
                        ? colors.border
                        : colors.text
                    }
                    style={{ transform: [{ rotate: "180deg" }] }}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.hourlyScroll} nestedScrollEnabled>
                {eachHourOfInterval({
                  start: startOfDay(selectedDate),
                  end: endOfDay(selectedDate),
                })
                  .filter((h) => h.getHours() >= 7 && h.getHours() <= 23)
                  .map((hour, i) => {
                    const dateStr = selectedDate.toISOString().split("T")[0];
                    const isCompleted = dietProgress[dateStr] === true;
                    const isCurrentHour =
                      isSameDay(selectedDate, new Date()) &&
                      hour.getHours() === new Date().getHours();

                    return (
                      <View
                        key={i}
                        style={[
                          styles.hourRow,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[styles.hourLabel, { color: colors.textMuted }]}
                        >
                          {format(hour, "HH:00")}
                        </Text>
                        <View style={styles.hourContent}>
                          {isCurrentHour && (
                            <View
                              style={[
                                styles.currentHourIndicator,
                                { backgroundColor: colors.primary + "20" },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.currentHourText,
                                  { color: colors.primary },
                                ]}
                              >
                                Şu an
                              </Text>
                            </View>
                          )}
                          {isCompleted && (
                            <View
                              style={[
                                styles.dietStatusPill,
                                { backgroundColor: "#10b98115" },
                              ]}
                            >
                              <CheckCircle2 size={14} color="#10b981" />
                              <Text
                                style={[
                                  styles.dietStatusText,
                                  { color: "#10b981" },
                                ]}
                              >
                                Diyet programına uyuldu
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
              </ScrollView>
            </View>
          )}

          {/* AYLIK GÖRÜNÜM */}
          {viewMode === "monthly" && (
            <>
              {/* GÜN İSİMLERİ SABİT SATIR */}
              <View style={styles.weekdayRow}>
                {eachDayOfInterval({
                  start: startOfWeek(new Date(), { weekStartsOn: 1 }),
                  end: endOfWeek(new Date(), { weekStartsOn: 1 }),
                }).map((day, i) => (
                  <View key={i} style={styles.weekdayCell}>
                    <Text
                      style={[styles.weekdayText, { color: colors.textMuted }]}
                    >
                      {format(day, "EEE", { locale: tr })}
                    </Text>
                  </View>
                ))}
              </View>

              {/* GÜN NUMARALARI GRID - CalendarWidget gibi */}
              <View style={styles.monthGrid}>
                {days.map((day, index) => {
                  const isCompleted = dietProgress[day.date] === true;
                  const isToday = day.date === new Date().toISOString().split("T")[0];
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isPast = new Date(day.date) < today;
                  const canInteract = day.isInLast30Days && (isPast || isToday);
                  const isSelected = isSameDay(
                    new Date(day.date),
                    selectedDate
                  );

                  return (
                    <TouchableOpacity
                      key={`${day.date}-${index}`}
                      onPress={() => {
                        if (canInteract) {
                          toggleDay(day.date);
                        }
                        setSelectedDate(new Date(day.date));
                      }}
                      disabled={saving || !canInteract}
                      style={[
                        styles.dayCell,
                        {
                          backgroundColor: isSelected
                            ? colors.primary + "25"
                            : isToday
                            ? colors.primary + "15"
                            : isCompleted && day.isInLast30Days
                            ? "#10b98115"
                            : colors.background,
                          borderColor: isSelected
                            ? colors.primary
                            : isToday
                            ? colors.primary + "40"
                            : isCompleted && day.isInLast30Days
                            ? "#10b98140"
                            : colors.border,
                          borderWidth: isSelected ? 2 : 1,
                          opacity: !day.isInLast30Days ? 0.3 : canInteract ? 1 : 0.5,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          {
                            color: isSelected
                              ? colors.primary
                              : isToday
                              ? colors.primary
                              : isCompleted && day.isInLast30Days
                              ? "#10b981"
                              : colors.text,
                          },
                        ]}
                      >
                        {day.dayNumber}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* BİRLEŞTİRİLMİŞ DİYET DASHBOARD */}
        <View
          style={[
            styles.unifiedDashboardCard,
            isLight && styles.surfaceLift,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {/* HEADER - Başlık ve Ayarlar Butonu */}
          <View style={styles.dashboardHeader}>
            <View>
              <Text style={[styles.dashboardTitle, { color: colors.text }]}>
                Diyet Programı
              </Text>
              <Text style={[styles.dashboardSubtitle, { color: colors.textMuted }]}>
                {mealPrefs.diet === "weight_loss"
                  ? "Kilo Verme"
                  : mealPrefs.diet === "weight_gain"
                  ? "Kilo Alma"
                  : mealPrefs.diet === "vegetarian"
                  ? "Vejetaryen"
                  : mealPrefs.diet === "vegan"
                  ? "Vegan"
                  : "Standart"}
                {mealPrefs.calories ? ` • ${mealPrefs.calories} kcal/gün` : ""}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSettingsModalVisible(true)}
              style={[
                styles.settingsButton,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Settings size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* İLERLEME İSTATİSTİKLERİ */}
          <View style={styles.dashboardStats}>
            <View style={styles.dashboardStatCard}>
              <View style={[styles.statIconCircle, { backgroundColor: "#10b98120" }]}>
                <CheckCircle2 size={20} color="#10b981" />
              </View>
              <Text style={[styles.dashboardStatValue, { color: colors.text }]}>
                {completedDays}
              </Text>
              <Text style={[styles.dashboardStatLabel, { color: colors.textMuted }]}>
                Tamamlanan
              </Text>
            </View>

            <View style={styles.dashboardStatCard}>
              <View style={[styles.statIconCircle, { backgroundColor: "#3b82f620" }]}>
                <Calendar size={20} color="#3b82f6" />
              </View>
              <Text style={[styles.dashboardStatValue, { color: colors.text }]}>
                {30 - completedDays}
              </Text>
              <Text style={[styles.dashboardStatLabel, { color: colors.textMuted }]}>
                Kalan Gün
              </Text>
            </View>

            <View style={styles.dashboardStatCard}>
              <View style={[styles.statIconCircle, { backgroundColor: "#f59e0b20" }]}>
                <Target size={20} color="#f59e0b" />
              </View>
              <Text style={[styles.dashboardStatValue, { color: colors.text }]}>
                %{completionRate}
              </Text>
              <Text style={[styles.dashboardStatLabel, { color: colors.textMuted }]}>
                İlerleme
              </Text>
            </View>
          </View>

          {/* KİLO BİLGİLERİ */}
          <View style={styles.dashboardWeightSection}>
            <View style={styles.weightInfoRow}>
              <View style={styles.weightInfoItem}>
                <Text style={[styles.weightInfoLabel, { color: colors.textMuted }]}>
                  Başlangıç
                </Text>
                <Text style={[styles.weightInfoValue, { color: colors.text }]}>
                  {startWeight > 0 ? `${startWeight} kg` : "-"}
                </Text>
              </View>
              <View style={styles.weightInfoItem}>
                <Text style={[styles.weightInfoLabel, { color: colors.textMuted }]}>
                  Mevcut
                </Text>
                <Text style={[styles.weightInfoValue, { color: colors.text }]}>
                  {currentWeight > 0 ? `${currentWeight.toFixed(1)} kg` : "-"}
                </Text>
              </View>
              <View style={styles.weightInfoItem}>
                <Text style={[styles.weightInfoLabel, { color: colors.textMuted }]}>
                  Değişim
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  {weightChange !== 0 && (
                    weightChange < 0 ? (
                      <TrendingDown size={16} color="#10b981" />
                    ) : (
                      <TrendingUp size={16} color="#ef4444" />
                    )
                  )}
                  <Text
                    style={[
                      styles.weightInfoValue,
                      {
                        color:
                          weightChange === 0
                            ? colors.text
                            : weightChange < 0
                            ? "#10b981"
                            : "#ef4444",
                      },
                    ]}
                  >
                    {weightChange > 0 ? "+" : ""}
                    {weightChange.toFixed(1)} kg
                  </Text>
                </View>
              </View>
            </View>
            {bmi && bmiCategory && (
              <View style={styles.bmiRow}>
                <View style={[styles.bmiIconCircle, { backgroundColor: bmiCategory.color + "20" }]}>
                  <Target size={18} color={bmiCategory.color} />
                </View>
                <Text style={[styles.bmiText, { color: colors.textMuted }]}>
                  BMI: <Text style={{ color: colors.text, fontWeight: "700" }}>{bmi}</Text> • {bmiCategory.status}
                </Text>
              </View>
            )}
            <View style={[styles.weightInfoHint, { backgroundColor: colors.background + "80" }]}>
              <Text style={[styles.weightInfoHintText, { color: colors.textMuted }]}>
                💡 Haftalık kilo girişlerini{" "}
                <Text style={{ fontWeight: "700", color: colors.primary }}>
                  Ayarlar
                </Text>{" "}
                butonundan yapabilirsiniz
              </Text>
            </View>
          </View>

          {/* TARİH BİLGİSİ */}
          {dietStartDate && (
            <View style={styles.dateInfoRow}>
              <Calendar size={16} color={colors.textMuted} />
              <Text style={[styles.dateInfoText, { color: colors.textMuted }]}>
                {dietStartDate.toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })} • {dietDays} gün geçti • {remainingDays} gün kaldı
              </Text>
            </View>
          )}
        </View>



      </ScrollView>

      {/* AYARLAR MODAL */}
      <Modal visible={settingsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Ayarlar
              </Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* SU İÇME HATIRLATICISI */}
            <View
              style={[
                styles.settingsItemContainer,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.settingsItemRow}>
                <View style={styles.settingsItemLeft}>
                  <View
                    style={[
                      styles.settingsIconCircleSmall,
                      {
                        backgroundColor: waterReminderEnabled
                          ? "#3b82f620"
                          : colors.border + "40",
                      },
                    ]}
                  >
                    <Droplet
                      size={20}
                      color={waterReminderEnabled ? "#3b82f6" : colors.textMuted}
                    />
                  </View>
                  <View style={styles.settingsItemTextContainer}>
                    <Text
                      style={[
                        styles.settingsItemTitleSmall,
                        { color: colors.text },
                      ]}
                    >
                      Su İçme Hatırlatıcısı
                    </Text>
                    <Text
                      style={[
                        styles.settingsItemDescriptionSmall,
                        { color: colors.textMuted },
                      ]}
                    >
                      Günlük su içme hatırlatıcıları
                    </Text>
                  </View>
                </View>
                <View style={styles.settingsSwitchContainer}>
                  {savingWaterReminder ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                      style={{ marginRight: 8 }}
                    />
                  ) : null}
                  <Switch
                    value={waterReminderEnabled}
                    onValueChange={async (value) => {
                      setWaterReminderEnabled(value);
                      setSavingWaterReminder(true);
                      try {
                        const result = await setupWaterRemindersForFamily(value);
                        if (!result.success && value) {
                          Alert.alert(
                            "Uyarı",
                            result.error || "Su içme hatırlatıcısı ayarlanamadı."
                          );
                          setWaterReminderEnabled(false);
                          return;
                        }
                        await updatePreferences({ waterReminderEnabled: value });
                        Alert.alert(
                          "Başarılı",
                          value
                            ? "Su içme hatırlatıcısı aktif edildi."
                            : "Su içme hatırlatıcısı kapatıldı."
                        );
                      } catch (e: any) {
                        Alert.alert(
                          "Hata",
                          e?.message || "Su içme hatırlatıcısı ayarlanamadı."
                        );
                        setWaterReminderEnabled(!value);
                      } finally {
                        setSavingWaterReminder(false);
                      }
                    }}
                    disabled={savingWaterReminder}
                    trackColor={{
                      false: colors.border,
                      true: colors.primary,
                    }}
                    thumbColor="#fff"
                    ios_backgroundColor={colors.border}
                  />
                </View>
              </View>
            </View>

            {/* HAFTALIK KİLO GİRİŞİ */}
            <View
              style={[
                styles.settingsItemContainer,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  marginTop: 12,
                },
              ]}
            >
              <View style={styles.settingsItemRow}>
                <View style={styles.settingsItemLeft}>
                  <View
                    style={[
                      styles.settingsIconCircleSmall,
                      {
                        backgroundColor: isMonday()
                          ? "#10b98120"
                          : colors.border + "40",
                      },
                    ]}
                  >
                    <Target
                      size={20}
                      color={isMonday() ? "#10b981" : colors.textMuted}
                    />
                  </View>
                  <View style={styles.settingsItemTextContainer}>
                    <Text
                      style={[
                        styles.settingsItemTitleSmall,
                        { color: colors.text },
                      ]}
                    >
                      Haftalık Kilo Girişi
                    </Text>
                    <Text
                      style={[
                        styles.settingsItemDescriptionSmall,
                        { color: colors.textMuted },
                      ]}
                    >
                      {isMonday()
                        ? "Bu hafta için kilonuzu girin"
                        : "Sadece Pazartesi günleri giriş yapılabilir"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setSettingsModalVisible(false);
                    handleOpenWeightModal();
                  }}
                  disabled={!isMonday()}
                  style={[
                    styles.settingsActionButton,
                    {
                      backgroundColor: isMonday()
                        ? colors.primary
                        : colors.textMuted,
                      opacity: isMonday() ? 1 : 0.5,
                    },
                  ]}
                >
                  <Plus size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* GÜNLÜK AKTİVİTE BUTONLARI - SAĞDA DİKEYDE SABİT */}
      <View style={styles.fabWrapper} pointerEvents="box-none">
        <TouchableOpacity
          style={[
            styles.fabBase,
            { backgroundColor: "#3b82f6" },
          ]}
          onPress={() => {
            // Su içildi - 200 ml
            Alert.alert("Su İçildi", "200 ml su kaydı eklendi.");
          }}
          activeOpacity={0.8}
        >
          <Droplet size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.fabBase,
            { backgroundColor: "#f59e0b" },
          ]}
          onPress={() => {
            // Yemek ve içecek ekle
            Alert.alert("Yemek ve İçecek", "Yemek ve içecek ekleme ekranı açılacak.");
          }}
          activeOpacity={0.8}
        >
          <UtensilsCrossed size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.fabBase,
            { backgroundColor: "#10b981" },
          ]}
          onPress={() => {
            // Egzersiz ekle
            Alert.alert("Egzersiz", "Egzersiz ekleme ekranı açılacak.");
          }}
          activeOpacity={0.8}
        >
          <Dumbbell size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* KİLO GİRİŞ MODAL */}
      <Modal visible={weightModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Haftalık Kilo Girişi
              </Text>
              <TouchableOpacity onPress={() => setWeightModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
              Bu hafta için kilonuzu girin. Haftalık kilo takibi için önemlidir.
            </Text>

            <ModernInput
              label="Kilo (kg)"
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="decimal-pad"
              placeholder="Örn: 75.5"
              placeholderTextColor={colors.textMuted}
              style={{ marginTop: 16 }}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setWeightModalVisible(false);
                  setNewWeight("");
                }}
                style={[
                  styles.modalButton,
                  styles.modalButtonCancel,
                  { borderColor: colors.border },
                ]}
                disabled={saving}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  İptal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleWeightSubmit}
                style={[styles.modalButton, styles.modalButtonSave, { backgroundColor: colors.primary }]}
                disabled={saving || !newWeight}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                    Kaydet
                  </Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  infoCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 0,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  infoSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  progressCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  trackingCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 0,
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  weekdayCell: {
    width: "14.2%",
    alignItems: "center",
  },
  weekdayText: {
    fontSize: 10,
    fontWeight: "700",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.2%",
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 4,
  },
  dayText: {
    fontSize: 15,
    fontWeight: "600",
  },
  trackingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 2,
  },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modeText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  dailyView: {
    marginTop: 8,
  },
  dailyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  dailyInfo: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 12,
  },
  dailyDate: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  dailyStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  hourlyScroll: {
    maxHeight: 400,
  },
  hourRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  hourLabel: {
    width: 60,
    fontSize: 13,
    fontWeight: "600",
  },
  hourContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currentHourIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currentHourText: {
    fontSize: 12,
    fontWeight: "700",
  },
  dietStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dietStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  fabWrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 85 : 75,
    right: 20,
    flexDirection: "column",
    gap: 12,
    zIndex: 1000,
  },
  fabBase: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  unifiedDashboardCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 0,
  },
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  dashboardStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  dashboardStatCard: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  dashboardStatValue: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
  },
  dashboardStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  dashboardWeightSection: {
    marginBottom: 16,
  },
  weightInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  weightInfoItem: {
    flex: 1,
  },
  weightInfoLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  weightInfoValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  weightAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  bmiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  bmiIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  bmiText: {
    fontSize: 13,
    fontWeight: "500",
  },
  dateInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  dateInfoText: {
    fontSize: 12,
    fontWeight: "500",
  },
  settingsItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingsItemContainer: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  settingsItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingsIconCircleSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingsItemTextContainer: {
    flex: 1,
  },
  settingsItemTitleSmall: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  settingsItemDescriptionSmall: {
    fontSize: 12,
    lineHeight: 16,
  },
  settingsSwitchContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  weightInfoHint: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
  },
  weightInfoHintText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  surfaceLift: {
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  waterCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 0,
  },
  weightCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 0,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  weightStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  weightStatItem: {
    alignItems: "center",
    flex: 1,
  },
  weightLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  weightValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  weightPercent: {
    fontSize: 11,
    marginTop: 2,
  },
  weightHistoryTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  weightHistoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  weightHistoryWeek: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  weightHistoryDate: {
    fontSize: 12,
  },
  weightHistoryWeight: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  weightHistoryChange: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  modalDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonCancel: {
    borderWidth: 1,
  },
  modalButtonSave: {
    // backgroundColor handled by inline style
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
