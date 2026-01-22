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
  KeyboardAvoidingView,
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
  Camera,
  Image as ImageIcon,
  ArrowLeft,
  Check,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import HeartbeatLoader from "../../components/ui/HeartbeatLoader";
import { getMemberById, FamilyMember, updateMemberDetails } from "../../services/family";
import { getPreferences, updatePreferences } from "../../services/settings";
import {
  setupWaterRemindersForFamily,
  calculateDailyWaterNeed,
  calculateAge,
} from "../../services/waterReminder";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ModernInput from "../../components/ui/ModernInput";
import Svg, { Circle as SvgCircle } from "react-native-svg";
import {
  getOrCreateDailyTracking,
  setDailyTracking,
  getDailyTrackingRange,
  DailyTrackingData,
  logWaterIntake,
  logCalories,
  logExercise,
  getDailyTrackingLogs,
  DailyTrackingLog,
  calculateCaloriesFromFoodName,
  getFoodDetailsWithCalories,
  analyzeFoodFromImage,
  getExerciseCalories,
} from "../../services/dailyTracking";

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
  const [continueDietModalVisible, setContinueDietModalVisible] = useState(false);
  const [dietStreakDays, setDietStreakDays] = useState(0); // Diyete devam etme günü skoru
  const [targetWeight, setTargetWeight] = useState<number | null>(null); // Hedef kilo
  const [targetWeightModalVisible, setTargetWeightModalVisible] = useState(false);
  const [targetWeightInput, setTargetWeightInput] = useState("");
  const [waterReminderEnabled, setWaterReminderEnabled] = useState(false);
  const [savingWaterReminder, setSavingWaterReminder] = useState(false);
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("monthly");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [dailyData, setDailyData] = useState<{
    water: number;
    calories: number;
    exercise: { duration: number; calories: number };
  } | null>(null);
  const [caloriesModalVisible, setCaloriesModalVisible] = useState(false);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [foodNameInput, setFoodNameInput] = useState("");
  const [drinkNameInput, setDrinkNameInput] = useState("");
  const [foodCaloriesInput, setFoodCaloriesInput] = useState("");
  const [drinkCaloriesInput, setDrinkCaloriesInput] = useState("");
  const [calculatingCalories, setCalculatingCalories] = useState(false);
  const [exerciseNameInput, setExerciseNameInput] = useState("");
  const [exerciseDurationInput, setExerciseDurationInput] = useState("");
  const [exerciseCaloriesInput, setExerciseCaloriesInput] = useState("");
  const [calculatingExerciseCalories, setCalculatingExerciseCalories] = useState(false);
  const [exerciseConfirmationModalVisible, setExerciseConfirmationModalVisible] = useState(false);
  const [confirmedExerciseName, setConfirmedExerciseName] = useState("");
  const [confirmedExerciseDuration, setConfirmedExerciseDuration] = useState(0);
  const [confirmedExerciseCalories, setConfirmedExerciseCalories] = useState<number | null>(null);
  const [savingActivity, setSavingActivity] = useState(false);
  const [dailyLogs, setDailyLogs] = useState<DailyTrackingLog[]>([]);
  const [monthlyTrackingData, setMonthlyTrackingData] = useState<Record<string, {
    waterPercentage: number;
    caloriesPercentage: number;
    exercisePercentage: number;
    averagePercentage: number;
  }>>({});
  // Kalori onay ekranı için state'ler
  const [caloriesConfirmationModalVisible, setCaloriesConfirmationModalVisible] = useState(false);
  const [confirmedCalories, setConfirmedCalories] = useState<number | null>(null);
  const [confirmedDetails, setConfirmedDetails] = useState<string | null>(null);
  const [confirmedFoodName, setConfirmedFoodName] = useState("");
  const [confirmedIsDrink, setConfirmedIsDrink] = useState(false);
  const [pendingItems, setPendingItems] = useState<Array<{
    name: string;
    calories: number;
    details: string | null;
    isDrink: boolean;
    manualCalories?: number;
  }>>([]);
  const [currentPendingIndex, setCurrentPendingIndex] = useState(0);
  // Modal modları: 'input' | 'details' | 'camera' | 'imagePreview'
  const [modalMode, setModalMode] = useState<"input" | "details" | "camera" | "imagePreview">("input");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [foodDetailsInput, setFoodDetailsInput] = useState("");
  const [drinkDetailsInput, setDrinkDetailsInput] = useState("");
  const [aiAnalyzedData, setAiAnalyzedData] = useState<{
    name: string;
    isDrink: boolean;
    details: string | null;
    calories: number;
  } | null>(null);

  // Diyet ilerlemesini yükle
  const loadDietProgress = useCallback(async () => {
    if (!profile?.id) return;
    try {
      // Tüm tamamlanmış günleri temizle (eski verileri sıfırla)
      await AsyncStorage.removeItem(`diet_progress_${profile.id}`);
      setDietProgress({});
      
      // Kilo geçmişini yükle
      const weightStored = await AsyncStorage.getItem(
        `diet_weight_history_${profile.id}`
      );
      if (weightStored) {
        setWeightHistory(JSON.parse(weightStored));
      }

      // Diyete devam etme günü skorunu yükle
      const streakStored = await AsyncStorage.getItem(
        `diet_streak_days_${profile.id}`
      );
      if (streakStored) {
        setDietStreakDays(parseInt(streakStored, 10) || 0);
      } else {
        setDietStreakDays(0);
      }
    } catch (error) {
      console.error("Diyet ilerlemesi yüklenemedi:", error);
    }
  }, [profile?.id]);

  // Tarihi yerel saat dilimine göre YYYY-MM-DD formatına çevir
  const formatDateToLocalString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Circular Progress Component
  const CircularProgress = ({
    percentage,
    size = 80,
    strokeWidth = 8,
    color,
    backgroundColor,
  }: {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    color: string;
    backgroundColor?: string;
  }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(100, Math.max(0, percentage));
    const offset = circumference - (progress / 100) * circumference;

    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <SvgCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={backgroundColor || "#E5E7EB"}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <SvgCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View
          style={{
            position: "absolute",
            width: size,
            height: size,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: size * 0.2,
              fontWeight: "800",
              color: color,
            }}
          >
            {Math.round(progress)}%
          </Text>
        </View>
      </View>
    );
  };

  // Günlük verileri yükle (su, kalori, egzersiz)
  const loadDailyData = useCallback(async (date: Date) => {
    if (!profile?.id) return;
    try {
      const dateStr = formatDateToLocalString(date);
      
      // Önce veritabanından yükle
      const { data: tracking, error } = await getOrCreateDailyTracking(dateStr);
      
      if (error) {
        console.error("Günlük veriler yüklenemedi:", error);
        // Hata durumunda AsyncStorage'dan yükle (fallback)
        const stored = await AsyncStorage.getItem(`daily_data_${profile.id}_${dateStr}`);
        if (stored) {
          setDailyData(JSON.parse(stored));
        } else {
          setDailyData({
            water: 0,
            calories: 0,
            exercise: { duration: 0, calories: 0 },
          });
        }
        return;
      }

      if (tracking) {
        setDailyData({
          water: tracking.water || 0,
          calories: tracking.calories || 0,
          exercise: {
            duration: tracking.exercise_duration || 0,
            calories: tracking.exercise_calories || 0,
          },
        });
      } else {
        setDailyData({
          water: 0,
          calories: 0,
          exercise: { duration: 0, calories: 0 },
        });
      }

      // Günlük logları yükle
      const { data: logs, error: logsError } = await getDailyTrackingLogs(dateStr, dateStr);
      if (!logsError && logs) {
        setDailyLogs(logs);
      } else {
        setDailyLogs([]);
      }

      // Günlük aktivite takibi: Bugün için aktivite var mı kontrol et
      await checkAndUpdateDietStreak(dateStr, tracking, logs || []);
    } catch (error) {
      console.error("Günlük veriler yüklenemedi:", error);
      setDailyData({
        water: 0,
        calories: 0,
        exercise: { duration: 0, calories: 0 },
      });
      setDailyLogs([]);
    }
  }, [profile?.id]);

  // Diyete devam etme günü skorunu kontrol et ve güncelle
  const checkAndUpdateDietStreak = async (
    dateStr: string,
    tracking: any,
    logs: DailyTrackingLog[]
  ) => {
    if (!profile?.id) return;

    try {
      // Bugün için aktivite var mı kontrol et
      const hasActivity = 
        (tracking?.water && tracking.water > 0) ||
        (tracking?.calories && tracking.calories > 0) ||
        (tracking?.exercise_calories && tracking.exercise_calories > 0) ||
        logs.length > 0;

      if (!hasActivity) {
        // Aktivite yoksa streak'i sıfırlama, sadece güncelleme yapma
        return;
      }

      // Son streak gününü kontrol et
      const lastStreakDate = await AsyncStorage.getItem(
        `diet_last_streak_date_${profile.id}`
      );
      const today = formatDateToLocalString(new Date());
      const yesterday = formatDateToLocalString(
        new Date(new Date().setDate(new Date().getDate() - 1))
      );

      let newStreak = dietStreakDays;

      if (!lastStreakDate) {
        // İlk aktivite
        newStreak = 1;
      } else if (lastStreakDate === yesterday) {
        // Dün aktivite vardı, streak devam ediyor
        newStreak = dietStreakDays + 1;
      } else if (lastStreakDate === today) {
        // Bugün zaten sayılmış
        return;
      } else {
        // Streak kırıldı, yeniden başla
        newStreak = 1;
      }

      setDietStreakDays(newStreak);
      await AsyncStorage.setItem(
        `diet_streak_days_${profile.id}`,
        newStreak.toString()
      );
      await AsyncStorage.setItem(
        `diet_last_streak_date_${profile.id}`,
        today
      );
    } catch (error) {
      console.error("Streak güncellenemedi:", error);
    }
  };

  // Aktivite kaydedildiğinde streak'i güncelle
  const updateStreakOnActivity = async () => {
    if (!profile?.id) return;
    const today = formatDateToLocalString(new Date());
    const { data: tracking } = await getOrCreateDailyTracking(today);
    const { data: logs } = await getDailyTrackingLogs(today, today);
    await checkAndUpdateDietStreak(today, tracking, logs || []);
  };

  // Üye bilgilerini yükle
  const loadMember = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const res = await getMemberById(profile.id);
      if (res.member) {
        setMember(res.member as FamilyMember);
        await loadDietProgress();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await loadDailyData(today);
      }
    } catch (error) {
      Alert.alert("Hata", "Bilgiler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [profile?.id, loadDietProgress, loadDailyData]);

  // Aylık takip verilerini yükle
  const loadMonthlyTrackingData = useCallback(async () => {
    if (!profile?.id || !member) return;
    
    try {
      const today = new Date();
      const startDate = subDays(today, 29);
      const startDateStr = formatDateToLocalString(startDate);
      const endDateStr = formatDateToLocalString(today);
      
      const { data: trackingData, error } = await getDailyTrackingRange(startDateStr, endDateStr);
      
      if (error || !trackingData) {
        setMonthlyTrackingData({});
        return;
      }

      // Yaş, kilo, boy ve cinsiyet bilgileri
      const age = calculateAge(member.birth_date);
      const dailyWaterNeed = age && member.weight
        ? calculateDailyWaterNeed(age, member.weight)
        : 2500;
      const mealPrefs = member?.meal_preferences || {};
      const caloriesTarget = mealPrefs.calories ? parseInt(mealPrefs.calories) : 2000;
      const exerciseCalorieTarget = calculateExerciseCalorieTarget(
        age || undefined,
        member.weight,
        member.height,
        member.gender
      );

      // Her gün için yüzdeleri hesapla
      const monthlyData: Record<string, {
        waterPercentage: number;
        caloriesPercentage: number;
        exercisePercentage: number;
        averagePercentage: number;
      }> = {};

      trackingData.forEach((tracking) => {
        const waterPercentage = Math.min(100, Math.round((tracking.water / dailyWaterNeed) * 100));
        const caloriesPercentage = Math.min(100, Math.round((tracking.calories / caloriesTarget) * 100));
        const exercisePercentage = Math.min(100, Math.round((tracking.exercise_calories / exerciseCalorieTarget) * 100));
        const averagePercentage = Math.round((waterPercentage + caloriesPercentage + exercisePercentage) / 3);

        monthlyData[tracking.date] = {
          waterPercentage,
          caloriesPercentage,
          exercisePercentage,
          averagePercentage,
        };
      });

      setMonthlyTrackingData(monthlyData);
    } catch (error) {
      console.error("Aylık takip verileri yüklenemedi:", error);
      setMonthlyTrackingData({});
    }
  }, [profile?.id, member]);

  useFocusEffect(
    useCallback(() => {
      loadMember();
    }, [loadMember])
  );

  // Member yüklendiğinde aylık verileri yükle
  useEffect(() => {
    if (member) {
      loadMonthlyTrackingData();
    }
  }, [member, loadMonthlyTrackingData]);

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

  // Hedef kiloyu yükle (member değiştiğinde)
  useEffect(() => {
    if (!profile?.id || !member) return;
    
    const loadTargetWeight = async () => {
      try {
        const mealPrefs = member?.meal_preferences || {} as any;
        if (mealPrefs.target_weight) {
          setTargetWeight(parseFloat(mealPrefs.target_weight));
          await AsyncStorage.setItem(
            `diet_target_weight_${profile.id}`,
            mealPrefs.target_weight.toString()
          );
        } else {
          const targetWeightStored = await AsyncStorage.getItem(
            `diet_target_weight_${profile.id}`
          );
          if (targetWeightStored) {
            setTargetWeight(parseFloat(targetWeightStored));
          } else {
            setTargetWeight(null);
          }
        }
      } catch (error) {
        console.error("Hedef kilo yüklenemedi:", error);
      }
    };
    
    loadTargetWeight();
  }, [profile?.id, (member?.meal_preferences as any)?.target_weight]);

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
      
      // Diyete devam etme sorusu
      Alert.alert(
        "Kilo Kaydedildi",
        "Bu hafta için kilonuz kaydedildi. Diyete devam etmek istiyor musunuz?",
        [
          {
            text: "Hayır",
            style: "cancel",
            onPress: async () => {
              // Diyeti sonlandır
              if (member) {
                const updatedPrefs = {
                  ...member.meal_preferences,
                  diet_active: false,
                };
                await updateMemberDetails(profile.id, {
                  meal_preferences: updatedPrefs,
                });
                Alert.alert("Bilgi", "Diyet programı sonlandırıldı.");
                await loadMember();
              }
            },
          },
          {
            text: "Evet, Devam Et",
            onPress: () => {
              Alert.alert("Harika!", "Diyete devam ediyorsunuz. Başarılar!");
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Hata", "Kilo kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  // Diyet bilgileri (Haftalık sistem)
  const mealPrefs = member?.meal_preferences || {};
  const dietStartDate = mealPrefs.diet_start_date
    ? new Date(mealPrefs.diet_start_date)
    : null;
  
  // Haftalık hesaplamalar
  const dietWeeks = dietStartDate
    ? Math.floor(
        (new Date().getTime() - dietStartDate.getTime()) /
          (1000 * 60 * 60 * 24 * 7)
      ) + 1
    : 0;
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

  // Egzersiz için günlük kalori hedefi hesaplama (yaş, kilo, boy ve cinsiyete göre)
  const calculateExerciseCalorieTarget = (
    age?: number,
    weight?: number,
    height?: number,
    gender?: string
  ): number => {
    if (!age || !weight || !height || age <= 0 || weight <= 0 || height <= 0) {
      // Varsayılan değer: orta seviye aktivite için 400 kcal
      return 400;
    }

    // BMR (Bazal Metabolizma Hızı) hesaplama - Mifflin-St Jeor Denklemi
    let bmr: number;
    const heightInCm = height;
    const weightInKg = weight;

    if (gender === "male" || gender === "erkek") {
      // Erkekler için: BMR = 10 × kilo + 6.25 × boy - 5 × yaş + 5
      bmr = 10 * weightInKg + 6.25 * heightInCm - 5 * age + 5;
    } else {
      // Kadınlar için: BMR = 10 × kilo + 6.25 × boy - 5 × yaş - 161
      bmr = 10 * weightInKg + 6.25 * heightInCm - 5 * age - 161;
    }

    // Orta seviye aktivite için TDEE (Toplam Günlük Enerji Harcaması) = BMR × 1.55
    const tdee = bmr * 1.55;

    // Egzersiz kalori hedefi: TDEE'nin %20-25'i (sağlıklı bir egzersiz hedefi)
    // Minimum 300, maksimum 600 kcal
    const exerciseTarget = Math.max(300, Math.min(600, Math.round(tdee * 0.22)));

    return exerciseTarget;
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
    today.setHours(0, 0, 0, 0);
    const startDate = subDays(today, 29); // Son 30 günün başlangıcı
    startDate.setHours(0, 0, 0, 0);
    const endDate = today; // Bugün

    // Haftanın başlangıcına göre grid başlangıcı (Pazartesi = 1)
    const gridStart = startOfWeek(startDate, { weekStartsOn: 1 });
    gridStart.setHours(0, 0, 0, 0);
    // Haftanın sonuna göre grid bitişi (Pazar = 0)
    const gridEnd = endOfWeek(endDate, { weekStartsOn: 1 });
    gridEnd.setHours(0, 0, 0, 0);

    // Grid için tüm günleri oluştur
    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

    // Son 30 günün tarihlerini set olarak tut (hızlı kontrol için)
    const last30DaysSet = new Set<string>();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      last30DaysSet.add(formatDateToLocalString(date));
    }

    return allDays.map(day => {
      // Tarihi normalize et
      const normalizedDay = new Date(day);
      normalizedDay.setHours(0, 0, 0, 0);
      
      const dateStr = formatDateToLocalString(normalizedDay);
      const isInLast30Days = last30DaysSet.has(dateStr);
      
      // Haftanın gününü hesapla (Pazartesi = 0, Pazar = 6)
      const dayOfWeek = normalizedDay.getDay() === 0 ? 6 : normalizedDay.getDay() - 1;
      
      return {
        date: dateStr,
        dayNumber: normalizedDay.getDate(),
        dayOfWeek, // Pazartesi = 0
        isInLast30Days,
      };
    });
  };

  const days = generateDays();
  // Mükemmel gün sayısı (hepsi %100 olan günler)
  const perfectDays = Object.values(monthlyTrackingData).filter(
    (data) => data.averagePercentage >= 100
  ).length;
  
  const startWeight = member?.weight || 0;
  const lastWeightEntry =
    weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null;
  const currentWeight = lastWeightEntry?.weight || startWeight;
  
  // İlerleme durumu (hedef kiloya göre)
  const weightProgress = targetWeight && startWeight > 0 && currentWeight > 0
    ? Math.round(
        Math.abs((currentWeight - startWeight) / (targetWeight - startWeight)) * 100
      )
    : 0;
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
          <HeartbeatLoader size={60} />
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
                {viewMode === "daily" ? "Günlük Takip" : "Aylık Takip"}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                {viewMode === "daily"
                  ? format(selectedDate, "d MMMM yyyy", { locale: tr })
                  : format(new Date(), "MMMM yyyy", { locale: tr })}
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
                  onPress={() => {
                    const newDate = subDays(selectedDate, 1);
                    setSelectedDate(newDate);
                    loadDailyData(newDate);
                  }}
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
                  onPress={() => {
                    const newDate = addDays(selectedDate, 1);
                    setSelectedDate(newDate);
                    loadDailyData(newDate);
                  }}
                  style={styles.navButton}
                  disabled={
                    formatDateToLocalString(selectedDate) === formatDateToLocalString(new Date()) ||
                    selectedDate > new Date()
                  }
                >
                  <ChevronLeft
                    size={20}
                    color={
                      formatDateToLocalString(selectedDate) === formatDateToLocalString(new Date()) ||
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
                    const dateStr = formatDateToLocalString(selectedDate);
                    const isCurrentHour =
                      formatDateToLocalString(selectedDate) === formatDateToLocalString(new Date()) &&
                      hour.getHours() === new Date().getHours();

                    // Bu saatteki logları filtrele
                    const hourLogs = dailyLogs.filter((log) => {
                      const logDate = new Date(log.created_at);
                      return logDate.getHours() === hour.getHours();
                    });

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
                          {hourLogs.length > 0 ? (
                            <View style={styles.logsContainer}>
                              {hourLogs.map((log) => {
                                if (log.type === "water") {
                                  return (
                                    <View
                                      key={log.id}
                                      style={[
                                        styles.logItem,
                                        { backgroundColor: "#3b82f620" },
                                      ]}
                                    >
                                      <Droplet size={14} color="#3b82f6" />
                                      <Text
                                        style={[
                                          styles.logText,
                                          { color: colors.text },
                                        ]}
                                      >
                                        {log.amount}ml su
                                      </Text>
                                    </View>
                                  );
                                } else if (log.type === "calories") {
                                  // Notes'tan yemek/içecek adını çıkar (örn: "Yemek: Tavuk Döner (yarım porsiyon)" -> "Tavuk Döner")
                                  let displayName = log.notes || "";
                                  if (displayName) {
                                    // "Yemek: " veya "İçecek: " prefix'ini kaldır
                                    displayName = displayName.replace(/^(Yemek|İçecek):\s*/i, "");
                                    // Parantez içindeki detayları kaldır (örn: "(yarım porsiyon)")
                                    displayName = displayName.replace(/\s*\(.*?\)$/, "").trim();
                                  }
                                  // Eğer notes yoksa veya boşsa, sadece kalori göster
                                  if (!displayName) {
                                    displayName = "Yemek/İçecek";
                                  }
                                  
                                  return (
                                    <View
                                      key={log.id}
                                      style={[
                                        styles.logItem,
                                        { backgroundColor: "#f59e0b20" },
                                      ]}
                                    >
                                      <Flame size={14} color="#f59e0b" />
                                      <Text
                                        style={[
                                          styles.logText,
                                          { color: colors.text },
                                        ]}
                                      >
                                        {displayName} • {log.amount}kcal
                                      </Text>
                                    </View>
                                  );
                                } else if (log.type === "exercise") {
                                  // Notes'tan egzersiz adını al, yoksa varsayılan göster
                                  let displayName = log.notes || "Egzersiz";
                                  // "Egzersiz: " veya "Exercise: " prefix'ini kaldır
                                  displayName = displayName.replace(/^(Egzersiz|Exercise):\s*/i, "").trim();
                                  if (!displayName) {
                                    displayName = "Egzersiz";
                                  }
                                  
                                  return (
                                    <View
                                      key={log.id}
                                      style={[
                                        styles.logItem,
                                        { backgroundColor: "#10b98120" },
                                      ]}
                                    >
                                      <Dumbbell size={14} color="#10b981" />
                                      <Text
                                        style={[
                                          styles.logText,
                                          { color: colors.text },
                                        ]}
                                      >
                                        {displayName} • {log.calories_burned || 0}kcal
                                      </Text>
                                    </View>
                                  );
                                }
                                return null;
                              })}
                            </View>
                          ) : (
                            <Text
                              style={[
                                styles.noLogsText,
                                { color: colors.textMuted },
                              ]}
                            >
                              Kayıt yok
                            </Text>
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
                  const dayData = monthlyTrackingData[day.date];
                  const averagePercentage = dayData?.averagePercentage || 0;
                  const isCompleted = averagePercentage >= 100;
                  const isToday = day.date === formatDateToLocalString(new Date());
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  // Tarih string'ini yerel saat dilimine göre parse et
                  const [year, month, dayNum] = day.date.split("-").map(Number);
                  const dayDate = new Date(year, month - 1, dayNum);
                  dayDate.setHours(0, 0, 0, 0);
                  const isPast = dayDate < today;
                  const canInteract = day.isInLast30Days && (isPast || isToday);
                  // Seçili tarihi yerel saat dilimine göre karşılaştır
                  const selectedDateStr = formatDateToLocalString(selectedDate);
                  const isSelected = day.date === selectedDateStr;

                  return (
                    <TouchableOpacity
                      key={`${day.date}-${index}`}
                      onPress={() => {
                        // Sadece tarih seçimi yap, tamamlama durumunu değiştirme
                        // Tarih string'ini yerel saat dilimine göre parse et
                        const [year, month, dayNum] = day.date.split("-").map(Number);
                        const newSelectedDate = new Date(year, month - 1, dayNum);
                        newSelectedDate.setHours(0, 0, 0, 0);
                        setSelectedDate(newSelectedDate);
                        loadDailyData(newSelectedDate);
                      }}
                      onLongPress={() => {
                        // Uzun basışta tamamlama durumunu değiştir
                        if (canInteract) {
                          toggleDay(day.date);
                        }
                      }}
                      disabled={saving || !canInteract}
                      style={[
                        styles.dayCell,
                        {
                          opacity: !day.isInLast30Days ? 0.3 : canInteract ? 1 : 0.5,
                          overflow: "hidden",
                          backgroundColor: isSelected ? colors.primary + "15" : "transparent",
                        },
                      ]}
                    >
                      {/* Alttan yukarı doğru tamamlanma efekti */}
                      {day.isInLast30Days && averagePercentage > 0 && (
                        <View
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: `${averagePercentage}%`,
                            backgroundColor: isCompleted
                              ? "#10b981"
                              : averagePercentage >= 50
                              ? "#10b98180"
                              : "#10b98140",
                            zIndex: 0,
                          }}
                        />
                      )}
                      <Text
                        style={[
                          styles.dayText,
                          {
                            color: colors.text,
                            zIndex: 1,
                            position: "relative",
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

        {/* GÜNLÜK SU, KALORİ VE EGZERSİZ TAKİBİ */}
        <View
          style={[
            styles.dailyTrackingCard,
            isLight && styles.surfaceLift,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
            Günlük Takip - {format(selectedDate, "d MMMM yyyy", { locale: tr })}
          </Text>

          {/* SU İÇME TAKİBİ */}
          {member && (() => {
            const age = calculateAge(member.birth_date);
            const dailyWaterNeed = age && member.weight
              ? calculateDailyWaterNeed(age, member.weight)
              : 2500;
            const waterProgress = dailyData?.water || 0;
            const waterPercentage = Math.min(100, Math.round((waterProgress / dailyWaterNeed) * 100));

            return (
              <View style={styles.dailyTrackingItem}>
                <View style={styles.dailyTrackingHeader}>
                  <View style={styles.dailyTrackingIconContainer}>
                    <View style={[styles.dailyTrackingIcon, { backgroundColor: "#3b82f620" }]}>
                      <Droplet size={20} color="#3b82f6" />
                    </View>
                    <View style={styles.dailyTrackingTextContainer}>
                      <Text style={[styles.dailyTrackingTitle, { color: colors.text }]}>
                        Su İçme
                      </Text>
                      <Text style={[styles.dailyTrackingSubtitle, { color: colors.textMuted }]}>
                        {waterProgress}ml / {dailyWaterNeed}ml
                      </Text>
                    </View>
                  </View>
                  <CircularProgress
                    percentage={waterPercentage}
                    size={80}
                    strokeWidth={8}
                    color="#3b82f6"
                    backgroundColor={colors.background}
                  />
                </View>
              </View>
            );
          })()}

          {/* KALORİ TAKİBİ */}
          {mealPrefs.calories && (() => {
            const caloriesProgress = dailyData?.calories || 0;
            const caloriesTarget = parseInt(mealPrefs.calories);
            const caloriesPercentage = Math.min(100, Math.round((caloriesProgress / caloriesTarget) * 100));
            const isOverTarget = caloriesProgress > caloriesTarget;
            const caloriesColor = isOverTarget ? "#ef4444" : "#f59e0b";

            return (
              <View style={styles.dailyTrackingItem}>
                <View style={styles.dailyTrackingHeader}>
                  <View style={styles.dailyTrackingIconContainer}>
                    <View style={[styles.dailyTrackingIcon, { backgroundColor: "#f59e0b20" }]}>
                      <Flame size={20} color="#f59e0b" />
                    </View>
                    <View style={styles.dailyTrackingTextContainer}>
                      <Text style={[styles.dailyTrackingTitle, { color: colors.text }]}>
                        Kalori
                      </Text>
                      <Text style={[styles.dailyTrackingSubtitle, { color: colors.textMuted }]}>
                        {caloriesProgress}kcal / {caloriesTarget}kcal
                      </Text>
                    </View>
                  </View>
                  <CircularProgress
                    percentage={caloriesPercentage}
                    size={80}
                    strokeWidth={8}
                    color={caloriesColor}
                    backgroundColor={colors.background}
                  />
                </View>
              </View>
            );
          })()}

          {/* EGZERSİZ TAKİBİ */}
          {member && (() => {
            const age = calculateAge(member.birth_date);
            const exerciseCalorieTarget = calculateExerciseCalorieTarget(
              age || undefined,
              member.weight,
              member.height,
              member.gender
            );
            const exerciseCalories = dailyData?.exercise.calories || 0;
            const exercisePercentage = Math.min(100, Math.round((exerciseCalories / exerciseCalorieTarget) * 100));

            return (
              <View style={styles.dailyTrackingItem}>
                <View style={styles.dailyTrackingHeader}>
                  <View style={styles.dailyTrackingIconContainer}>
                    <View style={[styles.dailyTrackingIcon, { backgroundColor: "#10b98120" }]}>
                      <Dumbbell size={20} color="#10b981" />
                    </View>
                    <View style={styles.dailyTrackingTextContainer}>
                      <Text style={[styles.dailyTrackingTitle, { color: colors.text }]}>
                        Egzersiz
                      </Text>
                      <Text style={[styles.dailyTrackingSubtitle, { color: colors.textMuted }]}>
                        {exerciseCalories}kcal / {exerciseCalorieTarget}kcal
                      </Text>
                    </View>
                  </View>
                  <CircularProgress
                    percentage={exercisePercentage}
                    size={80}
                    strokeWidth={8}
                    color="#10b981"
                    backgroundColor={colors.background}
                  />
                </View>
                {mealPrefs.calories && (() => {
                  const totalCalories = (dailyData?.calories || 0) - exerciseCalories;
                  const netCalories = totalCalories;
                  return (
                    <View style={[styles.exerciseInfo, { borderTopColor: colors.border }]}>
                      <Text style={[styles.exerciseInfoText, { color: colors.textMuted }]}>
                        Net Kalori: {netCalories}kcal (Tüketilen: {(dailyData?.calories || 0)}kcal - Yakılan: {exerciseCalories}kcal)
                      </Text>
                    </View>
                  );
                })()}
              </View>
            );
          })()}
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
                <Flame size={20} color="#10b981" />
              </View>
              <Text style={[styles.dashboardStatValue, { color: colors.text }]}>
                {dietStreakDays}
              </Text>
              <Text style={[styles.dashboardStatLabel, { color: colors.textMuted }]}>
                Diyete Devam Etme Günü
              </Text>
            </View>

            <View style={styles.dashboardStatCard}>
              <View style={[styles.statIconCircle, { backgroundColor: "#3b82f620" }]}>
                <CheckCircle2 size={20} color="#3b82f6" />
              </View>
              <Text style={[styles.dashboardStatValue, { color: colors.text }]}>
                {perfectDays}
              </Text>
              <Text style={[styles.dashboardStatLabel, { color: colors.textMuted }]}>
                Mükemmel Gün
              </Text>
            </View>

            <TouchableOpacity
              style={styles.dashboardStatCard}
              onPress={() => {
                if (!targetWeight) {
                  setTargetWeightModalVisible(true);
                }
              }}
              disabled={!!targetWeight}
              activeOpacity={targetWeight ? 1 : 0.7}
            >
              <View style={[styles.statIconCircle, { backgroundColor: "#f59e0b20" }]}>
                <Target size={20} color="#f59e0b" />
              </View>
              <Text style={[styles.dashboardStatValue, { color: colors.text }]}>
                {targetWeight ? `%${Math.min(100, weightProgress)}` : "-"}
              </Text>
              <Text style={[styles.dashboardStatLabel, { color: colors.textMuted }]}>
                {targetWeight ? "Hedef İlerleme" : "Hedef belirlenmedi, eklemek için tıkla"}
              </Text>
            </TouchableOpacity>
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
          onPress={async () => {
            // Su içildi - 200 ml
            setSavingActivity(true);
            const dateStr = formatDateToLocalString(selectedDate);
            const result = await logWaterIntake(200, dateStr, "200ml su içildi");
            setSavingActivity(false);
            
            if (result.success) {
              Alert.alert("Başarılı", "200 ml su kaydı eklendi.");
              // Verileri yeniden yükle
              await loadDailyData(selectedDate);
              // Streak'i güncelle
              await updateStreakOnActivity();
            } else {
              Alert.alert("Hata", result.error || "Su kaydı eklenemedi.");
            }
          }}
          disabled={savingActivity}
          activeOpacity={0.8}
        >
          {savingActivity ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Droplet size={22} color="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.fabBase,
            { backgroundColor: "#f59e0b" },
          ]}
          onPress={() => {
            setModalMode("input");
            setFoodNameInput("");
            setDrinkNameInput("");
            setFoodCaloriesInput("");
            setDrinkCaloriesInput("");
            setFoodDetailsInput("");
            setDrinkDetailsInput("");
            setCapturedImage(null);
            setAiAnalyzedData(null);
            setCaloriesModalVisible(true);
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
            setExerciseNameInput("");
            setExerciseDurationInput("");
            setExerciseModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Dumbbell size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* YEMEK/İÇECEK EKLEME MODAL */}
      <Modal visible={caloriesModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          enabled={true}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {modalMode === "camera"
                  ? "Resim Çek"
                  : modalMode === "imagePreview"
                  ? "Resim Önizleme"
                  : modalMode === "details"
                  ? "Detay Bilgileri"
                  : "Yemek veya İçecek Ekle"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setCaloriesModalVisible(false);
                  setModalMode("input");
                  setFoodNameInput("");
                  setDrinkNameInput("");
                  setFoodCaloriesInput("");
                  setDrinkCaloriesInput("");
                  setFoodDetailsInput("");
                  setDrinkDetailsInput("");
                  setCapturedImage(null);
                  setAiAnalyzedData(null);
                }}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 8 }}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentInsetAdjustmentBehavior="automatic"
              automaticallyAdjustKeyboardInsets={false}
              bounces={false}
            >
                {/* INPUT MODE */}
                {modalMode === "input" && (
                <>
                  <Text
                    style={[
                      styles.modalDesc,
                      { color: colors.textMuted, marginBottom: 20, lineHeight: 20 },
                    ]}
                  >
                    Yemek ve/veya içecek adını girin, kalori girebilir veya AI ile devam edebilirsiniz.
                  </Text>

                  {/* Yemek Bölümü */}
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <UtensilsCrossed size={20} color={colors.primary} style={{ marginRight: 8 }} />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: colors.text,
                        }}
                      >
                        Yemek
                      </Text>
                    </View>
                    <ModernInput
                      label="Yemek Adı (Opsiyonel)"
                      value={foodNameInput}
                      onChangeText={setFoodNameInput}
                      placeholder="Örn: Tavuk Döner"
                      placeholderTextColor={colors.textMuted}
                      style={{ marginTop: 0 }}
                    />
                    {foodNameInput.trim() && (
                      <ModernInput
                        label="Yemek Kalori (kcal) - Opsiyonel"
                        value={foodCaloriesInput}
                        onChangeText={setFoodCaloriesInput}
                        keyboardType="numeric"
                        placeholder="Manuel giriş yapabilirsiniz"
                        placeholderTextColor={colors.textMuted}
                        style={{ marginTop: 12 }}
                      />
                    )}
                  </View>

                  {/* İçecek Bölümü */}
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <Droplet size={20} color={colors.primary} style={{ marginRight: 8 }} />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: colors.text,
                        }}
                      >
                        İçecek
                      </Text>
                    </View>
                    <ModernInput
                      label="İçecek Adı (Opsiyonel)"
                      value={drinkNameInput}
                      onChangeText={setDrinkNameInput}
                      placeholder="Örn: Portakal Suyu"
                      placeholderTextColor={colors.textMuted}
                      style={{ marginTop: 0 }}
                    />
                    {drinkNameInput.trim() && (
                      <ModernInput
                        label="İçecek Kalori (kcal) - Opsiyonel"
                        value={drinkCaloriesInput}
                        onChangeText={setDrinkCaloriesInput}
                        keyboardType="numeric"
                        placeholder="Manuel giriş yapabilirsiniz"
                        placeholderTextColor={colors.textMuted}
                        style={{ marginTop: 12 }}
                      />
                    )}
                  </View>
              </>
            )}

            {/* DETAILS MODE */}
            {modalMode === "details" && (
              <>
                <Text
                  style={[
                    styles.modalDesc,
                    { color: colors.textMuted, marginBottom: 20, lineHeight: 20 },
                  ]}
                >
                  Lütfen detay bilgilerini girin (örneğin: yarım/tam, lavash/ekmek, kutu/şişe/bardak).
                </Text>

                {foodNameInput.trim() && (
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <UtensilsCrossed size={20} color={colors.primary} style={{ marginRight: 8 }} />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: colors.text,
                        }}
                      >
                        Yemek Detayı
                      </Text>
                    </View>
                    <ModernInput
                      label="Detay Bilgisi"
                      value={foodDetailsInput}
                      onChangeText={setFoodDetailsInput}
                      placeholder="Örn: Yarım porsiyon, lavash ile"
                      placeholderTextColor={colors.textMuted}
                      style={{ marginTop: 0 }}
                    />
                  </View>
                )}

                {drinkNameInput.trim() && (
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <Droplet size={20} color={colors.primary} style={{ marginRight: 8 }} />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: colors.text,
                        }}
                      >
                        İçecek Detayı
                      </Text>
                    </View>
                    <ModernInput
                      label="Detay Bilgisi"
                      value={drinkDetailsInput}
                      onChangeText={setDrinkDetailsInput}
                      placeholder="Örn: Kutu kola (330ml)"
                      placeholderTextColor={colors.textMuted}
                      style={{ marginTop: 0 }}
                    />
                  </View>
                )}
              </>
            )}

            {/* CAMERA MODE */}
            {modalMode === "camera" && (
              <>
                <Text
                  style={[
                    styles.modalDesc,
                    { color: colors.textMuted, marginBottom: 20, lineHeight: 20 },
                  ]}
                >
                  Yemek veya içeceğin fotoğrafını çekin.
                </Text>
              </>
            )}

            {/* IMAGE PREVIEW MODE */}
            {modalMode === "imagePreview" && capturedImage && (
              <>
                <Text
                  style={[
                    styles.modalDesc,
                    { color: colors.textMuted, marginBottom: 16, lineHeight: 20 },
                  ]}
                >
                  Çekilen fotoğrafı kontrol edin.
                </Text>
                <Image
                  source={{ uri: `data:image/jpeg;base64,${capturedImage}` }}
                  style={{
                    width: "100%",
                    height: 300,
                    borderRadius: 16,
                    backgroundColor: colors.background,
                    marginBottom: 16,
                  }}
                  resizeMode="contain"
                />
              </>
            )}
            </ScrollView>

            {/* Butonlar - ScrollView dışında */}
            {modalMode === "input" && (
              <View style={[styles.modalButtons, { marginTop: 12 }]}>
                <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setCaloriesModalVisible(false);
                      setModalMode("input");
                      setFoodNameInput("");
                      setDrinkNameInput("");
                      setFoodCaloriesInput("");
                      setDrinkCaloriesInput("");
                    }}
                    style={[
                      styles.modalButton,
                      styles.modalButtonCancel,
                      { borderColor: colors.border, flex: 1 },
                    ]}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>
                      İptal
                    </Text>
                  </TouchableOpacity>

                  {(parseFloat(foodCaloriesInput) > 0 || parseFloat(drinkCaloriesInput) > 0) && (
                    <TouchableOpacity
                      onPress={async () => {
                        const items: Array<{
                          name: string;
                          calories: number;
                          details: string | null;
                          isDrink: boolean;
                          manualCalories?: number;
                        }> = [];

                        if (foodNameInput.trim() && parseFloat(foodCaloriesInput) > 0) {
                          items.push({
                            name: foodNameInput.trim(),
                            calories: parseFloat(foodCaloriesInput),
                            details: null,
                            isDrink: false,
                            manualCalories: parseFloat(foodCaloriesInput),
                          });
                        }

                        if (drinkNameInput.trim() && parseFloat(drinkCaloriesInput) > 0) {
                          items.push({
                            name: drinkNameInput.trim(),
                            calories: parseFloat(drinkCaloriesInput),
                            details: null,
                            isDrink: true,
                            manualCalories: parseFloat(drinkCaloriesInput),
                          });
                        }

                        if (items.length > 0) {
                          setPendingItems(items);
                          setCurrentPendingIndex(0);
                          const firstItem = items[0];
                          setConfirmedCalories(firstItem.calories);
                          setConfirmedDetails(firstItem.details);
                          setConfirmedFoodName(firstItem.name);
                          setConfirmedIsDrink(firstItem.isDrink);
                          // Modal geçişini pürüzsüz yapmak için küçük bir gecikme
                          setCaloriesModalVisible(false);
                          setTimeout(() => {
                            setCaloriesConfirmationModalVisible(true);
                          }, 300);
                        }
                      }}
                      disabled={savingActivity}
                      style={[
                        styles.modalButton,
                        styles.modalButtonConfirm,
                        {
                          backgroundColor: savingActivity ? colors.textMuted : colors.primary,
                          flex: 1,
                        },
                      ]}
                    >
                      {savingActivity ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                          Kaydet
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {!parseFloat(foodCaloriesInput) && !parseFloat(drinkCaloriesInput) && 
                   (foodNameInput.trim() || drinkNameInput.trim()) && (
                    <TouchableOpacity
                      onPress={() => setModalMode("details")}
                      style={[
                        styles.modalButton,
                        styles.modalButtonConfirm,
                        { backgroundColor: colors.primary, flex: 1 },
                      ]}
                    >
                      <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                        Devam Et
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  onPress={async () => {
                    const permission = await ImagePicker.requestCameraPermissionsAsync();
                    if (!permission.granted) {
                      Alert.alert("Hata", "Kamera izni gerekli.");
                      return;
                    }
                    setModalMode("camera");
                  }}
                  style={[
                    styles.modalButton,
                    {
                      backgroundColor: colors.background,
                      borderWidth: 2,
                      borderColor: colors.primary,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Camera size={20} color={colors.primary} style={{ marginRight: 10 }} />
                  <Text style={[styles.modalButtonText, { color: colors.primary }]}>
                    AI ile Resim Çek
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {modalMode === "details" && (
              <View style={styles.modalButtons}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => setModalMode("input")}
                    style={[
                      styles.modalButton,
                      styles.modalButtonCancel,
                      { borderColor: colors.border, flex: 1 },
                    ]}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>
                      Geri
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                  onPress={async () => {
                    const items: Array<{
                      name: string;
                      calories: number;
                      details: string | null;
                      isDrink: boolean;
                    }> = [];

                    if (foodNameInput.trim()) {
                      setCalculatingCalories(true);
                      const { details, calories, error: calcError } =
                        await getFoodDetailsWithCalories(
                          foodNameInput.trim(),
                          false,
                          foodDetailsInput.trim() || undefined
                        );
                      setCalculatingCalories(false);

                      if (calcError || !calories) {
                        Alert.alert("Hata", `Yemek için: ${calcError || "Kalori hesaplanamadı."}`);
                        return;
                      }

                      items.push({
                        name: foodNameInput.trim(),
                        calories: calories!,
                        details: details || foodDetailsInput.trim() || null,
                        isDrink: false,
                      });
                    }

                    if (drinkNameInput.trim()) {
                      setCalculatingCalories(true);
                      const { details, calories, error: calcError } =
                        await getFoodDetailsWithCalories(
                          drinkNameInput.trim(),
                          true,
                          drinkDetailsInput.trim() || undefined
                        );
                      setCalculatingCalories(false);

                      if (calcError || !calories) {
                        Alert.alert("Hata", `İçecek için: ${calcError || "Kalori hesaplanamadı."}`);
                        return;
                      }

                      items.push({
                        name: drinkNameInput.trim(),
                        calories: calories!,
                        details: details || drinkDetailsInput.trim() || null,
                        isDrink: true,
                      });
                    }

                    if (items.length > 0) {
                      setPendingItems(items);
                      setCurrentPendingIndex(0);
                      const firstItem = items[0];
                      setConfirmedCalories(firstItem.calories);
                      setConfirmedDetails(firstItem.details);
                      setConfirmedFoodName(firstItem.name);
                      setConfirmedIsDrink(firstItem.isDrink);
                      // Modal geçişini pürüzsüz yapmak için küçük bir gecikme
                      setCaloriesModalVisible(false);
                      setTimeout(() => {
                        setCaloriesConfirmationModalVisible(true);
                      }, 300);
                    }
                  }}
                  disabled={calculatingCalories}
                  style={[
                    styles.modalButton,
                    styles.modalButtonConfirm,
                    {
                      backgroundColor: calculatingCalories ? colors.textMuted : colors.primary,
                    },
                  ]}
                >
                  {calculatingCalories ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                      Hesapla
                    </Text>
                  )}
                </TouchableOpacity>
                </View>
              </View>
            )}

            {modalMode === "camera" && (
              <View style={styles.modalButtons}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => setModalMode("input")}
                    style={[
                      styles.modalButton,
                      styles.modalButtonCancel,
                      { borderColor: colors.border, flex: 1 },
                    ]}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>
                      Geri
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      const permission = await ImagePicker.requestCameraPermissionsAsync();
                      if (!permission.granted) {
                        Alert.alert("Hata", "Kamera izni gerekli.");
                        return;
                      }

                      const result = await ImagePicker.launchCameraAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: true,
                        quality: 0.8,
                        base64: true,
                      });

                      if (!result.canceled && result.assets[0].base64) {
                        setCapturedImage(result.assets[0].base64);
                        setModalMode("imagePreview");
                      }
                    }}
                    style={[
                      styles.modalButton,
                      styles.modalButtonConfirm,
                      {
                        backgroundColor: colors.primary,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: 1,
                      },
                    ]}
                  >
                    <Camera size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                      Fotoğraf Çek
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {modalMode === "imagePreview" && capturedImage && (
              <View style={styles.modalButtons}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setModalMode("camera");
                      setCapturedImage(null);
                    }}
                    style={[
                      styles.modalButton,
                      styles.modalButtonCancel,
                      { borderColor: colors.border, flex: 1 },
                    ]}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>
                      Yeniden Çek
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      setAiAnalyzing(true);
                      const result = await analyzeFoodFromImage(capturedImage);
                      setAiAnalyzing(false);

                      if (result.error || !result.calories) {
                        Alert.alert("Hata", result.error || "Resim analiz edilemedi.");
                        return;
                      }

                      setConfirmedCalories(result.calories);
                      setConfirmedDetails(result.details);
                      setConfirmedFoodName(result.name || "Bilinmeyen");
                      setConfirmedIsDrink(result.isDrink);
                      // Modal geçişini pürüzsüz yapmak için küçük bir gecikme
                      setCaloriesModalVisible(false);
                      setTimeout(() => {
                        setCaloriesConfirmationModalVisible(true);
                      }, 300);
                    }}
                    disabled={aiAnalyzing}
                    style={[
                      styles.modalButton,
                      styles.modalButtonConfirm,
                      {
                        backgroundColor: aiAnalyzing ? colors.textMuted : colors.primary,
                        flex: 1,
                      },
                    ]}
                  >
                    {aiAnalyzing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                        AI'ye Gönder
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* EGZERSİZ EKLEME MODAL */}
      <Modal visible={exerciseModalVisible} transparent animationType="slide">
        {/* 1. ADIM: Overlay (Arka Plan) KeyboardAvoidingView OLMAMALI. Sabit bir View olmalı. */}
        <View style={styles.modalOverlay}>
          {/* 2. ADIM: KeyboardAvoidingView SADECE içeriği sarmalı ve genişliği %100 olmalı. */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", alignItems: "center", justifyContent: "center" }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
            enabled={true}
          >
            <View style={[styles.modalCard, { backgroundColor: colors.card, minHeight: 350 }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Egzersiz Ekle
                </Text>
                <TouchableOpacity onPress={() => setExerciseModalVisible(false)}>
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 6, paddingTop: 6 }}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                // keyboardDismissMode="on-drag" // Egzersiz modalı kısa olduğu için bunu kapatmak daha stabil olabilir
                contentInsetAdjustmentBehavior="automatic"
                automaticallyAdjustKeyboardInsets={false}
                bounces={false}
              >
                <View>
                  

                  <View style={{ marginTop: 2 }}>
                    <ModernInput
                      label="Egzersiz Adı"
                      value={exerciseNameInput}
                      onChangeText={setExerciseNameInput}
                      placeholder="Örn: Koşu, Yürüyüş, Fitness"
                      placeholderTextColor={colors.textMuted}
                    />

                    <ModernInput
                      label="Süre (dakika)"
                      value={exerciseDurationInput}
                      onChangeText={setExerciseDurationInput}
                      keyboardType="numeric"
                      placeholder="Örn: 30"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={[styles.modalButtons, { marginTop: 12 }]}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setExerciseModalVisible(false);
                      setExerciseNameInput("");
                      setExerciseDurationInput("");
                    }}
                    style={[
                      styles.modalButton,
                      styles.modalButtonCancel,
                      { borderColor: colors.border, flex: 1 },
                    ]}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>
                      İptal
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      const exerciseName = exerciseNameInput.trim();
                      const duration = parseFloat(exerciseDurationInput);

                      if (!exerciseName) {
                        Alert.alert("Hata", "Lütfen egzersiz adını girin.");
                        return;
                      }

                      if (!duration || duration <= 0) {
                        Alert.alert("Hata", "Lütfen geçerli bir süre girin.");
                        return;
                      }

                      setCalculatingExerciseCalories(true);
                      const result = await getExerciseCalories(exerciseName, duration);
                      setCalculatingExerciseCalories(false);

                      if (result.error || !result.caloriesBurned) {
                        Alert.alert(
                          "Hata",
                          result.error || "Kalori hesaplanamadı. Lütfen tekrar deneyin."
                        );
                        return;
                      }

                      setConfirmedExerciseName(exerciseName);
                      setConfirmedExerciseDuration(duration);
                      setConfirmedExerciseCalories(result.caloriesBurned);
                      
                      setExerciseModalVisible(false);
                      setTimeout(() => {
                        setExerciseConfirmationModalVisible(true);
                      }, 300);
                    }}
                    disabled={calculatingExerciseCalories}
                    style={[
                      styles.modalButton,
                      styles.modalButtonConfirm,
                      {
                        backgroundColor: calculatingExerciseCalories
                          ? colors.textMuted
                          : colors.primary,
                        flex: 1,
                      },
                    ]}
                  >
                    {calculatingExerciseCalories ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                        AI ile Hesapla
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* KALORİ ONAY EKRANI MODAL */}
      <Modal
        visible={caloriesConfirmationModalVisible}
        transparent
        animationType="slide"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card, maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Kalori Onayı
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setCaloriesConfirmationModalVisible(false);
                  setModalMode("input");
                  setCaloriesModalVisible(true);
                }}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={true}
              style={{ maxHeight: 500 }}
              contentContainerStyle={{ paddingBottom: 16 }}
              nestedScrollEnabled={true}
            >
              {pendingItems.length > 1 && (
                <View
                  style={{
                    backgroundColor: colors.primary + "15",
                    padding: 12,
                    borderRadius: 12,
                    marginBottom: 16,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={[
                      styles.modalDesc,
                      {
                        color: colors.primary,
                        fontSize: 13,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {currentPendingIndex + 1} / {pendingItems.length}
                  </Text>
                  <Text
                    style={[
                      styles.modalDesc,
                      {
                        color: colors.textMuted,
                        fontSize: 11,
                        marginTop: 4,
                      },
                    ]}
                  >
                    {pendingItems.length - currentPendingIndex - 1 > 0
                      ? `${pendingItems.length - currentPendingIndex - 1} öğe daha var`
                      : "Son öğe"}
                  </Text>
                </View>
              )}

              {/* Tüm Öğeleri Göster */}
              {pendingItems.map((item, index) => (
                <View key={index} style={{ marginBottom: 16 }}>
                  {/* İkon ve Başlık */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 12,
                      paddingBottom: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    {item.isDrink ? (
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: colors.primary + "20",
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 12,
                        }}
                      >
                        <Droplet size={24} color={colors.primary} />
                      </View>
                    ) : (
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: colors.primary + "20",
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 12,
                        }}
                      >
                        <UtensilsCrossed size={24} color={colors.primary} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.modalDesc,
                          {
                            color: colors.textMuted,
                            fontSize: 11,
                            fontWeight: "600",
                            textTransform: "uppercase",
                            marginBottom: 4,
                            letterSpacing: 0.5,
                          },
                        ]}
                      >
                        {item.isDrink ? "İçecek" : "Yemek"}
                      </Text>
                      <Text
                        style={[
                          styles.modalDesc,
                          {
                            color: colors.text,
                            fontSize: 16,
                            fontWeight: "700",
                            lineHeight: 22,
                          },
                        ]}
                      >
                        {item.name}
                      </Text>
                    </View>
                  </View>

                  {/* Detay Bilgisi */}
                  {item.details && (
                    <View
                      style={{
                        backgroundColor: colors.background,
                        padding: 12,
                        borderRadius: 12,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text
                        style={[
                          styles.modalDesc,
                          {
                            color: colors.textMuted,
                            fontSize: 11,
                            fontWeight: "600",
                            marginBottom: 6,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          },
                        ]}
                      >
                        Detay Bilgisi
                      </Text>
                      <Text
                        style={[
                          styles.modalDesc,
                          {
                            color: colors.text,
                            fontSize: 14,
                            fontWeight: "500",
                            lineHeight: 20,
                          },
                        ]}
                      >
                        {item.details}
                      </Text>
                    </View>
                  )}

                  {/* Kalori Kartı */}
                  <View
                    style={{
                      backgroundColor: colors.primary + "10",
                      padding: 12,
                      borderRadius: 12,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: colors.primary + "20",
                    }}
                  >
                    <View>
                      <Text
                        style={[
                          styles.modalDesc,
                          {
                            color: colors.textMuted,
                            fontSize: 11,
                            fontWeight: "600",
                            marginBottom: 4,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          },
                        ]}
                      >
                        Kalori
                      </Text>
                      <Text
                        style={[
                          styles.modalDesc,
                          {
                            color: colors.text,
                            fontSize: 12,
                            fontWeight: "500",
                          },
                        ]}
                      >
                        AI ile hesaplandı
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={[
                          styles.modalTitle,
                          {
                            color: colors.primary,
                            fontSize: 20,
                            fontWeight: "700",
                            lineHeight: 24,
                          },
                        ]}
                      >
                        {item.calories}
                      </Text>
                      <Text
                        style={[
                          styles.modalDesc,
                          {
                            color: colors.textMuted,
                            fontSize: 11,
                            fontWeight: "600",
                            marginTop: 2,
                          },
                        ]}
                      >
                        kcal
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {/* Toplam Kalori (Eğer birden fazla öğe varsa) */}
              {pendingItems.length > 1 && (
                <View
                  style={{
                    backgroundColor: colors.primary + "15",
                    padding: 12,
                    borderRadius: 12,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderWidth: 1.5,
                    borderColor: colors.primary + "40",
                    marginTop: 4,
                    marginBottom: 12,
                  }}
                >
                  <View>
                    <Text
                      style={[
                        styles.modalDesc,
                        {
                          color: colors.primary,
                          fontSize: 11,
                          fontWeight: "700",
                          marginBottom: 4,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        },
                      ]}
                    >
                      Toplam Kalori
                    </Text>
                    <Text
                      style={[
                        styles.modalDesc,
                        {
                          color: colors.textMuted,
                          fontSize: 12,
                          fontWeight: "500",
                        },
                      ]}
                    >
                      {pendingItems.length} öğe
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={[
                        styles.modalTitle,
                        {
                          color: colors.primary,
                          fontSize: 22,
                          fontWeight: "700",
                          lineHeight: 26,
                        },
                      ]}
                    >
                      {pendingItems.reduce((sum, item) => sum + item.calories, 0)}
                    </Text>
                    <Text
                      style={[
                        styles.modalDesc,
                        {
                          color: colors.textMuted,
                          fontSize: 11,
                          fontWeight: "600",
                          marginTop: 2,
                        },
                      ]}
                    >
                      kcal
                    </Text>
                  </View>
                </View>
              )}

              <Text
                style={[
                  styles.modalDesc,
                  {
                    color: colors.textMuted,
                    fontSize: 14,
                    lineHeight: 20,
                    textAlign: "center",
                    marginBottom: 8,
                  },
                ]}
              >
                Bu bilgileri kaydetmek istediğinize emin misiniz?
              </Text>
            </ScrollView>

            <View style={styles.modalButtons}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setCaloriesConfirmationModalVisible(false);
                    setModalMode("input");
                    setCaloriesModalVisible(true);
                    setPendingItems([]);
                    setCurrentPendingIndex(0);
                  }}
                  style={[
                    styles.modalButton,
                    styles.modalButtonCancel,
                    { borderColor: colors.border, flex: 1 },
                  ]}
                >
                  <ArrowLeft size={24} color={colors.text} strokeWidth={2.5} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    if (!confirmedCalories) {
                      Alert.alert("Hata", "Kalori bilgisi bulunamadı.");
                      return;
                    }

                    setSavingActivity(true);
                    const dateStr = formatDateToLocalString(selectedDate);
                    const notes = confirmedDetails
                      ? `${confirmedIsDrink ? "İçecek" : "Yemek"}: ${confirmedFoodName} (${confirmedDetails})`
                      : `${confirmedIsDrink ? "İçecek" : "Yemek"}: ${confirmedFoodName}`;
                    const result = await logCalories(
                      confirmedCalories,
                      dateStr,
                      notes
                    );
                    setSavingActivity(false);

                    if (result.success) {
                      // Eğer daha fazla item varsa, bir sonrakine geç
                      if (currentPendingIndex < pendingItems.length - 1) {
                        const nextIndex = currentPendingIndex + 1;
                        const nextItem = pendingItems[nextIndex];
                        setCurrentPendingIndex(nextIndex);
                        setConfirmedCalories(nextItem.calories);
                        setConfirmedDetails(nextItem.details);
                        setConfirmedFoodName(nextItem.name);
                        setConfirmedIsDrink(nextItem.isDrink);
                      } else {
                        // Tüm item'lar kaydedildi
                        Alert.alert(
                          "Başarılı",
                          `Tüm öğeler kaydedildi.`
                        );
                        setCaloriesConfirmationModalVisible(false);
                        setCaloriesModalVisible(false);
                        setFoodNameInput("");
                        setDrinkNameInput("");
                        setFoodCaloriesInput("");
                        setDrinkCaloriesInput("");
                        setPendingItems([]);
                        setCurrentPendingIndex(0);
                        setConfirmedCalories(null);
                        setConfirmedDetails(null);
                        setConfirmedFoodName("");
                        // Verileri yeniden yükle
                        await loadDailyData(selectedDate);
                        // Streak'i güncelle
                        await updateStreakOnActivity();
                      }
                    } else {
                      Alert.alert("Hata", result.error || "Kalori kaydı eklenemedi.");
                    }
                  }}
                  disabled={savingActivity || !confirmedCalories}
                  style={[
                    styles.modalButton,
                    styles.modalButtonConfirm,
                    {
                      backgroundColor:
                        savingActivity || !confirmedCalories
                          ? colors.textMuted
                          : colors.primary,
                      flex: 1,
                    },
                  ]}
                >
                  {savingActivity ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Check size={24} color="#fff" strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* EGZERSİZ ONAY EKRANI MODAL */}
      <Modal
        visible={exerciseConfirmationModalVisible}
        transparent
        animationType="slide"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card, maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Egzersiz Onayı
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setExerciseConfirmationModalVisible(false);
                  setExerciseModalVisible(true);
                }}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={true}
              
              contentContainerStyle={{ paddingBottom: 4, flexGrow: 1 }}
              nestedScrollEnabled={true}
            >
              <View style={{ marginBottom: 4 }}>
                {/* İkon ve Başlık */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 4,
                    paddingBottom: 4,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: "#10b98120",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <Dumbbell size={24} color="#10b981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.modalDesc,
                        {
                          color: colors.textMuted,
                          fontSize: 11,
                          fontWeight: "600",
                          textTransform: "uppercase",
                          marginBottom: 4,
                          letterSpacing: 0.5,
                        },
                      ]}
                    >
                      Egzersiz
                    </Text>
                    <Text
                      style={[
                        styles.modalDesc,
                        {
                          color: colors.text,
                          fontSize: 16,
                          fontWeight: "700",
                          lineHeight: 22,
                        },
                      ]}
                    >
                      {confirmedExerciseName}
                    </Text>
                  </View>
                </View>

                {/* Detaylar */}
                <View style={{ marginBottom: 12 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      backgroundColor: colors.background,
                      borderRadius: 12,
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={[
                        styles.modalDesc,
                        {
                          color: colors.textMuted,
                          fontSize: 13,
                        },
                      ]}
                    >
                      Süre
                    </Text>
                    <Text
                      style={[
                        styles.modalTitle,
                        {
                          color: colors.text,
                          fontSize: 15,
                          fontWeight: "600",
                        },
                      ]}
                    >
                      {confirmedExerciseDuration} dakika
                    </Text>
                  </View>

                  {/* Kalori Kartı */}
                  <View
                    style={{
                      backgroundColor: "#10b98110",
                      padding: 12,
                      borderRadius: 12,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#10b98120",
                    }}
                  >
                    <View>
                      <Text
                        style={[
                          styles.modalDesc,
                          {
                            color: colors.textMuted,
                            fontSize: 11,
                            fontWeight: "600",
                            marginBottom: 4,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          },
                        ]}
                      >
                        AI ile Hesaplanan Kalori
                      </Text>
                      <Text
                        style={[
                          styles.modalDesc,
                          {
                            color: colors.text,
                            fontSize: 12,
                            fontWeight: "500",
                          },
                        ]}
                      >
                        Yakılan kalori
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={[
                          styles.modalTitle,
                          {
                            color: "#10b981",
                            fontSize: 20,
                            fontWeight: "700",
                            lineHeight: 24,
                          },
                        ]}
                      >
                        {confirmedExerciseCalories || 0}
                      </Text>
                      <Text
                        style={[
                          styles.modalDesc,
                          {
                            color: colors.textMuted,
                            fontSize: 11,
                            fontWeight: "600",
                            marginTop: 2,
                          },
                        ]}
                      >
                        kcal
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setExerciseConfirmationModalVisible(false);
                    setExerciseModalVisible(true);
                  }}
                  style={[
                    styles.modalButton,
                    styles.modalButtonCancel,
                    { borderColor: colors.border, flex: 1 },
                  ]}
                >
                  <ArrowLeft size={24} color={colors.text} strokeWidth={2.5} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    if (!confirmedExerciseCalories) {
                      Alert.alert("Hata", "Kalori bilgisi bulunamadı.");
                      return;
                    }

                    setSavingActivity(true);
                    const dateStr = formatDateToLocalString(selectedDate);
                    const result = await logExercise(
                      confirmedExerciseDuration,
                      confirmedExerciseCalories,
                      dateStr,
                      confirmedExerciseName
                    );
                    setSavingActivity(false);

                    if (result.success) {
                      Alert.alert(
                        "Başarılı",
                        `${confirmedExerciseName} egzersizi kaydedildi.`
                      );
                      setExerciseConfirmationModalVisible(false);
                      setExerciseModalVisible(false);
                      setExerciseNameInput("");
                      setExerciseDurationInput("");
                      setConfirmedExerciseName("");
                      setConfirmedExerciseDuration(0);
                      setConfirmedExerciseCalories(null);
                      // Verileri yeniden yükle
                      await loadDailyData(selectedDate);
                      // Streak'i güncelle
                      await updateStreakOnActivity();
                    } else {
                      Alert.alert("Hata", result.error || "Egzersiz kaydı eklenemedi.");
                    }
                  }}
                  disabled={savingActivity || !confirmedExerciseCalories}
                  style={[
                    styles.modalButton,
                    styles.modalButtonConfirm,
                    {
                      backgroundColor:
                        savingActivity || !confirmedExerciseCalories
                          ? colors.textMuted
                          : colors.primary,
                      flex: 1,
                    },
                  ]}
                >
                  {savingActivity ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Check size={24} color="#fff" strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* HEDEF KİLO MODAL */}
      <Modal visible={targetWeightModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, maxHeight: "90%" }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Hedef Kilo Belirle
                </Text>
                <TouchableOpacity onPress={() => setTargetWeightModalVisible(false)}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{ paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                bounces={false}
              >
                <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
                  Diyet programınız için hedef kilonuzu belirleyin. Bu bilgi ilerleme durumunuzu hesaplamak için kullanılacaktır.
                </Text>

                <ModernInput
                  label="Hedef Kilo (kg)"
                  value={targetWeightInput}
                  onChangeText={setTargetWeightInput}
                  keyboardType="decimal-pad"
                  placeholder="Örn: 70"
                  placeholderTextColor={colors.textMuted}
                  style={{ marginTop: 16 }}
                />

                {startWeight > 0 && (
                  <Text style={[styles.modalDesc, { color: colors.textMuted, marginTop: 8, fontSize: 12 }]}>
                    Mevcut kilo: {startWeight} kg
                  </Text>
                )}
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setTargetWeightModalVisible(false);
                    setTargetWeightInput("");
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
                  onPress={async () => {
                    if (!targetWeightInput || !profile?.id) return;

                    const weightValue = parseFloat(targetWeightInput.replace(",", "."));
                    if (isNaN(weightValue) || weightValue <= 0 || weightValue > 300) {
                      Alert.alert("Hata", "Geçerli bir kilo girin (0-300 kg arası).");
                      return;
                    }

                    setSaving(true);
                    try {
                      setTargetWeight(weightValue);
                      await AsyncStorage.setItem(
                        `diet_target_weight_${profile.id}`,
                        weightValue.toString()
                      );

                      // meal_preferences'a da kaydet
                      if (member) {
                        const updatedPrefs = {
                          ...member.meal_preferences,
                          target_weight: weightValue.toString(),
                        };
                        await updateMemberDetails(profile.id, {
                          meal_preferences: updatedPrefs,
                        });
                      }

                      setTargetWeightModalVisible(false);
                      setTargetWeightInput("");
                      Alert.alert("Başarılı", "Hedef kilo kaydedildi.");
                    } catch (error) {
                      Alert.alert("Hata", "Hedef kilo kaydedilemedi.");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  style={[styles.modalButton, styles.modalButtonSave, { backgroundColor: colors.primary }]}
                  disabled={saving || !targetWeightInput}
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
        </KeyboardAvoidingView>
      </Modal>

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
    padding: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 0,
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 0,
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
    width: "100%",
    gap: 6,
    paddingHorizontal: 0,
  },
  dayCell: {
    width: "12.5%",
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
    marginBottom: 12,
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
    flexWrap: "wrap",
  },
  logsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
  },
  logItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  logText: {
    fontSize: 12,
    fontWeight: "600",
  },
  noLogsText: {
    fontSize: 12,
    fontStyle: "italic",
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
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  streakContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  streakIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  streakTextContainer: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  targetWeightCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  targetWeightContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  targetWeightIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  targetWeightTextContainer: {
    flex: 1,
  },
  targetWeightTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  targetWeightInfo: {
    flexDirection: "column",
  },
  targetWeightValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  targetWeightProgress: {
    fontSize: 12,
    marginTop: 4,
  },
  setTargetButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  setTargetButtonText: {
    fontSize: 14,
    fontWeight: "700",
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
  dailyTrackingCard: {
    borderRadius: 24,
    padding: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 0,
  },
  dailyTrackingItem: {
    marginBottom: 20,
  },
  dailyTrackingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dailyTrackingIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dailyTrackingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dailyTrackingTextContainer: {
    flex: 1,
  },
  dailyTrackingTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  dailyTrackingSubtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  dailyTrackingPercentage: {
    fontSize: 18,
    fontWeight: "800",
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  exerciseInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  exerciseInfoText: {
    fontSize: 12,
    fontWeight: "500",
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    ...Platform.select({
      ios: {
        paddingTop: 40,
        paddingBottom: 40,
      },
    }),
  },
  modalCard: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 24,
    padding: 24,
    maxHeight: "90%",
    alignSelf: "center",
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
    marginTop: 20,
    flexShrink: 0,
    gap: 12,
  },
  modalButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 52,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonCancel: {
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  modalButtonSave: {
    // backgroundColor handled by inline style
  },
  modalButtonConfirm: {
    // backgroundColor handled by inline style
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  foodTypeSelector: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  foodTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  foodTypeButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  calculatedCaloriesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  calculatedCaloriesLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  calculatedCaloriesValue: {
    fontSize: 18,
    fontWeight: "800",
  },
});
