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
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
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

  // Son 30 günü oluştur
  const generateDays = () => {
    const days: Array<{ date: string; label: string; dayNumber: number }> = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayNumber = date.getDate();
      const fullLabel = date.toLocaleDateString("tr-TR", {
        weekday: "short",
      });
      const label = fullLabel.charAt(0).toUpperCase();
      days.push({ date: dateStr, label, dayNumber });
    }
    return days;
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
        {/* header ... */}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* HEADER */}
      {/* ... diğer bölümler ... */}

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* DİYET BİLGİLERİ */}
        {/* ... */}

        {/* SU İÇME HATIRLATICISI */}
        <View
          style={[
            styles.waterCard,
            isLight && styles.surfaceLift,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                flex: 1,
              }}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: "#3b82f620" },
                ]}
              >
                <Droplet size={24} color="#3b82f6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: colors.text,
                    marginBottom: 4,
                  }}
                >
                  Su İçme Hatırlatıcısı
                </Text>
                <Text
                  style={{ fontSize: 12, color: colors.textMuted }}
                >
                  Yaşınıza ve kilonuza göre günlük su içme hatırlatıcıları
                </Text>
              </View>
            </View>
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
                true: colors.primary + "80",
              }}
              thumbColor={
                waterReminderEnabled ? colors.primary : "#f4f3f4"
              }
            />
          </View>
        </View>

        {/* KİLO TAKİBİ */}
        {/* ... mevcut kilo takibi kodu ... */}

        {/* GÜNLÜK TAKİP */}
        {/* ... */}
      </ScrollView>

      {/* KİLO GİRİŞ MODAL */}
      {/* ... */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // mevcut stiller ...
  waterCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 0,
  },
  surfaceLift: {
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});

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
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
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
} from "lucide-react-native";
import { getMemberById, FamilyMember, updateMemberDetails } from "../../services/family";
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
  const [weightHistory, setWeightHistory] = useState<Array<{ date: string; weight: number; week: number }>>([]);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState("");

  // Diyet ilerlemesini yükle
  const loadDietProgress = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const stored = await AsyncStorage.getItem(`diet_progress_${profile.id}`);
      if (stored) {
        setDietProgress(JSON.parse(stored));
      }
      // Kilo geçmişini yükle
      const weightStored = await AsyncStorage.getItem(`diet_weight_history_${profile.id}`);
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
      await AsyncStorage.setItem(`diet_progress_${profile.id}`, JSON.stringify(newProgress));
    } catch (error) {
      Alert.alert("Hata", "Güncelleme yapılamadı.");
    } finally {
      setSaving(false);
    }
  };

  // Pazartesi kontrolü
  const isMonday = () => {
    const today = new Date();
    return today.getDay() === 1; // 1 = Pazartesi (0 = Pazar, 1 = Pazartesi, ...)
  };

  // Modal açma kontrolü
  const handleOpenWeightModal = () => {
    if (!isMonday()) {
      const today = new Date();
      const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
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
    
    // Pazartesi kontrolü
    if (!isMonday()) {
      Alert.alert("Hata", "Haftalık kilo girişi sadece Pazartesi günleri yapılabilir.");
      return;
    }
    
    const mealPrefs = member?.meal_preferences || {};
    const dietStartDate = mealPrefs.diet_start_date
      ? new Date(mealPrefs.diet_start_date)
      : null;
    
    if (!dietStartDate) {
      Alert.alert("Hata", "Diyet başlangıç tarihi bulunamadı.");
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
      const weekNumber = Math.floor((today.getTime() - dietStartDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
      
      const newEntry = {
        date: today.toISOString().split("T")[0],
        weight: weightValue,
        week: weekNumber,
      };

      // Aynı hafta için mevcut kaydı güncelle veya yeni ekle
      const updatedHistory = weightHistory.filter(
        (entry) => entry.week !== weekNumber
      );
      updatedHistory.push(newEntry);
      updatedHistory.sort((a, b) => a.week - b.week);

      setWeightHistory(updatedHistory);
      await AsyncStorage.setItem(`diet_weight_history_${profile.id}`, JSON.stringify(updatedHistory));
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
    ? Math.floor((new Date().getTime() - dietStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
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

  // Son 30 günü oluştur
  const generateDays = () => {
    const days: Array<{ date: string; label: string; dayNumber: number }> = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayNumber = date.getDate();
      // Gün isminin sadece ilk harfini al
      const fullLabel = date.toLocaleDateString("tr-TR", { weekday: "short" });
      const label = fullLabel.charAt(0).toUpperCase();
      days.push({ date: dateStr, label, dayNumber });
    }
    return days;
  };

  const days = generateDays();
  const completedDays = Object.values(dietProgress).filter(Boolean).length;
  const completionRate = Math.round((completedDays / 30) * 100);

  // Başlangıç kilosu ve kilo değişimi
  const startWeight = member?.weight || 0;
  const lastWeightEntry = weightHistory.length > 0 
    ? weightHistory[weightHistory.length - 1] 
    : null;
  const currentWeight = lastWeightEntry?.weight || startWeight;
  const weightChange = currentWeight - startWeight;
  const weightChangePercent = startWeight > 0 ? ((weightChange / startWeight) * 100).toFixed(1) : "0";

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
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
        {/* DİYET BİLGİLERİ */}
        <View
          style={[
            styles.infoCard,
            isLight && styles.surfaceLift,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.infoRow}>
            <View style={[styles.iconCircle, { backgroundColor: "#10b98120" }]}>
              <Apple size={24} color="#10b981" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                Diyet Tipi
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {mealPrefs.diet === "weight_loss"
                  ? "Kilo Verme"
                  : mealPrefs.diet === "weight_gain"
                  ? "Kilo Alma"
                  : mealPrefs.diet === "vegetarian"
                  ? "Vejetaryen"
                  : mealPrefs.diet === "vegan"
                  ? "Vegan"
                  : "Standart"}
              </Text>
            </View>
          </View>

          {mealPrefs.calories && (
            <View style={[styles.infoRow, { marginTop: 16 }]}>
              <View style={[styles.iconCircle, { backgroundColor: "#f59e0b20" }]}>
                <Flame size={24} color="#f59e0b" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                  Günlük Kalori Hedefi
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {mealPrefs.calories} kcal
                </Text>
              </View>
            </View>
          )}

          {dietStartDate && (
            <View style={[styles.infoRow, { marginTop: 16 }]}>
              <View style={[styles.iconCircle, { backgroundColor: "#3b82f620" }]}>
                <Calendar size={24} color="#3b82f6" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                  Başlangıç Tarihi
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {dietStartDate.toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
                <Text style={[styles.infoSubtext, { color: colors.textMuted }]}>
                  {dietDays} gün geçti • {remainingDays} gün kaldı
                </Text>
              </View>
            </View>
          )}

          {bmi && bmiCategory && (
            <View style={[styles.infoRow, { marginTop: 16 }]}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: bmiCategory.color + "20" },
                ]}
              >
                <Target size={24} color={bmiCategory.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                  BMI (Vücut Kitle İndeksi)
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {bmi} • {bmiCategory.status}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* İLERLEME ÖZETİ */}
        <View
          style={[
            styles.progressCard,
            isLight && styles.surfaceLift,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            İlerleme Özeti
          </Text>
          <View style={styles.progressStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {completedDays}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Tamamlanan Gün
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {30 - completedDays}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Kalan Gün
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                %{completionRate}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Tamamlanma Oranı
              </Text>
            </View>
          </View>
        </View>

        {/* KİLO TAKİBİ */}
        <View
          style={[
            styles.weightCard,
            isLight && styles.surfaceLift,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Kilo Takibi
            </Text>
            <TouchableOpacity
              onPress={handleOpenWeightModal}
              style={[
                styles.addButton,
                { backgroundColor: isMonday() ? colors.primary : colors.textMuted },
              ]}
            >
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.weightStats}>
            <View style={styles.weightStatItem}>
              <Text style={[styles.weightLabel, { color: colors.textMuted }]}>
                Başlangıç Kilosu
              </Text>
              <Text style={[styles.weightValue, { color: colors.text }]}>
                {startWeight > 0 ? `${startWeight} kg` : "-"}
              </Text>
            </View>
            <View style={styles.weightStatItem}>
              <Text style={[styles.weightLabel, { color: colors.textMuted }]}>
                Mevcut Kilo
              </Text>
              <Text style={[styles.weightValue, { color: colors.text }]}>
                {currentWeight > 0 ? `${currentWeight.toFixed(1)} kg` : "-"}
              </Text>
            </View>
            <View style={styles.weightStatItem}>
              <Text style={[styles.weightLabel, { color: colors.textMuted }]}>
                Değişim
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                {weightChange !== 0 && (
                  weightChange < 0 ? (
                    <TrendingDown size={18} color="#10b981" />
                  ) : (
                    <TrendingUp size={18} color="#ef4444" />
                  )
                )}
                <Text
                  style={[
                    styles.weightValue,
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
              {startWeight > 0 && weightChange !== 0 && (
                <Text
                  style={[
                    styles.weightPercent,
                    {
                      color:
                        weightChange === 0
                          ? colors.textMuted
                          : weightChange < 0
                          ? "#10b981"
                          : "#ef4444",
                    },
                  ]}
                >
                  ({weightChange > 0 ? "+" : ""}
                  {weightChangePercent}%)
                </Text>
              )}
            </View>
          </View>

          {/* Haftalık Kilo Geçmişi */}
          {weightHistory.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.weightHistoryTitle, { color: colors.textMuted }]}>
                Haftalık Kayıtlar
              </Text>
              {weightHistory.map((entry, index) => {
                const entryChange = entry.weight - startWeight;
                return (
                  <View
                    key={index}
                    style={[
                      styles.weightHistoryItem,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.weightHistoryWeek, { color: colors.text }]}>
                        {entry.week}. Hafta
                      </Text>
                      <Text style={[styles.weightHistoryDate, { color: colors.textMuted }]}>
                        {new Date(entry.date).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[styles.weightHistoryWeight, { color: colors.text }]}>
                        {entry.weight.toFixed(1)} kg
                      </Text>
                      {entryChange !== 0 && (
                        <Text
                          style={[
                            styles.weightHistoryChange,
                            {
                              color: entryChange < 0 ? "#10b981" : "#ef4444",
                            },
                          ]}
                        >
                          {entryChange > 0 ? "+" : ""}
                          {entryChange.toFixed(1)} kg
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* GÜNLÜK TAKİP */}
        <View
          style={[
            styles.trackingCard,
            isLight && styles.surfaceLift,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Günlük Takip (Son 30 Gün)
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Her gün için diyet programınıza uyup uymadığınızı işaretleyin.
          </Text>

          <View style={styles.daysGrid}>
            {days.map((day, index) => {
              const isCompleted = dietProgress[day.date] === true;
              const isToday = day.date === new Date().toISOString().split("T")[0];
              const isPast = new Date(day.date) < new Date().setHours(0, 0, 0, 0);

              return (
                <TouchableOpacity
                  key={day.date}
                  onPress={() => {
                    if (isPast || isToday) {
                      toggleDay(day.date);
                    }
                  }}
                  disabled={saving || (!isPast && !isToday)}
                  style={[
                    styles.dayItem,
                    {
                      backgroundColor: isToday
                        ? colors.primary + "15"
                        : isCompleted
                        ? "#10b98115"
                        : colors.background,
                      borderColor: isToday
                        ? colors.primary + "40"
                        : isCompleted
                        ? "#10b98140"
                        : colors.border,
                      opacity: !isPast && !isToday ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      {
                        color: isToday
                          ? colors.primary
                          : isCompleted
                          ? "#10b981"
                          : colors.textMuted,
                      },
                    ]}
                  >
                    {day.label}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      {
                        color: isToday
                          ? colors.primary
                          : isCompleted
                          ? "#10b981"
                          : colors.text,
                      },
                    ]}
                  >
                    {day.dayNumber}
                  </Text>
                  {isCompleted ? (
                    <CheckCircle2 size={16} color="#10b981" />
                  ) : (
                    <Circle size={16} color={colors.border} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

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
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayItem: {
    width: "13%",
    minHeight: 60,
    aspectRatio: 0.9,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
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
  surfaceLift: {
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
