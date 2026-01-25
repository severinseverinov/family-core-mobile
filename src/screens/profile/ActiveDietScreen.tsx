import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Platform,
  KeyboardAvoidingView,
  Animated,
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
  ChevronRight,
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
  RotateCcw,
  Play,
  Pause,
  Square,
  Timer,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import HeartbeatLoader from "../../components/ui/HeartbeatLoader";
import {
  getMemberById,
  FamilyMember,
  updateMemberDetails,
} from "../../services/family";
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
import * as Notifications from "expo-notifications";
import { generateDietPlan } from "../../services/kitchen";
import {
  getDietPlanForDate,
  getActiveDietPlan,
} from "../../services/dietPlans";
import SelectionGroup from "../../components/ui/SelectionGroup";
import {
  generateExercisePlan,
  saveExercisePlan,
  getExercisePlanForDate,
  ExercisePlan,
} from "../../services/exercisePlans";
import {
  playStartWhistle,
  playShortWhistle,
  playTickOnce,
  initAudioAndRequestPermission,
  setSoundsEnabled,
} from "../../utils/exerciseSounds";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";

export default function ActiveDietScreen({ navigation }: any) {
  const { colors, themeMode, setThemeMode } = useTheme();
  const isLight = themeMode === "light";
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [dietProgress, setDietProgress] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [weightHistory, setWeightHistory] = useState<
    Array<{ date: string; weight: number; week: number }>
  >([]);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [continueDietModalVisible, setContinueDietModalVisible] =
    useState(false);
  const [dietStreakDays, setDietStreakDays] = useState(0); // Diyete devam etme günü skoru
  const [targetWeight, setTargetWeight] = useState<number | null>(null); // Hedef kilo
  const [targetWeightModalVisible, setTargetWeightModalVisible] =
    useState(false);
  const [targetWeightInput, setTargetWeightInput] = useState("");
  const [waterReminderEnabled, setWaterReminderEnabled] = useState(false);
  const [savingWaterReminder, setSavingWaterReminder] = useState(false);
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("monthly");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [activeTab, setActiveTab] = useState<"tracking" | "diet" | "exercise">(
    "tracking",
  );
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [dailyData, setDailyData] = useState<{
    water: number;
    calories: number;
    exercise: { duration: number; calories: number };
  } | null>(null);
  const [caloriesModalVisible, setCaloriesModalVisible] = useState(false);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [exerciseTimerModalVisible, setExerciseTimerModalVisible] =
    useState(false);
  const [foodNameInput, setFoodNameInput] = useState("");
  const [drinkNameInput, setDrinkNameInput] = useState("");
  const [foodCaloriesInput, setFoodCaloriesInput] = useState("");
  const [drinkCaloriesInput, setDrinkCaloriesInput] = useState("");
  const [calculatingCalories, setCalculatingCalories] = useState(false);
  const [exerciseNameInput, setExerciseNameInput] = useState("");
  const [exerciseDurationInput, setExerciseDurationInput] = useState("");
  const [exerciseCaloriesInput, setExerciseCaloriesInput] = useState("");
  const [calculatingExerciseCalories, setCalculatingExerciseCalories] =
    useState(false);
  const [
    exerciseConfirmationModalVisible,
    setExerciseConfirmationModalVisible,
  ] = useState(false);
  const [confirmedExerciseName, setConfirmedExerciseName] = useState("");
  const [confirmedExerciseDuration, setConfirmedExerciseDuration] = useState(0);
  const [confirmedExerciseCalories, setConfirmedExerciseCalories] = useState<
    number | null
  >(null);
  const [savingActivity, setSavingActivity] = useState(false);
  const [dailyLogs, setDailyLogs] = useState<DailyTrackingLog[]>([]);
  const [monthlyTrackingData, setMonthlyTrackingData] = useState<
    Record<
      string,
      {
        waterPercentage: number;
        caloriesPercentage: number;
        exercisePercentage: number;
        averagePercentage: number;
      }
    >
  >({});
  // Kalori onay ekranı için state'ler
  const [
    caloriesConfirmationModalVisible,
    setCaloriesConfirmationModalVisible,
  ] = useState(false);
  const [confirmedCalories, setConfirmedCalories] = useState<number | null>(
    null,
  );
  const [confirmedDetails, setConfirmedDetails] = useState<string | null>(null);
  const [confirmedFoodName, setConfirmedFoodName] = useState("");
  const [confirmedIsDrink, setConfirmedIsDrink] = useState(false);
  const [pendingItems, setPendingItems] = useState<
    Array<{
      name: string;
      calories: number;
      details: string | null;
      isDrink: boolean;
      manualCalories?: number;
    }>
  >([]);
  const [currentPendingIndex, setCurrentPendingIndex] = useState(0);
  // Modal modları: 'input' | 'details' | 'camera' | 'imagePreview'
  const [modalMode, setModalMode] = useState<
    "input" | "details" | "camera" | "imagePreview"
  >("input");
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
  const [currentDietPlan, setCurrentDietPlan] = useState<any>(null); // Veritabanından yüklenen diyet planı
  const [budgetPreference, setBudgetPreference] = useState<
    "affordable" | "moderate" | "expensive"
  >("moderate"); // Masraf tercihi
  const [difficultyPreference, setDifficultyPreference] = useState<
    "easy" | "moderate" | "difficult"
  >("moderate"); // Yapılış zorluğu
  const [dietPlanModalVisible, setDietPlanModalVisible] = useState(false); // Diyet programı oluşturma modalı
  const [pendingDietPlan, setPendingDietPlan] = useState<any>(null); // Bekleyen diyet planı (onay için)
  const [dietPlanApprovalVisible, setDietPlanApprovalVisible] = useState(false); // Diyet planı onay modalı
  const [currentExercisePlan, setCurrentExercisePlan] = useState<
    ExercisePlan["exercise_plan"] | null
  >(null); // Günlük egzersiz planı
  const [equipmentPreference, setEquipmentPreference] = useState<
    "home_no_equipment" | "home_with_equipment" | "gym"
  >("home_no_equipment"); // Ekipman tercihi
  const [fitnessLevel, setFitnessLevel] = useState<
    "beginner" | "intermediate" | "advanced"
  >("intermediate"); // Fitness seviyesi
  const [generatingExercisePlan, setGeneratingExercisePlan] = useState(false); // Egzersiz planı oluşturuluyor mu

  // Egzersiz Timer State'leri
  const [exerciseTimerActive, setExerciseTimerActive] = useState(false);
  const [exerciseTimerPaused, setExerciseTimerPaused] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0); // seconds
  const [currentExerciseStep, setCurrentExerciseStep] = useState(0);
  const [burnedCaloriesInSession, setBurnedCaloriesInSession] = useState(0);
  const [totalExerciseTime, setTotalExerciseTime] = useState(0); // seconds
  const [hasUnfinishedExercise, setHasUnfinishedExercise] = useState(false);
  const [isReadingTime, setIsReadingTime] = useState(false); // Egzersiz arası okuma süresi
  const [readingTimeLeft, setReadingTimeLeft] = useState(10); // Kalan okuma süresi
  const [readingTimeNextExerciseIndex, setReadingTimeNextExerciseIndex] =
    useState<number | null>(null); // Okuma ekranında gösterilecek sonraki egzersiz indeksi
  const [borderOpacity] = useState(new Animated.Value(0)); // Kart kenarlığı animasyonu
  const [completedMeals, setCompletedMeals] = useState<Record<string, boolean>>(
    {},
  ); // Tamamlanan öğünler (key: date_time formatı)
  const [completedExercises, setCompletedExercises] = useState<
    Record<string, boolean>
  >({}); // Tamamlanan egzersizler (key: date_exerciseIndex formatı)

  // Diyet ilerlemesini yükle
  const loadDietProgress = useCallback(async () => {
    if (!profile?.id) return;
    try {
      // Tüm tamamlanmış günleri temizle (eski verileri sıfırla)
      await AsyncStorage.removeItem(`diet_progress_${profile.id}`);
      setDietProgress({});

      // Kilo geçmişini yükle
      const weightStored = await AsyncStorage.getItem(
        `diet_weight_history_${profile.id}`,
      );
      if (weightStored) {
        setWeightHistory(JSON.parse(weightStored));
      }

      // Diyete devam etme günü skorunu yükle
      const streakStored = await AsyncStorage.getItem(
        `diet_streak_days_${profile.id}`,
      );
      if (streakStored) {
        setDietStreakDays(parseInt(streakStored, 10) || 0);
      } else {
        setDietStreakDays(0);
      }
    } catch (error) {
      // Hata sessizce yok sayılıyor
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
  const loadDailyData = useCallback(
    async (date: Date) => {
      if (!profile?.id) return;
      try {
        const dateStr = formatDateToLocalString(date);

        // Önce veritabanından yükle
        const { data: tracking, error } =
          await getOrCreateDailyTracking(dateStr);

        if (error) {
          // Hata durumunda AsyncStorage'dan yükle (fallback)
          const stored = await AsyncStorage.getItem(
            `daily_data_${profile.id}_${dateStr}`,
          );
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
        const { data: logs, error: logsError } = await getDailyTrackingLogs(
          dateStr,
          dateStr,
        );
        if (!logsError && logs) {
          setDailyLogs(logs);
        } else {
          setDailyLogs([]);
        }

        // Günlük aktivite takibi: Bugün için aktivite var mı kontrol et
        await checkAndUpdateDietStreak(dateStr, tracking, logs || []);

        // Diyet planını yükle
        await loadDietPlanForDate(dateStr);

        // Egzersiz planını yükle
        await loadExercisePlanForDate(dateStr);
      } catch (error) {
        setDailyData({
          water: 0,
          calories: 0,
          exercise: { duration: 0, calories: 0 },
        });
        setDailyLogs([]);
      }
    },
    [profile?.id],
  );

  // Seçili tarih için egzersiz planını yükle
  const loadExercisePlanForDate = useCallback(
    async (dateStr: string) => {
      if (!profile?.id || !member) return;

      // Önce diyet aktif mi kontrol et
      const mealPrefs = member.meal_preferences || {};
      const dietActiveValue: any = mealPrefs.diet_active;
      const isActive =
        dietActiveValue === true ||
        (typeof dietActiveValue === "string" &&
          dietActiveValue.toLowerCase() === "true") ||
        (typeof dietActiveValue === "number" && dietActiveValue === 1);

      if (!isActive) {
        setCurrentExercisePlan(null);
        return;
      }

      try {
        const { data: exercisePlan, error } =
          await getExercisePlanForDate(dateStr);
        if (error) {
          setCurrentExercisePlan(null);
          return;
        }
        setCurrentExercisePlan(exercisePlan?.exercise_plan || null);
      } catch (error) {
        setCurrentExercisePlan(null);
      }
    },
    [profile?.id, member],
  );

  // Seçili tarih için diyet planını yükle
  const loadDietPlanForDate = useCallback(
    async (dateStr: string) => {
      if (!profile?.id || !member) return;

      // Önce diyet aktif mi kontrol et
      const mealPrefs = member.meal_preferences || {};
      const dietActiveValue: any = mealPrefs.diet_active;
      const isActive =
        dietActiveValue === true ||
        (typeof dietActiveValue === "string" &&
          dietActiveValue.toLowerCase() === "true") ||
        (typeof dietActiveValue === "number" && dietActiveValue === 1);

      if (!isActive) {
        // Diyet aktif değilse plan yükleme
        setCurrentDietPlan(null);
        return;
      }

      try {
        const { data: dietPlan, error } = await getDietPlanForDate(dateStr);
        if (error) {
          setCurrentDietPlan(null);
          return;
        }
        setCurrentDietPlan(dietPlan?.diet_plan || null);

        // Bildirimleri zamanla
        if (dietPlan?.diet_plan?.daily_meal_plans) {
          const dayPlan = dietPlan.diet_plan.daily_meal_plans.find(
            (dp: any) => {
              if (!dp || !dp.date) return false;
              const planDate = String(dp.date).trim();
              return planDate === dateStr;
            },
          );

          if (dayPlan?.meals) {
            const dateObj = new Date(dateStr);
            await scheduleMealNotifications(dayPlan.meals, dateObj);
          }
        }
      } catch (error) {
        setCurrentDietPlan(null);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [profile?.id, member],
  );

  // Diyete devam etme günü skorunu kontrol et ve güncelle
  const checkAndUpdateDietStreak = async (
    dateStr: string,
    tracking: any,
    logs: DailyTrackingLog[],
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
        `diet_last_streak_date_${profile.id}`,
      );
      const today = formatDateToLocalString(new Date());
      const yesterday = formatDateToLocalString(
        new Date(new Date().setDate(new Date().getDate() - 1)),
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
        newStreak.toString(),
      );
      await AsyncStorage.setItem(`diet_last_streak_date_${profile.id}`, today);
    } catch (error) {
      // Hata sessizce yok sayılıyor
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

  // Tamamlanan öğünleri yükle
  const loadCompletedMeals = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const dateStr = formatDateToLocalString(selectedDate);
      const key = `completed_meals_${profile.id}_${dateStr}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        setCompletedMeals(JSON.parse(stored));
      } else {
        setCompletedMeals({});
      }
    } catch (error) {
      setCompletedMeals({});
    }
  }, [profile?.id, selectedDate]);

  // Tamamlanan egzersizleri yükle
  const loadCompletedExercises = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const dateStr = formatDateToLocalString(selectedDate);
      const key = `completed_exercises_${profile.id}_${dateStr}`;

      const stored = await AsyncStorage.getItem(key);

      if (stored) {
        const parsedData = JSON.parse(stored);
        setCompletedExercises(parsedData);
      } else {
        setCompletedExercises({});
      }
    } catch (error) {
      console.error("❌ Egzersiz yükleme hatası:", error);
      setCompletedExercises({});
    }
  }, [profile?.id, selectedDate]);

  // Egzersizi tamamlandı olarak işaretle
  const markExerciseCompleted = useCallback(
    async (exerciseIndex: number, dateStr: string) => {
      if (!profile?.id) return;
      try {
        const key = `${dateStr}_${exerciseIndex}`;

        // State'i direkt güncelle
        const updatedCompleted = { ...completedExercises, [key]: true };
        setCompletedExercises(updatedCompleted);

        // AsyncStorage'a kaydet
        const storageKey = `completed_exercises_${profile.id}_${dateStr}`;
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify(updatedCompleted),
        );
      } catch (error) {
        console.error("Egzersiz tamamlama durumu kaydedilemedi:", error);
      }
    },
    [profile?.id, completedExercises],
  );

  // Tamamlanan egzersizlerin istatistiklerini hesapla
  const calculateCompletedExerciseStats = useCallback(() => {
    if (!currentExercisePlan?.exercises || !profile?.id)
      return { count: 0, duration: 0, calories: 0 };

    const dateStr = formatDateToLocalString(selectedDate);
    let completedCount = 0;
    let totalDuration = 0;
    let totalCalories = 0;

    currentExercisePlan.exercises.forEach((exercise: any, index: number) => {
      const exerciseKey = `${dateStr}_${index}`;
      if (completedExercises[exerciseKey]) {
        completedCount++;
        totalDuration += exercise.duration || 0;
        totalCalories += exercise.calories || 0;
      }
    });

    return {
      count: completedCount,
      duration: totalDuration,
      calories: totalCalories,
    };
  }, [currentExercisePlan, completedExercises, selectedDate, profile?.id]);

  // Öğün bildirimlerini zamanla
  const scheduleMealNotifications = useCallback(
    async (meals: any[], date: Date) => {
      if (!profile?.id || !meals || meals.length === 0) return;

      try {
        // Önce mevcut bildirimleri iptal et
        await Notifications.cancelAllScheduledNotificationsAsync();

        const dateStr = formatDateToLocalString(date);
        const today = formatDateToLocalString(new Date());

        // Sadece bugün ve gelecek günler için bildirim zamanla
        if (dateStr < today) return;

        for (const meal of meals) {
          if (!meal.time || !meal.meal) continue;

          const [hours, minutes] = meal.time.split(":").map(Number);
          const notificationDate = new Date(date);
          notificationDate.setHours(hours, minutes, 0, 0);

          // Geçmiş saatler için bildirim zamanlama
          if (notificationDate <= new Date()) continue;

          const mealKey = `${dateStr}_${meal.time}`;
          const mealTypeLabel =
            meal.type === "breakfast"
              ? "Kahvaltı"
              : meal.type === "lunch"
                ? "Öğle Yemeği"
                : meal.type === "dinner"
                  ? "Akşam Yemeği"
                  : "Atıştırmalık";

          await Notifications.scheduleNotificationAsync({
            content: {
              title: `${mealTypeLabel} Zamanı! 🍽️`,
              body: `${meal.meal} (${meal.calories || "?"} kcal)`,
              data: {
                type: "meal_reminder",
                date: dateStr,
                time: meal.time,
                mealKey: mealKey,
                mealName: meal.meal,
                calories: meal.calories,
              },
              sound: true,
            },
            trigger: {
              type: "date",
              date: notificationDate,
            } as any,
          });
        }
      } catch (error) {
        // Hata sessizce yok sayılıyor
      }
    },
    [profile?.id],
  );

  // Öğünü tamamla
  const completeMeal = async (meal: any, dateStr: string) => {
    if (!profile?.id) return;

    const mealKey = `${dateStr}_${meal.time}`;
    const isCompleted = completedMeals[mealKey];

    if (isCompleted) {
      // Öğün tamamlanmış, işaretini kaldır
      const newCompleted = { ...completedMeals };
      delete newCompleted[mealKey];
      setCompletedMeals(newCompleted);

      // AsyncStorage'dan da sil
      const key = `completed_meals_${profile.id}_${dateStr}`;
      await AsyncStorage.setItem(key, JSON.stringify(newCompleted));

      // Kaloriyi geri al (daily tracking'den çıkar)
      // Not: Bu karmaşık olabilir, şimdilik sadece işareti kaldırıyoruz
    } else {
      // Öğünü tamamla
      const newCompleted = { ...completedMeals, [mealKey]: true };
      setCompletedMeals(newCompleted);

      // AsyncStorage'a kaydet
      const key = `completed_meals_${profile.id}_${dateStr}`;
      await AsyncStorage.setItem(key, JSON.stringify(newCompleted));

      // Kaloriyi daily tracking'e ekle
      if (meal.calories) {
        const mealTypeLabel =
          meal.type === "breakfast"
            ? "Kahvaltı"
            : meal.type === "lunch"
              ? "Öğle Yemeği"
              : meal.type === "dinner"
                ? "Akşam Yemeği"
                : "Atıştırmalık";

        const notes = `Yemek: ${meal.meal} (${mealTypeLabel})`;
        const result = await logCalories(
          parseInt(meal.calories) || 0,
          dateStr,
          notes,
        );

        if (result.success) {
          // Verileri yeniden yükle
          await loadDailyData(selectedDate);
          await updateStreakOnActivity();
        } else {
          Alert.alert("Uyarı", "Kalori kaydedilemedi: " + result.error);
        }
      }
    }
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
        await loadCompletedMeals();
        await loadCompletedExercises();

        // Bildirim izni kontrolü
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
          await Notifications.requestPermissionsAsync();
        }
      }
    } catch (error) {
      Alert.alert("Hata", "Bilgiler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [
    profile?.id,
    loadDietProgress,
    loadDailyData,
    loadCompletedMeals,
    loadCompletedExercises,
  ]);

  // Aylık takip verilerini yükle
  const loadMonthlyTrackingData = useCallback(async () => {
    if (!profile?.id || !member) return;

    try {
      const today = new Date();
      const startDate = subDays(today, 29);
      const startDateStr = formatDateToLocalString(startDate);
      const endDateStr = formatDateToLocalString(today);

      const { data: trackingData, error } = await getDailyTrackingRange(
        startDateStr,
        endDateStr,
      );

      if (error || !trackingData) {
        setMonthlyTrackingData({});
        return;
      }

      // Yaş, kilo, boy ve cinsiyet bilgileri
      const age = calculateAge(member.birth_date);
      const dailyWaterNeed =
        age && member.weight
          ? calculateDailyWaterNeed(age, member.weight)
          : 2500;
      const mealPrefs = member?.meal_preferences || {};
      const caloriesTarget = mealPrefs.calories
        ? parseInt(mealPrefs.calories)
        : 2000;
      const exerciseCalorieTarget = calculateExerciseCalorieTarget(
        age || undefined,
        member.weight,
        member.height,
        member.gender,
      );

      // Her gün için yüzdeleri hesapla
      const monthlyData: Record<
        string,
        {
          waterPercentage: number;
          caloriesPercentage: number;
          exercisePercentage: number;
          averagePercentage: number;
        }
      > = {};

      trackingData.forEach(tracking => {
        const waterPercentage = Math.min(
          100,
          Math.round((tracking.water / dailyWaterNeed) * 100),
        );
        const caloriesPercentage = Math.min(
          100,
          Math.round((tracking.calories / caloriesTarget) * 100),
        );
        const exercisePercentage = Math.min(
          100,
          Math.round(
            (tracking.exercise_calories / exerciseCalorieTarget) * 100,
          ),
        );
        const averagePercentage = Math.round(
          (waterPercentage + caloriesPercentage + exercisePercentage) / 3,
        );

        monthlyData[tracking.date] = {
          waterPercentage,
          caloriesPercentage,
          exercisePercentage,
          averagePercentage,
        };
      });

      setMonthlyTrackingData(monthlyData);
    } catch (error) {
      setMonthlyTrackingData({});
    }
  }, [profile?.id, member]);

  useFocusEffect(
    useCallback(() => {
      loadMember();
    }, [loadMember]),
  );

  // Seçili tarih değiştiğinde tamamlanan egzersizleri yükle
  useEffect(() => {
    if (profile?.id && selectedDate) {
      loadCompletedExercises();
      loadCompletedMeals();
    }
  }, [selectedDate, profile?.id, loadCompletedExercises, loadCompletedMeals]);

  // Pazartesi kontrolü: Eğer bugün Pazartesi ise ve son diyet planı tarihi bugün değilse, yeni program oluştur
  useEffect(() => {
    const checkAndCreateNewDietPlan = async () => {
      if (!member || !profile?.id || !isMonday()) return;

      const mealPrefs = member.meal_preferences || {};
      const lastDietPlanDate = mealPrefs.last_diet_plan_date;
      const today = formatDateToLocalString(new Date());

      // Eğer son diyet planı bugün oluşturulmamışsa, yeni program oluştur
      if (lastDietPlanDate !== today && mealPrefs.diet_active) {
        const age = calculateAge(member.birth_date);
        if (!age) return;

        const bmi = calculateBMI(member.weight, member.height);
        if (!bmi) return;

        try {
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          const nextMonday = startOfWeek(addDays(todayDate, 7), {
            weekStartsOn: 1,
          });

          const result = await generateDietPlan({
            bmi,
            weight: member.weight || 0,
            height: member.height || 0,
            age: age,
            gender: member.gender,
            currentDiet: mealPrefs.diet,
            currentCuisine: mealPrefs.cuisine,
            currentAvoid: mealPrefs.avoid,
            allergies: member.allergies,
            medications: member.medications,
            notes: member.notes,
            startDate: format(todayDate, "yyyy-MM-dd"),
            endDate: format(nextMonday, "yyyy-MM-dd"),
          });

          if (result.error || !result.needsDiet || !result.dietPlan) {
            return;
          }

          // Yeni diyet planını veritabanına kaydet
          const { saveDietPlan } = await import("../../services/dietPlans");
          const saveResult = await saveDietPlan(
            format(todayDate, "yyyy-MM-dd"),
            format(nextMonday, "yyyy-MM-dd"),
            result.dietPlan,
            result.dietPlan.goal,
            result.dietPlan.daily_calories,
            result.dietPlan.diet_type,
          );

          if (saveResult.error) {
            // Hata sessizce yok sayılıyor
          }

          // meal_preferences'ı da güncelle
          const updatedPrefs = {
            ...member.meal_preferences,
            last_diet_plan_date: today,
          };

          await updateMemberDetails(profile.id, {
            meal_preferences: updatedPrefs,
          });

          // Kullanıcıya bildir
          Alert.alert(
            "Yeni Haftalık Program",
            "Bu hafta için yeni diyet programınız hazırlandı. Onaylamak ister misiniz?",
            [
              {
                text: "Daha Sonra",
                style: "cancel",
              },
              {
                text: "Görüntüle",
                onPress: async () => {
                  await loadMember();
                  // Diyet planı gösterimini aç (isteğe bağlı)
                },
              },
            ],
          );
        } catch (error) {
          // Hata sessizce yok sayılıyor
        }
      }
    };

    checkAndCreateNewDietPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?.meal_preferences?.last_diet_plan_date, profile?.id]);

  // Member yüklendiğinde aylık verileri yükle
  useEffect(() => {
    if (member) {
      loadMonthlyTrackingData();
    }
  }, [member, loadMonthlyTrackingData]);

  // Seçili tarih veya member değiştiğinde diyet ve egzersiz planlarını yükle
  useEffect(() => {
    if (!member || !profile?.id) return;

    const dateStr = formatDateToLocalString(selectedDate);
    loadDietPlanForDate(dateStr);
    loadExercisePlanForDate(dateStr);
  }, [
    selectedDate,
    member,
    profile?.id,
    loadDietPlanForDate,
    loadExercisePlanForDate,
  ]);

  // Su hatırlatıcısı tercihlerini yükle
  useEffect(() => {
    const loadWaterPref = async () => {
      try {
        const prefs = await getPreferences();
        if (prefs) {
          setWaterReminderEnabled(!!prefs.water_reminder_enabled);
        }
      } catch (e) {
        // Hata sessizce yok sayılıyor
      }
    };
    loadWaterPref();
  }, []);

  // Kaydedilmiş egzersiz durumunu kontrol et
  useEffect(() => {
    const checkSavedState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(
          `exercise_session_${profile?.id}`,
        );
        if (savedState) {
          const state = JSON.parse(savedState);
          if (
            state.dateStr === formatDateToLocalString(selectedDate) &&
            state.exercisePlan &&
            state.remainingTime > 0
          ) {
            setHasUnfinishedExercise(true);
            return;
          }
        }
        setHasUnfinishedExercise(false);
      } catch (error) {
        console.error("Egzersiz durumu kontrol edilemedi:", error);
        setHasUnfinishedExercise(false);
      }
    };

    checkSavedState();
  }, [selectedDate, profile?.id]);

  // Egzersiz Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (
      exerciseTimerActive &&
      !exerciseTimerPaused &&
      !isReadingTime &&
      remainingTime > 0
    ) {
      interval = setInterval(() => {
        setRemainingTime(prev => {
          const newRemainingTime = prev - 1;

          if (newRemainingTime <= 0) {
            playStartWhistle().catch(() => {});

            // Timer bittiğinde - tüm egzersizleri tamamlandı olarak işaretle (toplu)
            const dateStr = formatDateToLocalString(selectedDate);
            const totalExercises = currentExercisePlan?.exercises?.length || 0;
            const updatedCompleted = { ...completedExercises };
            for (let i = 0; i < totalExercises; i++) {
              const key = `${dateStr}_${i}`;
              updatedCompleted[key] = true;
            }

            // Toplu state update
            setCompletedExercises(updatedCompleted);

            // AsyncStorage'a toplu kayıt
            AsyncStorage.setItem(
              `completed_exercises_${profile?.id}_${dateStr}`,
              JSON.stringify(updatedCompleted),
            ).catch(console.error);

            // Tamamlanan egzersizleri yeniden yükle
            loadCompletedExercises().catch(console.error);

            // Timer durumunu temizle
            setExerciseTimerActive(false);
            setExerciseTimerPaused(false);
            setExerciseTimerModalVisible(false);
            setIsReadingTime(false);
            setReadingTimeLeft(10);
            // Kaydedilen durumu temizle (async ama beklemeden devam et)
            AsyncStorage.removeItem(`exercise_session_${profile?.id}`)
              .then(() => setHasUnfinishedExercise(false))
              .catch(console.error);

            Alert.alert(
              "Süre Bitti! ⏰",
              `Egzersiz süresi tamamlandı! Toplam ${burnedCaloriesInSession} kalori yaktınız. Kalorileri kaydetmek için lütfen "Duraklat ve Kaydet" butonunu kullanın.`,
            );
            return 0;
          }

          return newRemainingTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    exerciseTimerActive,
    exerciseTimerPaused,
    isReadingTime,
    remainingTime,
    burnedCaloriesInSession,
    profile?.id,
  ]);

  // Otomatik egzersiz geçişi için ayrı useEffect
  useEffect(() => {
    if (!exerciseTimerActive || !currentExercisePlan?.exercises) return;

    const exercises = currentExercisePlan.exercises;
    const totalElapsedSeconds = totalExerciseTime - remainingTime;

    // Her egzersizin başlangıç ve bitiş sürelerini hesapla
    let cumulativeSeconds = 0;
    let shouldBeAtStep = 0;

    for (let i = 0; i < exercises.length; i++) {
      const exerciseDurationSeconds = (exercises[i].duration || 0) * 60;

      if (totalElapsedSeconds >= cumulativeSeconds + exerciseDurationSeconds) {
        shouldBeAtStep = i + 1; // Bu egzersiz tamamlandı
        cumulativeSeconds += exerciseDurationSeconds;
      } else {
        break; // Henüz bu egzersizi yapmaya başlamadık
      }
    }

    // Eğer yeni bir egzersize geçmemiz gerekiyorsa
    if (
      shouldBeAtStep > currentExerciseStep &&
      shouldBeAtStep <= exercises.length &&
      !isReadingTime
    ) {
      // Async işlemler için wrapper fonksiyon
      const markCompletedExercises = async () => {
        const dateStr = formatDateToLocalString(selectedDate);

        // Okuma süresi başlat (son egzersiz değilse) — sonraki egzersizi göster
        if (shouldBeAtStep < exercises.length) {
          playShortWhistle().catch(() => {});
          setReadingTimeNextExerciseIndex(shouldBeAtStep);
          setIsReadingTime(true);
          setReadingTimeLeft(10);

          // Aradan geçen tüm egzersizlerin kalorilerini ekle ve tamamlandı olarak işaretle
          let addedCalories = 0;
          for (let i = currentExerciseStep; i < shouldBeAtStep; i++) {
            addedCalories += exercises[i]?.calories || 0;
            // Egzersizi tamamlandı olarak işaretle
            await markExerciseCompleted(i, dateStr);
          }
          setBurnedCaloriesInSession(prev => prev + addedCalories);
        } else {
          // Son egzersizse direkt geçiş yap ve tamamlandı olarak işaretle
          let addedCalories = 0;
          for (let i = currentExerciseStep; i < shouldBeAtStep; i++) {
            addedCalories += exercises[i]?.calories || 0;
            // Egzersizi tamamlandı olarak işaretle
            await markExerciseCompleted(i, dateStr);
          }

          setCurrentExerciseStep(shouldBeAtStep);
          setBurnedCaloriesInSession(prev => prev + addedCalories);
        }
      };

      // Async fonksiyonu çağır
      markCompletedExercises().catch(console.error);
    }
  }, [
    exerciseTimerActive,
    currentExercisePlan,
    totalExerciseTime,
    remainingTime,
    currentExerciseStep,
    isReadingTime,
  ]);

  // Okuma süresi timer'ı
  useEffect(() => {
    let readingInterval: NodeJS.Timeout | null = null;

    if (isReadingTime && readingTimeLeft > 0) {
      readingInterval = setInterval(() => {
        setReadingTimeLeft(prev => {
          if (prev <= 1) {
            // Okuma süresi bitti, bir sonraki egzersize geç — kısa düdük
            playShortWhistle().catch(() => {});

            setReadingTimeNextExerciseIndex(null);
            setIsReadingTime(false);

            // Step'i ilerlet
            const exercises = currentExercisePlan?.exercises || [];
            const totalElapsedSeconds = totalExerciseTime - remainingTime;

            let cumulativeSeconds = 0;
            let shouldBeAtStep = 0;

            for (let i = 0; i < exercises.length; i++) {
              const exerciseDurationSeconds = (exercises[i].duration || 0) * 60;

              if (
                totalElapsedSeconds >=
                cumulativeSeconds + exerciseDurationSeconds
              ) {
                shouldBeAtStep = i + 1;
                cumulativeSeconds += exerciseDurationSeconds;
              } else {
                break;
              }
            }

            setCurrentExerciseStep(shouldBeAtStep);
            setReadingTimeLeft(10); // Sıfırla
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (readingInterval) clearInterval(readingInterval);
    };
  }, [
    isReadingTime,
    readingTimeLeft,
    currentExercisePlan,
    totalExerciseTime,
    remainingTime,
  ]);

  // Okuma süresinde tik: her saniye yeniden başlat (ses dosyası 1 saniyeden kısa)
  useEffect(() => {
    if (!isReadingTime) return;
    
    // İlk tick'i hemen başlat
    playTickOnce().catch(() => {});
    
    // Sonra her saniye tekrar başlat
    const tickInterval = setInterval(() => {
      playTickOnce().catch(() => {});
    }, 1000);
    
    return () => {
      clearInterval(tickInterval);
    };
  }, [isReadingTime]);

  // Okuma süresi animasyonu
  useEffect(() => {
    if (isReadingTime) {
      // Pulse animasyonu - 1.5 saniyede fade in/out
      const pulseAnimation = Animated.sequence([
        Animated.timing(borderOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(borderOpacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: false,
        }),
      ]);

      // Loop animasyon - okuma süresi bitene kadar devam eder
      const loopAnimation = Animated.loop(pulseAnimation);
      loopAnimation.start();

      return () => {
        loopAnimation.stop();
      };
    } else {
      // Okuma süresi bittiğinde animasyonu durdur
      Animated.timing(borderOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isReadingTime, borderOpacity]);

  // Ses onayı sonrası egzersiz başlat / devam
  const askSoundApprovalThen = useCallback(
    (action: () => void | Promise<void>) => {
      Alert.alert(
        "Sesli Uyarılar",
        "Egzersiz sırasında sesli uyarılar (düdük, tik) kullanılacak. İzin verilsin mi?",
        [
          {
            text: "Hayır",
            style: "cancel",
            onPress: () => {
              setSoundsEnabled(false);
              void Promise.resolve(action()).catch(() => {});
            },
          },
          {
            text: "Evet",
            onPress: async () => {
              const ok = await initAudioAndRequestPermission();
              if (!ok) setSoundsEnabled(false);
              await action();
            },
          },
        ],
      );
    },
    [],
  );

  // Timer Fonksiyonları
  const startExerciseTimer = useCallback(
    (totalMinutes: number, exerciseSteps: any[]) => {
      playStartWhistle().catch(() => {});
      setReadingTimeNextExerciseIndex(null);
      const totalSeconds = totalMinutes * 60;
      setTotalExerciseTime(totalSeconds);
      setRemainingTime(totalSeconds);
      setCurrentExerciseStep(0);
      setBurnedCaloriesInSession(0);
      setExerciseTimerActive(true);
      setExerciseTimerPaused(false);
      setIsReadingTime(false);
      setReadingTimeLeft(10);
      setHasUnfinishedExercise(false); // Yeni başlarken unfinished flag'i temizle
      setExerciseTimerModalVisible(true); // Timer Modal'ını aç
    },
    [],
  );

  const pauseExerciseTimer = useCallback(() => {
    setExerciseTimerPaused(true);
  }, []);

  const resumeExerciseTimer = useCallback(() => {
    setExerciseTimerPaused(false);
  }, []);

  const stopExerciseTimer = useCallback(async () => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    Alert.alert(
      "Egzersiz Duraklat",
      "Egzersizi durdurmak istediğinizden emin misiniz? İlerleyişiniz kaydedilecek ve daha sonra kaldığınız yerden devam edebilirsiniz.",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Duraklat ve Kaydet",
          onPress: async () => {
            // Mevcut durumu kaydet
            try {
              await AsyncStorage.setItem(
                `exercise_session_${profile?.id}`,
                JSON.stringify({
                  currentStep: currentExerciseStep,
                  burnedCalories: burnedCaloriesInSession,
                  remainingTime: remainingTime,
                  totalTime: totalExerciseTime,
                  exercisePlan: currentExercisePlan,
                  dateStr: formatDateToLocalString(selectedDate),
                  isReadingTime: isReadingTime,
                  readingTimeLeft: readingTimeLeft,
                  readingTimeNextExerciseIndex:
                    isReadingTime && readingTimeNextExerciseIndex != null
                      ? readingTimeNextExerciseIndex
                      : undefined,
                }),
              );
            } catch (error) {
              console.error("Egzersiz durumu kaydedilemedi:", error);
            }

            // Şu ana kadar yapılan egzersizleri tamamlandı olarak işaretle (toplu)
            const dateStr = formatDateToLocalString(selectedDate);
            const updatedCompleted = { ...completedExercises };
            for (let i = 0; i < currentExerciseStep; i++) {
              const key = `${dateStr}_${i}`;
              updatedCompleted[key] = true;
            }

            // Toplu state update
            setCompletedExercises(updatedCompleted);

            // AsyncStorage'a toplu kayıt
            try {
              const storageKey = `completed_exercises_${profile?.id}_${dateStr}`;
              await AsyncStorage.setItem(
                storageKey,
                JSON.stringify(updatedCompleted),
              );
            } catch (error) {
              console.error("❌ Toplu kayıt hatası:", error);
            }

            // Yakılan kalorileri veritabanına kaydet
            if (burnedCaloriesInSession > 0) {
              try {
                await logExercise(
                  Math.round((totalExerciseTime - remainingTime) / 60), // duration dakika
                  burnedCaloriesInSession, // calories
                  formatDateToLocalString(selectedDate), // dateStr
                  "Egzersiz Seansı (Kaydedildi)", // exercise name
                );
                await loadDailyData(selectedDate);
              } catch (error) {
                console.error("Kalori kaydetme hatası:", error);
              }
            }

            // Tamamlanan egzersizleri yeniden yükle
            await loadCompletedExercises();

            // Timer'ı durdur
            setExerciseTimerActive(false);
            setExerciseTimerPaused(false);
            setExerciseTimerModalVisible(false);
            setIsReadingTime(false);
            setReadingTimeLeft(10);
            setReadingTimeNextExerciseIndex(null);
            setHasUnfinishedExercise(true);

            Alert.alert(
              "Kaydedildi! ✅",
              `Egzersiz durumu kaydedildi. ${burnedCaloriesInSession} kalori kaydedildi. Daha sonra kaldığınız yerden devam edebilirsiniz.`,
            );
          },
        },
        {
          text: "Tamamen Bitir",
          style: "destructive",
          onPress: async () => {
            // Şu ana kadar yapılan egzersizleri tamamlandı olarak işaretle (toplu)
            const dateStr = formatDateToLocalString(selectedDate);
            const updatedCompleted = { ...completedExercises };
            for (let i = 0; i < currentExerciseStep; i++) {
              const key = `${dateStr}_${i}`;
              updatedCompleted[key] = true;
            }

            // Toplu state update
            setCompletedExercises(updatedCompleted);

            // AsyncStorage'a toplu kayıt
            try {
              const storageKey = `completed_exercises_${profile?.id}_${dateStr}`;
              await AsyncStorage.setItem(
                storageKey,
                JSON.stringify(updatedCompleted),
              );
            } catch (error) {
              console.error("❌ Toplu kayıt hatası (Tamamen Bitir):", error);
            }

            // Kaloriler kaydedilsin ve durum temizlensin
            if (burnedCaloriesInSession > 0) {
              try {
                await logExercise(
                  Math.round((totalExerciseTime - remainingTime) / 60), // duration dakika
                  burnedCaloriesInSession, // calories
                  formatDateToLocalString(selectedDate), // dateStr
                  "Egzersiz Seansı (Yarıda Bırakıldı)", // exercise name
                );
                await loadDailyData(selectedDate);
              } catch (error) {
                console.error("Kalori kaydetme hatası:", error);
              }
            }

            // Durumu temizle
            try {
              await AsyncStorage.removeItem(`exercise_session_${profile?.id}`);
              setHasUnfinishedExercise(false);
            } catch (error) {
              console.error("Egzersiz durumu temizlenemedi:", error);
            }
            setExerciseTimerActive(false);
            setExerciseTimerPaused(false);
            setExerciseTimerModalVisible(false);
            setRemainingTime(0);
            setIsReadingTime(false);
            setReadingTimeLeft(10);

            // Tamamlanan egzersizleri yeniden yükle
            await loadCompletedExercises();

            Alert.alert(
              "Tamamlandı! 🎊",
              `Egzersiz sonlandırıldı. ${burnedCaloriesInSession} kalori kaydedildi.`,
            );
          },
        },
      ],
    );
  }, [
    burnedCaloriesInSession,
    totalExerciseTime,
    remainingTime,
    selectedDate,
    currentExerciseStep,
    currentExercisePlan,
    profile?.id,
  ]);

  // Kaydedilen egzersizden devam etme
  const continueExercise = useCallback(async () => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    try {
      const savedState = await AsyncStorage.getItem(
        `exercise_session_${profile?.id}`,
      );
      if (savedState) {
        const state = JSON.parse(savedState);
        // Aynı gün ve aynı plan mı kontrol et
        if (
          state.dateStr === formatDateToLocalString(selectedDate) &&
          state.exercisePlan &&
          state.remainingTime > 0
        ) {
          setCurrentExerciseStep(state.currentStep);
          setBurnedCaloriesInSession(state.burnedCalories);
          setRemainingTime(state.remainingTime);
          setTotalExerciseTime(state.totalTime);
          setIsReadingTime(state.isReadingTime || false);
          setReadingTimeLeft(state.readingTimeLeft || 10);
          setReadingTimeNextExerciseIndex(
            state.isReadingTime &&
              typeof state.readingTimeNextExerciseIndex === "number"
              ? state.readingTimeNextExerciseIndex
              : null,
          );
          setExerciseTimerActive(true);
          setExerciseTimerPaused(false);
          setExerciseTimerModalVisible(true); // Timer Modal'ını aç

          // Tamamlanan egzersizleri yeniden yükle
          await loadCompletedExercises();

          const minutes = Math.floor(state.remainingTime / 60);
          const seconds = state.remainingTime % 60;
          const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

          Alert.alert(
            "Devam Ediliyor! 🔥",
            `${state.currentStep}. egzersizden devam ediyorsunuz. ${timeString} kaldı.`,
          );
        }
      }
    } catch (error) {
      console.error("Egzersiz durumu yüklenemedi:", error);
    }
  }, [profile?.id, selectedDate]);

  // Time formatter
  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  // Egzersiz durumunu persist etme
  const saveExerciseState = useCallback(
    async (state: {
      currentStep: number;
      burnedCalories: number;
      remainingTime: number;
      totalTime: number;
      exercisePlan: any;
      dateStr: string;
      isReadingTime?: boolean;
      readingTimeLeft?: number;
    }) => {
      try {
        await AsyncStorage.setItem(
          `exercise_session_${profile?.id}`,
          JSON.stringify(state),
        );
      } catch (error) {
        console.error("Egzersiz durumu kaydedilemedi:", error);
      }
    },
    [profile?.id],
  );

  // Kaydedilen egzersiz durumunu yükleme
  const loadExerciseState = useCallback(async () => {
    try {
      const savedState = await AsyncStorage.getItem(
        `exercise_session_${profile?.id}`,
      );
      if (savedState) {
        const state = JSON.parse(savedState);
        // Aynı gün ve aynı plan mı kontrol et
        if (
          state.dateStr === formatDateToLocalString(selectedDate) &&
          state.exercisePlan &&
          state.remainingTime > 0
        ) {
          setHasUnfinishedExercise(true);
          return state;
        }
      }
      setHasUnfinishedExercise(false);
      return null;
    } catch (error) {
      console.error("Egzersiz durumu yüklenemedi:", error);
      setHasUnfinishedExercise(false);
      return null;
    }
  }, [profile?.id, selectedDate]);

  // Kaydedilen durumu temizleme
  const clearExerciseState = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(`exercise_session_${profile?.id}`);
      setHasUnfinishedExercise(false);
    } catch (error) {
      console.error("Egzersiz durumu temizlenemedi:", error);
    }
  }, [profile?.id]);

  // Hedef kiloyu yükle (member değiştiğinde)
  useEffect(() => {
    if (!profile?.id || !member) return;

    const loadTargetWeight = async () => {
      try {
        const mealPrefs = member?.meal_preferences || ({} as any);
        if (mealPrefs.target_weight) {
          setTargetWeight(parseFloat(mealPrefs.target_weight));
          await AsyncStorage.setItem(
            `diet_target_weight_${profile.id}`,
            mealPrefs.target_weight.toString(),
          );
        } else {
          const targetWeightStored = await AsyncStorage.getItem(
            `diet_target_weight_${profile.id}`,
          );
          if (targetWeightStored) {
            setTargetWeight(parseFloat(targetWeightStored));
          } else {
            setTargetWeight(null);
          }
        }
      } catch (error) {
        // Hata sessizce yok sayılıyor
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
        JSON.stringify(newProgress),
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
        `Haftalık kilo girişi sadece Pazartesi günleri yapılabilir.\n\nBugün: ${todayName}\nBir sonraki Pazartesi: ${daysUntilMonday} gün sonra`,
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
        "Haftalık kilo girişi sadece Pazartesi günleri yapılabilir.",
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
            (1000 * 60 * 60 * 24 * 7),
        ) + 1;

      const newEntry = {
        date: today.toISOString().split("T")[0],
        weight: weightValue,
        week: weekNumber,
      };

      const updatedHistory = weightHistory.filter(
        entry => entry.week !== weekNumber,
      );
      updatedHistory.push(newEntry);
      updatedHistory.sort((a, b) => a.week - b.week);

      setWeightHistory(updatedHistory);
      await AsyncStorage.setItem(
        `diet_weight_history_${profile.id}`,
        JSON.stringify(updatedHistory),
      );
      setWeightModalVisible(false);
      setNewWeight("");

      const mealPrefs = member?.meal_preferences || {};
      const hasDiet = Boolean(
        mealPrefs.diet_active &&
        mealPrefs.diet_start_date &&
        String(mealPrefs.diet_start_date).trim() !== "",
      );
      const hasExercise = mealPrefs.exercise_enabled !== false;

      if (!hasDiet && !hasExercise) {
        Alert.alert("Kilo Kaydedildi", "Bu hafta için kilonuz kaydedildi.");
        return;
      }

      const continueMessage =
        hasDiet && hasExercise
          ? "Bu hafta için kilonuz kaydedildi. Diyet ve egzersiz programı devam etsin mi?"
          : hasDiet
            ? "Bu hafta için kilonuz kaydedildi. Diyet programı devam etsin mi?"
            : "Bu hafta için kilonuz kaydedildi. Egzersiz programı devam etsin mi?";

      Alert.alert("Kilo Kaydedildi", continueMessage, [
        {
          text: "Hayır",
          style: "cancel",
          onPress: async () => {
            if (!member) return;
            const updatedPrefs = { ...member.meal_preferences };
            if (hasDiet) {
              updatedPrefs.diet_active = false;
              (updatedPrefs as any).diet_start_date = "";
            }
            if (hasExercise) {
              (updatedPrefs as any).exercise_enabled = false;
            }
            await updateMemberDetails(profile.id, {
              meal_preferences: updatedPrefs,
            });
            const msg =
              hasDiet && hasExercise
                ? "Diyet ve egzersiz programı sonlandırıldı."
                : hasDiet
                  ? "Diyet programı sonlandırıldı."
                  : "Egzersiz programı sonlandırıldı.";
            Alert.alert("Bilgi", msg);
            await loadMember();
          },
        },
        {
          text: "Evet, Devam Et",
          onPress: async () => {
            if (hasExercise && member) {
              setGeneratingExercisePlan(true);
              try {
                const age = calculateAge(member.birth_date);
                const exerciseCalorieTarget = calculateExerciseCalorieTarget(
                  age ?? undefined,
                  member.weight,
                  member.height,
                  member.gender,
                );
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayDay = today.getDay();
                let endDate: Date;
                if (todayDay === 1) {
                  endDate = addDays(today, 7);
                } else {
                  const daysUntilNextMonday = (8 - todayDay) % 7 || 7;
                  endDate = startOfWeek(addDays(today, daysUntilNextMonday), {
                    weekStartsOn: 1,
                  });
                }
                const planDates = eachDayOfInterval({
                  start: today,
                  end: endDate,
                });
                let successCount = 0;
                for (const date of planDates) {
                  const dateStr = format(date, "yyyy-MM-dd");
                  const result = await generateExercisePlan({
                    age: age ?? undefined,
                    weight: member.weight,
                    height: member.height,
                    gender: member.gender,
                    fitnessLevel,
                    equipmentType: equipmentPreference,
                    targetCalories: exerciseCalorieTarget,
                    availableTime: 45,
                    language: "tr",
                  });
                  if (result.error || !result.data) continue;
                  const saveResult = await saveExercisePlan(
                    dateStr,
                    result.data,
                    equipmentPreference,
                  );
                  if (!saveResult.error) successCount++;
                }
                if (successCount > 0) {
                  Alert.alert(
                    "Başarılı",
                    `${successCount} günlük egzersiz programı hazırlandı.`,
                    hasDiet
                      ? [
                          {
                            text: "Tamam",
                            onPress: () => {
                              setDietPlanModalVisible(true);
                            },
                          },
                        ]
                      : undefined,
                  );
                } else if (hasDiet) {
                  setDietPlanModalVisible(true);
                }
                await loadMember();
              } catch (e: any) {
                Alert.alert(
                  "Hata",
                  e?.message ?? "Egzersiz programı oluşturulamadı.",
                );
                if (hasDiet) setDietPlanModalVisible(true);
              } finally {
                setGeneratingExercisePlan(false);
              }
            } else if (hasDiet) {
              setDietPlanModalVisible(true);
            }
          },
        },
      ]);
    } catch (error) {
      Alert.alert("Hata", "Kilo kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  // Diyet bilgileri (Haftalık sistem)
  const mealPrefsForDiet = member?.meal_preferences || {};
  const dietStartDate = mealPrefsForDiet.diet_start_date
    ? new Date(mealPrefsForDiet.diet_start_date)
    : null;

  // Haftalık hesaplamalar
  const dietWeeks = dietStartDate
    ? Math.floor(
        (new Date().getTime() - dietStartDate.getTime()) /
          (1000 * 60 * 60 * 24 * 7),
      ) + 1
    : 0;
  const dietDays = dietStartDate
    ? Math.floor(
        (new Date().getTime() - dietStartDate.getTime()) /
          (1000 * 60 * 60 * 24),
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
    gender?: string,
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
    const exerciseTarget = Math.max(
      300,
      Math.min(600, Math.round(tdee * 0.22)),
    );

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
      const dayOfWeek =
        normalizedDay.getDay() === 0 ? 6 : normalizedDay.getDay() - 1;

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
    data => data.averagePercentage >= 100,
  ).length;

  const startWeight = member?.weight || 0;
  const lastWeightEntry =
    weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null;
  const currentWeight = lastWeightEntry?.weight || startWeight;

  // İlerleme durumu (hedef kiloya göre)
  const weightProgress =
    targetWeight && startWeight > 0 && currentWeight > 0
      ? Math.round(
          Math.abs(
            (currentWeight - startWeight) / (targetWeight - startWeight),
          ) * 100,
        )
      : 0;
  const weightChange = currentWeight - startWeight;
  const weightChangePercent =
    startWeight > 0 ? ((weightChange / startWeight) * 100).toFixed(1) : "0";

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

  // Diyet ve egzersiz enabled kontrolü
  const mealPrefs = member?.meal_preferences || {};
  const dietEnabledValue: any = mealPrefs.diet_enabled;
  const exerciseEnabledValue: any = mealPrefs.exercise_enabled;
  const dietEnabled = dietEnabledValue !== false; // Varsayılan true
  const exerciseEnabled = exerciseEnabledValue !== false; // Varsayılan true

  // Eğer hem diyet hem egzersiz kapalıysa ekranı gösterme
  if (!dietEnabled && !exerciseEnabled) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Aktif Diyet ve Egzersiz Programı
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Apple size={64} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            Diyet ve egzersiz özellikleri kapalı.
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            Özellikleri açmak için üye detaylarınızı ziyaret edin.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      pointerEvents="box-none"
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Aktif Diyet ve Egzersiz Programı
        </Text>
      </View>

      {/* SEKME SWITCHER */}
      <View
        style={[
          styles.tabContainer,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        {[
          { key: "tracking", label: "Takipler", icon: Calendar, enabled: true },
          {
            key: "diet",
            label: "Günlük Diyet",
            icon: UtensilsCrossed,
            enabled: dietEnabled,
          },
          {
            key: "exercise",
            label: "Egzersiz",
            icon: Dumbbell,
            enabled: exerciseEnabled,
          },
        ]
          .filter(tab => tab.enabled)
          .map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() =>
                  setActiveTab(tab.key as "tracking" | "diet" | "exercise")
                }
                style={[
                  styles.tabButton,
                  isActive && {
                    borderBottomWidth: 2,
                    borderBottomColor: colors.primary,
                  },
                ]}
              >
                <Icon
                  size={18}
                  color={isActive ? colors.primary : colors.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? colors.primary : colors.textMuted,
                      fontWeight: isActive ? "700" : "500",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* TAKİPLER SEKMESİ */}
        {activeTab === "tracking" && (
          <>
            {/* GÜNLÜK TAKİP */}
            <View
              style={[
                styles.trackingCard,
                isLight && styles.surfaceLift,
                {
                  backgroundColor: colors.card,
                  borderWidth: 0,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.04,
                  shadowRadius: 16,
                  elevation: 2,
                  marginHorizontal: -8,
                  borderRadius: 28,
                },
              ]}
            >
              <View style={styles.trackingHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {viewMode === "daily" ? "Günlük Takip" : "Aylık Takip"}
                  </Text>
                  <Text
                    style={[
                      styles.sectionSubtitle,
                      { color: colors.textMuted },
                    ]}
                  >
                    {viewMode === "daily"
                      ? format(selectedDate, "d MMMM yyyy", { locale: tr })
                      : format(new Date(), "MMMM yyyy", { locale: tr })}
                  </Text>
                </View>

                {/* GÖRÜNÜM MODU SEÇİCİ */}
                <View
                  style={[
                    styles.toggleRow,
                    { backgroundColor: colors.background },
                  ]}
                >
                  {(["daily", "monthly"] as const).map(m => (
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
                      onPress={async () => {
                        const newDate = subDays(selectedDate, 1);
                        setSelectedDate(newDate);
                        await loadDailyData(newDate);
                      }}
                      style={styles.navButton}
                    >
                      <ChevronLeft size={20} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.dailyInfo}>
                      <Text style={[styles.dailyDate, { color: colors.text }]}>
                        {format(selectedDate, "EEEE, d MMMM yyyy", {
                          locale: tr,
                        })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={async () => {
                        const newDate = addDays(selectedDate, 1);
                        setSelectedDate(newDate);
                        await loadDailyData(newDate);
                      }}
                      style={styles.navButton}
                      disabled={
                        formatDateToLocalString(selectedDate) ===
                          formatDateToLocalString(new Date()) ||
                        selectedDate > new Date()
                      }
                    >
                      <ChevronLeft
                        size={20}
                        color={
                          formatDateToLocalString(selectedDate) ===
                            formatDateToLocalString(new Date()) ||
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
                      .filter(h => h.getHours() >= 7 && h.getHours() <= 23)
                      .map((hour, i) => {
                        const dateStr = formatDateToLocalString(selectedDate);
                        const isCurrentHour =
                          formatDateToLocalString(selectedDate) ===
                            formatDateToLocalString(new Date()) &&
                          hour.getHours() === new Date().getHours();

                        // Bu saatteki logları filtrele
                        const hourLogs = dailyLogs.filter(log => {
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
                              style={[
                                styles.hourLabel,
                                { color: colors.textMuted },
                              ]}
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
                                  {hourLogs.map(log => {
                                    if (log.type === "water") {
                                      return (
                                        <View
                                          key={log.id}
                                          style={[
                                            styles.logItem,
                                            {
                                              backgroundColor: "#3b82f620",
                                              borderRadius: 16,
                                              borderWidth: 0,
                                              shadowColor: colors.primary,
                                              shadowOffset: {
                                                width: 0,
                                                height: 2,
                                              },
                                              shadowOpacity: 0.03,
                                              shadowRadius: 8,
                                              elevation: 1,
                                            },
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
                                        displayName = displayName.replace(
                                          /^(Yemek|İçecek):\s*/i,
                                          "",
                                        );
                                        // Parantez içindeki detayları kaldır (örn: "(yarım porsiyon)")
                                        displayName = displayName
                                          .replace(/\s*\(.*?\)$/, "")
                                          .trim();
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
                                            {
                                              backgroundColor: "#f59e0b20",
                                              borderRadius: 16,
                                              borderWidth: 0,
                                              shadowColor: colors.primary,
                                              shadowOffset: {
                                                width: 0,
                                                height: 2,
                                              },
                                              shadowOpacity: 0.03,
                                              shadowRadius: 8,
                                              elevation: 1,
                                            },
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
                                      displayName = displayName
                                        .replace(
                                          /^(Egzersiz|Exercise):\s*/i,
                                          "",
                                        )
                                        .trim();
                                      if (!displayName) {
                                        displayName = "Egzersiz";
                                      }

                                      return (
                                        <View
                                          key={log.id}
                                          style={[
                                            styles.logItem,
                                            {
                                              backgroundColor:
                                                colors.primary + "20",
                                              borderRadius: 16,
                                              borderWidth: 0,
                                              shadowColor: colors.primary,
                                              shadowOffset: {
                                                width: 0,
                                                height: 2,
                                              },
                                              shadowOpacity: 0.03,
                                              shadowRadius: 8,
                                              elevation: 1,
                                            },
                                          ]}
                                        >
                                          <Dumbbell
                                            size={14}
                                            color={colors.primary}
                                          />
                                          <Text
                                            style={[
                                              styles.logText,
                                              { color: colors.text },
                                            ]}
                                          >
                                            {displayName} •{" "}
                                            {log.calories_burned || 0}kcal
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
                          style={[
                            styles.weekdayText,
                            { color: colors.textMuted },
                          ]}
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
                      const isToday =
                        day.date === formatDateToLocalString(new Date());
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      // Tarih string'ini yerel saat dilimine göre parse et
                      const [year, month, dayNum] = day.date
                        .split("-")
                        .map(Number);
                      const dayDate = new Date(year, month - 1, dayNum);
                      dayDate.setHours(0, 0, 0, 0);
                      const isPast = dayDate < today;
                      const canInteract =
                        day.isInLast30Days && (isPast || isToday);
                      // Seçili tarihi yerel saat dilimine göre karşılaştır
                      const selectedDateStr =
                        formatDateToLocalString(selectedDate);
                      const isSelected = day.date === selectedDateStr;

                      return (
                        <TouchableOpacity
                          key={`${day.date}-${index}`}
                          onPress={async () => {
                            // Sadece tarih seçimi yap, tamamlama durumunu değiştirme
                            // Tarih string'ini yerel saat dilimine göre parse et
                            const [year, month, dayNum] = day.date
                              .split("-")
                              .map(Number);
                            const newSelectedDate = new Date(
                              year,
                              month - 1,
                              dayNum,
                            );
                            newSelectedDate.setHours(0, 0, 0, 0);
                            setSelectedDate(newSelectedDate);
                            await loadDailyData(newSelectedDate);
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
                              opacity: !day.isInLast30Days
                                ? 0.3
                                : canInteract
                                  ? 1
                                  : 0.5,
                              overflow: "hidden",
                              backgroundColor: isSelected
                                ? colors.primary + "15"
                                : "transparent",
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
                                    ? colors.primary + "80"
                                    : colors.primary + "40",
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

            {/* GÜNLÜK SU, KALORİ VE EGZERSİZ TAKİBİ - KOMPAKT TASARIM */}
            <View
              style={[
                styles.dailyTrackingCard,
                isLight && styles.surfaceLift,
                {
                  backgroundColor: colors.card,
                  borderWidth: 0,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.04,
                  shadowRadius: 16,
                  elevation: 2,
                  marginHorizontal: -8,
                  borderRadius: 28,
                },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text, marginBottom: 12 },
                ]}
              >
                Günlük Takip -{" "}
                {format(selectedDate, "d MMMM yyyy", { locale: tr })}
              </Text>

              <View style={styles.compactTrackingGrid}>
                {/* SU İÇME TAKİBİ */}
                {member &&
                  (() => {
                    const age = calculateAge(member.birth_date);
                    const dailyWaterNeed =
                      age && member.weight
                        ? calculateDailyWaterNeed(age, member.weight)
                        : 2500;
                    const waterProgress = dailyData?.water || 0;
                    const waterPercentage = Math.min(
                      100,
                      Math.round((waterProgress / dailyWaterNeed) * 100),
                    );

                    return (
                      <View
                        style={[
                          styles.compactTrackingItem,
                          {
                            backgroundColor: colors.card,
                            borderRadius: 20,
                            borderWidth: 0,
                            shadowColor: colors.primary,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.03,
                            shadowRadius: 10,
                            elevation: 1,
                            padding: 12,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.compactTrackingIcon,
                            { backgroundColor: "#3b82f620" },
                          ]}
                        >
                          <Droplet size={18} color="#3b82f6" />
                        </View>
                        <CircularProgress
                          percentage={waterPercentage}
                          size={50}
                          strokeWidth={6}
                          color="#3b82f6"
                          backgroundColor={colors.background}
                        />
                        <View style={styles.compactTrackingInfo}>
                          <Text
                            style={[
                              styles.compactTrackingLabel,
                              { color: colors.textMuted },
                            ]}
                          >
                            Su
                          </Text>
                          <Text
                            style={[
                              styles.compactTrackingValue,
                              { color: colors.text },
                            ]}
                          >
                            {waterProgress}ml
                          </Text>
                          <Text
                            style={[
                              styles.compactTrackingTarget,
                              { color: colors.textMuted },
                            ]}
                          >
                            / {dailyWaterNeed}ml
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                {/* KALORİ TAKİBİ */}
                {mealPrefs.calories &&
                  (() => {
                    const caloriesProgress = dailyData?.calories || 0;
                    const caloriesTarget = parseInt(mealPrefs.calories);
                    const caloriesPercentage = Math.min(
                      100,
                      Math.round((caloriesProgress / caloriesTarget) * 100),
                    );
                    const isOverTarget = caloriesProgress > caloriesTarget;
                    const caloriesColor = isOverTarget ? "#ef4444" : "#f59e0b";

                    return (
                      <View
                        style={[
                          styles.compactTrackingItem,
                          {
                            backgroundColor: colors.card,
                            borderRadius: 20,
                            borderWidth: 0,
                            shadowColor: colors.primary,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.03,
                            shadowRadius: 10,
                            elevation: 1,
                            padding: 12,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.compactTrackingIcon,
                            { backgroundColor: "#f59e0b20" },
                          ]}
                        >
                          <Flame size={18} color="#f59e0b" />
                        </View>
                        <CircularProgress
                          percentage={caloriesPercentage}
                          size={50}
                          strokeWidth={6}
                          color={caloriesColor}
                          backgroundColor={colors.background}
                        />
                        <View style={styles.compactTrackingInfo}>
                          <Text
                            style={[
                              styles.compactTrackingLabel,
                              { color: colors.textMuted },
                            ]}
                          >
                            Kalori
                          </Text>
                          <Text
                            style={[
                              styles.compactTrackingValue,
                              { color: colors.text },
                            ]}
                          >
                            {caloriesProgress}kcal
                          </Text>
                          <Text
                            style={[
                              styles.compactTrackingTarget,
                              { color: colors.textMuted },
                            ]}
                          >
                            / {caloriesTarget}kcal
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                {/* EGZERSİZ TAKİBİ */}
                {member &&
                  (() => {
                    const age = calculateAge(member.birth_date);
                    const exerciseCalorieTarget =
                      calculateExerciseCalorieTarget(
                        age || undefined,
                        member.weight,
                        member.height,
                        member.gender,
                      );
                    const exerciseCalories = dailyData?.exercise.calories || 0;
                    const exercisePercentage = Math.min(
                      100,
                      Math.round(
                        (exerciseCalories / exerciseCalorieTarget) * 100,
                      ),
                    );

                    return (
                      <View
                        style={[
                          styles.compactTrackingItem,
                          {
                            backgroundColor: colors.card,
                            borderRadius: 20,
                            borderWidth: 0,
                            shadowColor: colors.primary,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.03,
                            shadowRadius: 10,
                            elevation: 1,
                            padding: 12,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.compactTrackingIcon,
                            { backgroundColor: "#8b5cf620" },
                          ]}
                        >
                          <Dumbbell size={18} color="#8b5cf6" />
                        </View>
                        <CircularProgress
                          percentage={exercisePercentage}
                          size={50}
                          strokeWidth={6}
                          color="#8b5cf6"
                          backgroundColor={colors.background}
                        />
                        <View style={styles.compactTrackingInfo}>
                          <Text
                            style={[
                              styles.compactTrackingLabel,
                              { color: colors.textMuted },
                            ]}
                          >
                            Egzersiz
                          </Text>
                          <Text
                            style={[
                              styles.compactTrackingValue,
                              { color: colors.text },
                            ]}
                          >
                            {exerciseCalories}kcal
                          </Text>
                          <Text
                            style={[
                              styles.compactTrackingTarget,
                              { color: colors.textMuted },
                            ]}
                          >
                            / {exerciseCalorieTarget}kcal
                          </Text>
                        </View>
                      </View>
                    );
                  })()}
              </View>

              {/* NET KALORİ BİLGİSİ */}
              {mealPrefs.calories &&
                member &&
                (() => {
                  const exerciseCalories = dailyData?.exercise.calories || 0;
                  const totalCalories =
                    (dailyData?.calories || 0) - exerciseCalories;
                  const netCalories = totalCalories;
                  return (
                    <View
                      style={[
                        styles.netCaloriesInfo,
                        {
                          backgroundColor: colors.card,
                          borderWidth: 0,
                          shadowColor: colors.primary,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.03,
                          shadowRadius: 12,
                          elevation: 1,
                          borderRadius: 20,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.netCaloriesText,
                          { color: colors.textMuted },
                        ]}
                      >
                        Net Kalori:{" "}
                        <Text style={{ fontWeight: "700", color: colors.text }}>
                          {netCalories}kcal
                        </Text>{" "}
                        (Tüketilen: {dailyData?.calories || 0}kcal - Yakılan:{" "}
                        {exerciseCalories}kcal)
                      </Text>
                    </View>
                  );
                })()}
            </View>
          </>
        )}

        {/* GÜNLÜK DİYET SEKMESİ */}
        {activeTab === "diet" && dietEnabled && (
          <>
            {/* GÜNLÜK DİYET PROGRAMI */}
            {(() => {
              // Önce veritabanından yüklenen planı kontrol et
              const dietPlan =
                currentDietPlan || member?.meal_preferences?.diet_plan;
              if (!dietPlan) {
                return null;
              }

              const selectedDateStr = formatDateToLocalString(selectedDate);

              // Seçili günün diyet programını bul
              let dayPlan = null;

              if (
                dietPlan.daily_meal_plans &&
                Array.isArray(dietPlan.daily_meal_plans)
              ) {
                dayPlan = dietPlan.daily_meal_plans.find((dp: any) => {
                  if (!dp || !dp.date) {
                    return false;
                  }
                  // Tarih formatını normalize et
                  const planDate = String(dp.date).trim();
                  const match = planDate === selectedDateStr;
                  return match;
                });
              }

              if (!dayPlan) {
                return null;
              }

              if (!dayPlan.meals || dayPlan.meals.length === 0) {
                return null;
              }

              // Öğünleri saate göre sırala
              const sortedMeals = [...dayPlan.meals].sort((a: any, b: any) => {
                const timeA = a.time || "00:00";
                const timeB = b.time || "00:00";
                return timeA.localeCompare(timeB);
              });

              return (
                <View
                  style={[
                    styles.dailyTrackingCard,
                    isLight && styles.surfaceLift,
                    {
                      backgroundColor: colors.card,
                      borderWidth: 0, // Kenarlık kaldır
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.04,
                      shadowRadius: 16,
                      elevation: 2,
                      marginHorizontal: 0, // En geniş
                      borderRadius: 28, // Daha da yuvarlatılmış köşeler
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: colors.text, marginBottom: 12 },
                    ]}
                  >
                    Günlük Diyet Programı
                  </Text>
                  <Text
                    style={[
                      styles.sectionSubtitle,
                      { color: colors.textMuted, marginBottom: 8 },
                    ]}
                  >
                    {format(selectedDate, "d MMMM yyyy", { locale: tr })}
                  </Text>

                  <View>
                    {sortedMeals.map((meal: any, index: number) => {
                      const mealTypeLabel =
                        meal.type === "breakfast"
                          ? "Kahvaltı"
                          : meal.type === "lunch"
                            ? "Öğle Yemeği"
                            : meal.type === "dinner"
                              ? "Akşam Yemeği"
                              : "Atıştırmalık";

                      const mealKey = `${selectedDateStr}_${meal.time}`;
                      const isCompleted = completedMeals[mealKey] || false;

                      // Saat geçti mi kontrol et
                      const [hours, minutes] = (meal.time || "00:00")
                        .split(":")
                        .map(Number);
                      const mealTime = new Date(selectedDate);
                      mealTime.setHours(hours, minutes, 0, 0);
                      const isPast = mealTime < new Date();

                      return (
                        <View
                          key={index}
                          style={{
                            marginBottom: 10,
                            marginHorizontal: -10, // Günlük diyet kartları geniş
                            paddingHorizontal: 18,
                            paddingVertical: 18,
                            backgroundColor: isCompleted
                              ? colors.primary + "08"
                              : colors.card,
                            borderRadius: 24,
                            borderWidth: 0, // Kenarlık kaldırıldı
                            shadowColor: isCompleted
                              ? colors.primary
                              : colors.primary,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: isCompleted ? 0.08 : 0.03,
                            shadowRadius: 12,
                            elevation: isCompleted ? 3 : 1,
                            opacity: isCompleted ? 0.95 : 1,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                            }}
                          >
                            <View style={{ flex: 1, marginRight: 10 }}>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  marginBottom: 6,
                                }}
                              >
                                <View
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: isCompleted
                                      ? colors.primary
                                      : colors.primary,
                                    marginRight: 8,
                                  }}
                                />
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: colors.textMuted,
                                    fontWeight: "600",
                                    textTransform: "uppercase",
                                    letterSpacing: 0.5,
                                  }}
                                >
                                  {meal.time || "00:00"}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: colors.textMuted,
                                    marginLeft: 8,
                                  }}
                                >
                                  •
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: colors.textMuted,
                                    marginLeft: 8,
                                    fontWeight: "600",
                                  }}
                                >
                                  {mealTypeLabel}
                                </Text>
                                {isPast && !isCompleted && (
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      color: colors.textMuted,
                                      marginLeft: 8,
                                      fontStyle: "italic",
                                    }}
                                  >
                                    (Geçti)
                                  </Text>
                                )}
                              </View>
                              <Text
                                style={{
                                  fontSize: 15,
                                  color: colors.text,
                                  fontWeight: "600",
                                  lineHeight: 22,
                                  textDecorationLine: isCompleted
                                    ? "line-through"
                                    : "none",
                                }}
                              >
                                {meal.meal || "Öğün bilgisi yok"}
                              </Text>
                            </View>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              {meal.calories && (
                                <View
                                  style={{
                                    alignItems: "flex-end",
                                    minWidth: 60,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 18,
                                      color: colors.primary,
                                      fontWeight: "700",
                                    }}
                                  >
                                    {meal.calories}
                                  </Text>
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      color: colors.textMuted,
                                      fontWeight: "600",
                                      marginTop: 2,
                                    }}
                                  >
                                    kcal
                                  </Text>
                                </View>
                              )}
                              <TouchableOpacity
                                onPress={() =>
                                  completeMeal(meal, selectedDateStr)
                                }
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  borderWidth: 2,
                                  borderColor: isCompleted
                                    ? colors.primary
                                    : colors.border,
                                  backgroundColor: isCompleted
                                    ? colors.primary
                                    : "transparent",
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                {isCompleted ? (
                                  <Check size={18} color="#fff" />
                                ) : (
                                  <Circle size={18} color={colors.border} />
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })()}
          </>
        )}

        {/* EGZERSİZ SEKMESİ */}
        {activeTab === "exercise" && exerciseEnabled && (
          <>
            {/* GÜNLÜK EGZERSİZ ÖNERİSİ */}
            {(() => {
              // Diyet aktif değilse göster
              const mealPrefs = member?.meal_preferences || {};
              const dietActiveValue: any = mealPrefs.diet_active;
              const isActive =
                dietActiveValue === true ||
                (typeof dietActiveValue === "string" &&
                  dietActiveValue.toLowerCase() === "true") ||
                (typeof dietActiveValue === "number" && dietActiveValue === 1);

              if (!isActive || !member) return null;

              const selectedDateStr = formatDateToLocalString(selectedDate);
              const exercisePlan = currentExercisePlan;

              // Eğer plan yoksa, oluştur butonu göster
              if (!exercisePlan) {
                return (
                  <View
                    style={[
                      styles.dailyTrackingCard,
                      isLight && styles.surfaceLift,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <View>
                        <Text
                          style={[
                            styles.sectionTitle,
                            { color: colors.text, marginBottom: 4 },
                          ]}
                        >
                          Günlük Egzersiz Önerisi
                        </Text>
                        <Text
                          style={[
                            styles.sectionSubtitle,
                            { color: colors.textMuted },
                          ]}
                        >
                          {format(selectedDate, "d MMMM yyyy", { locale: tr })}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.modalDesc,
                        { color: colors.textMuted, marginBottom: 12 },
                      ]}
                    >
                      Bu gün için özel egzersiz planı oluşturmak ister misiniz?
                    </Text>

                    {/* Ekipman ve Fitness Seviyesi Seçimleri */}
                    <View style={{ gap: 12, marginBottom: 12 }}>
                      <SelectionGroup
                        label="Ekipman Tercihi"
                        options={[
                          { label: "Evde Aletsiz", value: "home_no_equipment" },
                          {
                            label: "Evde Aletli",
                            value: "home_with_equipment",
                          },
                          { label: "Spor Salonu", value: "gym" },
                        ]}
                        selectedValue={equipmentPreference}
                        onSelect={(val: any) => setEquipmentPreference(val)}
                      />

                      <SelectionGroup
                        label="Fitness Seviyesi"
                        options={[
                          { label: "Başlangıç", value: "beginner" },
                          { label: "Orta", value: "intermediate" },
                          { label: "İleri", value: "advanced" },
                        ]}
                        selectedValue={fitnessLevel}
                        onSelect={(val: any) => setFitnessLevel(val)}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={async () => {
                        if (!member || !profile?.id) return;

                        const age = calculateAge(member.birth_date);
                        const exerciseCalorieTarget =
                          calculateExerciseCalorieTarget(
                            age || undefined,
                            member.weight,
                            member.height,
                            member.gender,
                          );

                        setGeneratingExercisePlan(true);
                        try {
                          // O günden itibaren ilk Pazartesi dahil egzersiz programı oluştur
                          const startDate = new Date(selectedDateStr);
                          startDate.setHours(0, 0, 0, 0);

                          const todayDay = startDate.getDay(); // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
                          let endDate: Date;

                          if (todayDay === 1) {
                            // Pazartesi
                            endDate = addDays(startDate, 7); // Bu Pazartesi'den sonraki Pazartesi
                          } else {
                            // Diğer günler
                            const daysUntilNextMonday = (8 - todayDay) % 7 || 7;
                            endDate = startOfWeek(
                              addDays(startDate, daysUntilNextMonday),
                              { weekStartsOn: 1 },
                            );
                          }

                          // Tüm günler için plan oluştur
                          const planDates = eachDayOfInterval({
                            start: startDate,
                            end: endDate,
                          });
                          let successCount = 0;

                          for (const date of planDates) {
                            const dateStr = format(date, "yyyy-MM-dd");

                            const result = await generateExercisePlan({
                              age: age || undefined,
                              weight: member.weight,
                              height: member.height,
                              gender: member.gender,
                              fitnessLevel: fitnessLevel,
                              equipmentType: equipmentPreference,
                              targetCalories: exerciseCalorieTarget,
                              availableTime: 45, // Varsayılan 45 dakika
                              language: "tr",
                            });

                            if (result.error || !result.data) {
                              continue; // Bu gün başarısız, diğer günlere geç
                            }

                            // Planı veritabanına kaydet
                            const saveResult = await saveExercisePlan(
                              dateStr,
                              result.data,
                              equipmentPreference,
                            );

                            if (!saveResult.error) {
                              successCount++;
                              // Eğer seçili gün için plan oluşturduysa state'i güncelle
                              if (dateStr === selectedDateStr) {
                                setCurrentExercisePlan(result.data);
                              }
                            }
                          }

                          if (successCount > 0) {
                            Alert.alert(
                              "Başarılı",
                              `${successCount} günlük egzersiz planınız hazırlandı! ${format(startDate, "d MMMM", { locale: tr })} - ${format(endDate, "d MMMM yyyy", { locale: tr })}`,
                            );
                          } else {
                            Alert.alert(
                              "Hata",
                              "Hiçbir gün için egzersiz planı oluşturulamadı.",
                            );
                          }
                        } catch (error: any) {
                          Alert.alert(
                            "Hata",
                            error.message || "Egzersiz planı oluşturulamadı.",
                          );
                        } finally {
                          setGeneratingExercisePlan(false);
                        }
                      }}
                      disabled={generatingExercisePlan}
                      style={[
                        styles.modalButton,
                        {
                          backgroundColor: generatingExercisePlan
                            ? colors.textMuted
                            : colors.primary,
                          marginTop: 4,
                        },
                      ]}
                    >
                      {generatingExercisePlan ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text
                          style={[styles.modalButtonText, { color: "#fff" }]}
                        >
                          AI ile Oluştur
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }

              // Plan varsa göster
              return (
                <View
                  style={[
                    styles.dailyTrackingCard,
                    isLight && styles.surfaceLift,
                    {
                      backgroundColor: colors.card,
                      borderWidth: 0, // Kenarlık kaldır
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.04,
                      shadowRadius: 16,
                      elevation: 2,
                      marginHorizontal: 0, // En geniş
                      borderRadius: 28, // Daha da yuvarlatılmış köşeler
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <View>
                      <Text
                        style={[
                          styles.sectionTitle,
                          { color: colors.text, marginBottom: 4 },
                        ]}
                      >
                        Günlük Egzersiz Önerisi
                      </Text>
                      <Text
                        style={[
                          styles.sectionSubtitle,
                          { color: colors.textMuted, marginBottom: 8 },
                        ]}
                      >
                        {format(selectedDate, "d MMMM yyyy", { locale: tr })}
                      </Text>
                    </View>
                    {/* Yenile butonu - eğer egzersiz başlanmamışsa göster */}
                    {!hasUnfinishedExercise &&
                      !(() => {
                        // Tamamlanan herhangi bir egzersiz var mı kontrol et
                        const stats = calculateCompletedExerciseStats();
                        return stats.count > 0;
                      })() && (
                        <TouchableOpacity
                          onPress={async () => {
                            if (!member || !profile?.id) return;

                            const age = calculateAge(member.birth_date);
                            const exerciseCalorieTarget =
                              calculateExerciseCalorieTarget(
                                age || undefined,
                                member.weight,
                                member.height,
                                member.gender,
                              );

                            setGeneratingExercisePlan(true);
                            try {
                              const result = await generateExercisePlan({
                                age: age || undefined,
                                weight: member.weight,
                                height: member.height,
                                gender: member.gender,
                                fitnessLevel: fitnessLevel,
                                equipmentType: equipmentPreference,
                                targetCalories: exerciseCalorieTarget,
                                availableTime: 45,
                                language: "tr",
                              });

                              if (result.error || !result.data) {
                                Alert.alert(
                                  "Hata",
                                  result.error ||
                                    "Egzersiz planı oluşturulamadı.",
                                );
                                setGeneratingExercisePlan(false);
                                return;
                              }

                              const saveResult = await saveExercisePlan(
                                selectedDateStr,
                                result.data,
                                equipmentPreference,
                              );

                              if (saveResult.error) {
                                Alert.alert(
                                  "Hata",
                                  "Egzersiz planı kaydedilemedi: " +
                                    saveResult.error,
                                );
                                setGeneratingExercisePlan(false);
                                return;
                              }

                              setCurrentExercisePlan(result.data);
                              Alert.alert(
                                "Başarılı",
                                "Egzersiz planı güncellendi!",
                              );
                            } catch (error: any) {
                              Alert.alert(
                                "Hata",
                                error.message ||
                                  "Egzersiz planı oluşturulamadı.",
                              );
                            } finally {
                              setGeneratingExercisePlan(false);
                            }
                          }}
                          disabled={generatingExercisePlan}
                          style={{
                            padding: 6,
                            borderRadius: 8,
                            backgroundColor: colors.background,
                          }}
                        >
                          {generatingExercisePlan ? (
                            <ActivityIndicator
                              size="small"
                              color={colors.primary}
                            />
                          ) : (
                            <RotateCcw size={18} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      )}
                  </View>

                  {/* Birleştirilmiş İlerleme ve Özet Bilgiler */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-around",
                      marginTop: 4,
                      marginBottom: 12,
                      marginHorizontal: 0, // Kenar boşluğu kaldırıldı
                      paddingHorizontal: 0,
                      paddingVertical: 18,
                      backgroundColor: (() => {
                        const stats = calculateCompletedExerciseStats();
                        return stats.count > 0 ? colors.card : colors.card;
                      })(),
                      borderRadius: 24,
                      borderWidth: 0, // Kenarlık kaldırıldı
                      shadowColor: (() => {
                        const stats = calculateCompletedExerciseStats();
                        return stats.count > 0
                          ? colors.primary
                          : colors.primary;
                      })(),
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: (() => {
                        const stats = calculateCompletedExerciseStats();
                        return stats.count > 0 ? 0.08 : 0.03;
                      })(),
                      shadowRadius: 12,
                      elevation: (() => {
                        const stats = calculateCompletedExerciseStats();
                        return stats.count > 0 ? 3 : 1;
                      })(),
                    }}
                  >
                    <View
                      style={{
                        alignItems: "center",
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          color: colors.textMuted,
                          marginBottom: 4,
                        }}
                      >
                        Egzersiz Sayısı
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color: (() => {
                            const stats = calculateCompletedExerciseStats();
                            return stats.count > 0
                              ? colors.primary
                              : colors.text;
                          })(),
                        }}
                      >
                        {(() => {
                          const stats = calculateCompletedExerciseStats();
                          return `${stats.count}/${exercisePlan.exercises?.length || 0}`;
                        })()}
                      </Text>
                      {(() => {
                        const stats = calculateCompletedExerciseStats();
                        if (stats.count > 0) {
                          const percentage = Math.round(
                            (stats.count /
                              (exercisePlan.exercises?.length || 1)) *
                              100,
                          );
                          return (
                            <Text
                              style={{
                                fontSize: 9,
                                color: colors.primary,
                                marginTop: 2,
                              }}
                            >
                              %{percentage} tamamlandı
                            </Text>
                          );
                        }
                        return null;
                      })()}
                    </View>

                    <View
                      style={{
                        alignItems: "center",
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          color: colors.textMuted,
                          marginBottom: 4,
                        }}
                      >
                        Süre
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color: (() => {
                            const stats = calculateCompletedExerciseStats();
                            return stats.duration > 0 ? "#8b5cf6" : colors.text;
                          })(),
                        }}
                      >
                        {(() => {
                          const stats = calculateCompletedExerciseStats();
                          return `${stats.duration}/${exercisePlan.total_duration} dk`;
                        })()}
                      </Text>
                      {(() => {
                        const stats = calculateCompletedExerciseStats();
                        if (stats.duration > 0) {
                          const percentage = Math.round(
                            (stats.duration /
                              (exercisePlan.total_duration || 1)) *
                              100,
                          );
                          return (
                            <Text
                              style={{
                                fontSize: 9,
                                color: "#8b5cf6",
                                marginTop: 2,
                              }}
                            >
                              %{percentage} tamamlandı
                            </Text>
                          );
                        }
                        return null;
                      })()}
                    </View>

                    <View
                      style={{
                        alignItems: "center",
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          color: colors.textMuted,
                          marginBottom: 4,
                        }}
                      >
                        Kalori
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color: (() => {
                            const stats = calculateCompletedExerciseStats();
                            return stats.calories > 0
                              ? "#f59e0b"
                              : colors.primary;
                          })(),
                        }}
                      >
                        {(() => {
                          const stats = calculateCompletedExerciseStats();
                          return `${stats.calories}/${exercisePlan.total_calories} kcal`;
                        })()}
                      </Text>
                      {(() => {
                        const stats = calculateCompletedExerciseStats();
                        if (stats.calories > 0) {
                          const percentage = Math.round(
                            (stats.calories /
                              (exercisePlan.total_calories || 1)) *
                              100,
                          );
                          return (
                            <Text
                              style={{
                                fontSize: 9,
                                color: "#f59e0b",
                                marginTop: 2,
                              }}
                            >
                              %{percentage} tamamlandı
                            </Text>
                          );
                        }
                        return null;
                      })()}
                    </View>
                  </View>

                  {/* EGZERSİZ TIMER İNTERFACE'İ */}
                  <View
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 24,
                      paddingHorizontal: 0,
                      paddingVertical: 18,
                      marginBottom: 12,
                      marginHorizontal: 0, // Kenar boşluğu kaldırıldı
                      borderWidth: 0, // Kenarlık kaldırıldı
                      shadowColor: exerciseTimerActive
                        ? colors.primary
                        : colors.primary,
                      shadowOffset: {
                        width: 0,
                        height: exerciseTimerActive ? 6 : 4,
                      },
                      shadowOpacity: exerciseTimerActive ? 0.12 : 0.03,
                      shadowRadius: exerciseTimerActive ? 16 : 12,
                      elevation: exerciseTimerActive ? 4 : 1,
                    }}
                  >
                    {exerciseTimerActive ? (
                      // Egzersiz aktif - Sadece modal açma butonu göster
                      <View style={{ alignItems: "center", padding: 20 }}>
                        <TouchableOpacity
                          onPress={() => setExerciseTimerModalVisible(true)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: colors.primary,
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderRadius: 12,
                          }}
                        >
                          <Timer size={18} color="#fff" />
                          <Text
                            style={{
                              color: "#fff",
                              fontWeight: "700",
                              marginLeft: 8,
                              fontSize: 16,
                            }}
                          >
                            Egzersiz Ekranını Aç
                          </Text>
                        </TouchableOpacity>

                        <Text
                          style={{
                            fontSize: 14,
                            color: colors.textMuted,
                            textAlign: "center",
                            marginTop: 12,
                          }}
                        >
                          Egzersize devam etmek için yukarıdaki butona tıklayın
                        </Text>
                      </View>
                    ) : (
                      // Timer aktif değil - Başlat/Devam butonları
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "center",
                          gap: 12,
                          paddingHorizontal: 20,
                          paddingVertical: 8,
                        }}
                      >
                        {hasUnfinishedExercise ? (
                          // Devam Et Butonu
                          <View style={{ alignItems: "center" }}>
                            <TouchableOpacity
                              onPress={() =>
                                askSoundApprovalThen(() => continueExercise())
                              }
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#8b5cf6",
                                width: 60,
                                height: 60,
                                borderRadius: 30,
                                marginBottom: 6,
                              }}
                            >
                              <Play size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text
                              style={{
                                fontSize: 12,
                                color: colors.textMuted,
                                textAlign: "center",
                                fontWeight: "600",
                              }}
                            >
                              Kaldığınız yerden{"\n"}devam edin
                            </Text>
                          </View>
                        ) : (
                          // Başlat Butonu
                          <TouchableOpacity
                            onPress={() => {
                              if (
                                exercisePlan.exercises &&
                                exercisePlan.total_duration
                              ) {
                                askSoundApprovalThen(() => {
                                  startExerciseTimer(
                                    exercisePlan.total_duration,
                                    exercisePlan.exercises,
                                  );
                                });
                              }
                            }}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              backgroundColor: colors.primary,
                              paddingHorizontal: 24,
                              paddingVertical: 12,
                              borderRadius: 12,
                            }}
                          >
                            <Play size={18} color="#fff" />
                            <Text
                              style={{
                                color: "#fff",
                                fontWeight: "700",
                                marginLeft: 8,
                                fontSize: 16,
                              }}
                            >
                              Egzersizi Başlat
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Egzersiz Listesi */}
                  <View>
                    {exercisePlan.exercises &&
                      exercisePlan.exercises.map(
                        (exercise: any, index: number) => {
                          const typeLabel =
                            exercise.type === "cardio"
                              ? "Kardiyovasküler"
                              : exercise.type === "strength"
                                ? "Güç"
                                : exercise.type === "flexibility"
                                  ? "Esneklik"
                                  : exercise.type === "balance"
                                    ? "Denge"
                                    : "Diğer";

                          // Egzersizin tamamlanıp tamamlanmadığını kontrol et
                          const dateStr = formatDateToLocalString(selectedDate);
                          const exerciseKey = `${dateStr}_${index}`;
                          const isCompleted =
                            completedExercises[exerciseKey] || false;

                          return (
                            <View
                              key={index}
                              style={{
                                marginBottom: 10,
                                marginHorizontal: 0, // Kenar boşluğu kaldırıldı
                                paddingHorizontal: 0,
                                paddingVertical: 18,
                                backgroundColor: isCompleted
                                  ? "#10b981" + "06"
                                  : colors.card,
                                borderRadius: 24,
                                borderWidth: 0, // Kenarlık kaldırıldı
                                shadowColor: isCompleted
                                  ? "#10b981"
                                  : colors.primary,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: isCompleted ? 0.08 : 0.03,
                                shadowRadius: 12,
                                elevation: isCompleted ? 3 : 1,
                                opacity: isCompleted ? 0.95 : 1,
                              }}
                            >
                              <View
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  paddingHorizontal: 16,
                                  paddingVertical: 4,
                                }}
                              >
                                <View style={{ flex: 1, marginRight: 10 }}>
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      marginBottom: 6,
                                    }}
                                  >
                                    <View
                                      style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: 3,
                                        backgroundColor: colors.primary,
                                        marginRight: 8,
                                      }}
                                    />
                                    <Text
                                      style={{
                                        fontSize: 12,
                                        color: colors.textMuted,
                                        fontWeight: "600",
                                        textTransform: "uppercase",
                                        letterSpacing: 0.5,
                                      }}
                                    >
                                      {typeLabel}
                                    </Text>
                                    {exercise.sets && exercise.reps && (
                                      <>
                                        <Text
                                          style={{
                                            fontSize: 12,
                                            color: colors.textMuted,
                                            marginLeft: 8,
                                          }}
                                        >
                                          •
                                        </Text>
                                        <Text
                                          style={{
                                            fontSize: 12,
                                            color: colors.textMuted,
                                            marginLeft: 8,
                                            fontWeight: "600",
                                          }}
                                        >
                                          {exercise.sets} set × {exercise.reps}{" "}
                                          tekrar
                                        </Text>
                                      </>
                                    )}
                                  </View>
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      marginBottom: 4,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 15,
                                        color: isCompleted
                                          ? "#10b981"
                                          : colors.text,
                                        fontWeight: "600",
                                        lineHeight: 22,
                                        textDecorationLine: isCompleted
                                          ? "line-through"
                                          : "none",
                                        flex: 1,
                                      }}
                                    >
                                      {exercise.name?.replace(
                                        /\s*\([^)]*\)/g,
                                        "",
                                      ) || exercise.name}
                                    </Text>
                                  </View>
                                  {exercise.instructions && (
                                    <Text
                                      style={{
                                        fontSize: 12,
                                        color: colors.textMuted,
                                        lineHeight: 18,
                                      }}
                                    >
                                      {exercise.instructions}
                                    </Text>
                                  )}
                                </View>
                                <View
                                  style={{
                                    alignItems: "flex-end",
                                    minWidth: 80,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 16,
                                      color: colors.primary,
                                      fontWeight: "700",
                                    }}
                                  >
                                    {exercise.duration} dk
                                  </Text>
                                  <Text
                                    style={{
                                      fontSize: 14,
                                      color: colors.textMuted,
                                      fontWeight: "600",
                                      marginTop: 2,
                                    }}
                                  >
                                    {exercise.calories} kcal
                                  </Text>

                                  {/* Egzersiz Durumu - Otomatik Geçiş veya Tamamlanan */}
                                  {(exerciseTimerActive || isCompleted) && (
                                    <View
                                      style={{
                                        marginTop: 8,
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 8,
                                        backgroundColor:
                                          (exerciseTimerActive &&
                                            index < currentExerciseStep) ||
                                          isCompleted
                                            ? "#10b981" // Tamamlandı - Yeşil
                                            : exerciseTimerActive &&
                                                index === currentExerciseStep
                                              ? colors.primary // Şu anki - Mavi
                                              : colors.border, // Henüz gelmedik - Gri
                                        opacity:
                                          exerciseTimerActive &&
                                          index > currentExerciseStep
                                            ? 0.5
                                            : 1,
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontSize: 11,
                                          fontWeight: "600",
                                          color:
                                            (exerciseTimerActive &&
                                              index <= currentExerciseStep) ||
                                            isCompleted
                                              ? "#fff"
                                              : colors.textMuted,
                                          textAlign: "center",
                                        }}
                                      >
                                        {(exerciseTimerActive &&
                                          index < currentExerciseStep) ||
                                        isCompleted
                                          ? "✓"
                                          : exerciseTimerActive &&
                                              index === currentExerciseStep
                                            ? "🔥 Şu Anda"
                                            : `${index + 1}. Sıra`}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                            </View>
                          );
                        },
                      )}
                  </View>
                </View>
              );
            })()}
          </>
        )}

        {/* BİRLEŞTİRİLMİŞ DİYET DASHBOARD - Sadece Takipler sekmesinde göster */}
        {activeTab === "tracking" && (
          <>
            {/* BİRLEŞTİRİLMİŞ DİYET DASHBOARD */}
            <View
              style={[
                styles.unifiedDashboardCard,
                isLight && styles.surfaceLift,
                {
                  backgroundColor: colors.card,
                  borderWidth: 0,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.04,
                  shadowRadius: 16,
                  elevation: 2,
                  marginHorizontal: -8,
                  borderRadius: 28,
                },
              ]}
            >
              {/* HEADER - Başlık ve Ayarlar Butonu */}
              <View style={styles.dashboardHeader}>
                <View>
                  <Text style={[styles.dashboardTitle, { color: colors.text }]}>
                    Diyet Programı
                  </Text>
                  <Text
                    style={[
                      styles.dashboardSubtitle,
                      { color: colors.textMuted },
                    ]}
                  >
                    {mealPrefs.diet === "weight_loss"
                      ? "Kilo Verme"
                      : mealPrefs.diet === "weight_gain"
                        ? "Kilo Alma"
                        : mealPrefs.diet === "vegetarian"
                          ? "Vejetaryen"
                          : mealPrefs.diet === "vegan"
                            ? "Vegan"
                            : "Standart"}
                    {mealPrefs.calories
                      ? ` • ${mealPrefs.calories} kcal/gün`
                      : ""}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSettingsModalVisible(true)}
                  style={[
                    styles.settingsButton,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Settings size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* İLERLEME İSTATİSTİKLERİ */}
              <View style={styles.dashboardStats}>
                <View style={styles.dashboardStatCard}>
                  <View
                    style={[
                      styles.statIconCircle,
                      { backgroundColor: "#f59e0b20" },
                    ]}
                  >
                    <Flame size={20} color="#f59e0b" />
                  </View>
                  <Text
                    style={[styles.dashboardStatValue, { color: colors.text }]}
                  >
                    {dietStreakDays}
                  </Text>
                  <Text
                    style={[
                      styles.dashboardStatLabel,
                      { color: colors.textMuted },
                    ]}
                  >
                    Diyete Devam Etme Günü
                  </Text>
                </View>

                <View style={styles.dashboardStatCard}>
                  <View
                    style={[
                      styles.statIconCircle,
                      { backgroundColor: "#3b82f620" },
                    ]}
                  >
                    <CheckCircle2 size={20} color="#3b82f6" />
                  </View>
                  <Text
                    style={[styles.dashboardStatValue, { color: colors.text }]}
                  >
                    {perfectDays}
                  </Text>
                  <Text
                    style={[
                      styles.dashboardStatLabel,
                      { color: colors.textMuted },
                    ]}
                  >
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
                  <View
                    style={[
                      styles.statIconCircle,
                      { backgroundColor: "#f59e0b20" },
                    ]}
                  >
                    <Target size={20} color="#f59e0b" />
                  </View>
                  <Text
                    style={[styles.dashboardStatValue, { color: colors.text }]}
                  >
                    {targetWeight ? `%${Math.min(100, weightProgress)}` : "-"}
                  </Text>
                  <Text
                    style={[
                      styles.dashboardStatLabel,
                      { color: colors.textMuted },
                    ]}
                  >
                    {targetWeight
                      ? "Hedef İlerleme"
                      : "Hedef belirlenmedi, eklemek için tıkla"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* KİLO BİLGİLERİ */}
              <View style={styles.dashboardWeightSection}>
                <View style={styles.weightInfoRow}>
                  <View style={styles.weightInfoItem}>
                    <Text
                      style={[
                        styles.weightInfoLabel,
                        { color: colors.textMuted },
                      ]}
                    >
                      Başlangıç
                    </Text>
                    <Text
                      style={[styles.weightInfoValue, { color: colors.text }]}
                    >
                      {startWeight > 0 ? `${startWeight} kg` : "-"}
                    </Text>
                  </View>
                  <View style={styles.weightInfoItem}>
                    <Text
                      style={[
                        styles.weightInfoLabel,
                        { color: colors.textMuted },
                      ]}
                    >
                      Mevcut
                    </Text>
                    <Text
                      style={[styles.weightInfoValue, { color: colors.text }]}
                    >
                      {currentWeight > 0
                        ? `${currentWeight.toFixed(1)} kg`
                        : "-"}
                    </Text>
                  </View>
                  <View style={styles.weightInfoItem}>
                    <Text
                      style={[
                        styles.weightInfoLabel,
                        { color: colors.textMuted },
                      ]}
                    >
                      Değişim
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {weightChange !== 0 &&
                        (weightChange < 0 ? (
                          <TrendingDown size={16} color="#10b981" />
                        ) : (
                          <TrendingUp size={16} color="#ef4444" />
                        ))}
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
                    <View
                      style={[
                        styles.bmiIconCircle,
                        { backgroundColor: bmiCategory.color + "20" },
                      ]}
                    >
                      <Target size={18} color={bmiCategory.color} />
                    </View>
                    <Text style={[styles.bmiText, { color: colors.textMuted }]}>
                      BMI:{" "}
                      <Text style={{ color: colors.text, fontWeight: "700" }}>
                        {bmi}
                      </Text>{" "}
                      • {bmiCategory.status}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.weightInfoHint,
                    { backgroundColor: colors.background + "80" },
                  ]}
                >
                  <Text
                    style={[
                      styles.weightInfoHintText,
                      { color: colors.textMuted },
                    ]}
                  >
                    💡 Haftalık kilo girişlerini{" "}
                    <Text style={{ fontWeight: "700", color: colors.primary }}>
                      Ayarlar
                    </Text>{" "}
                    butonundan yapabilirsiniz
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
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

            <ScrollView
              style={{ maxHeight: "80%" }}
              showsVerticalScrollIndicator={false}
            >
              {/* TEMA / GÖRÜNÜM MODU */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={[
                    styles.settingsSectionLabel,
                    { color: colors.textMuted },
                  ]}
                >
                  Tema
                </Text>
                <SelectionGroup
                  label="Görünüm Modu"
                  options={[
                    { label: "Aydınlık", value: "light" },
                    { label: "Karanlık", value: "dark" },
                    { label: "Renkli", value: "colorful" },
                  ]}
                  selectedValue={themeMode}
                  onSelect={(val: string) =>
                    setThemeMode(val as "light" | "dark" | "colorful")
                  }
                />
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
                        color={
                          waterReminderEnabled ? "#3b82f6" : colors.textMuted
                        }
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
                      onValueChange={async value => {
                        setWaterReminderEnabled(value);
                        setSavingWaterReminder(true);
                        try {
                          const result =
                            await setupWaterRemindersForFamily(value);
                          if (!result.success && value) {
                            Alert.alert(
                              "Uyarı",
                              result.error ||
                                "Su içme hatırlatıcısı ayarlanamadı.",
                            );
                            setWaterReminderEnabled(false);
                            return;
                          }
                          await updatePreferences({
                            waterReminderEnabled: value,
                          });
                          Alert.alert(
                            "Başarılı",
                            value
                              ? "Su içme hatırlatıcısı aktif edildi."
                              : "Su içme hatırlatıcısı kapatıldı.",
                          );
                        } catch (e: any) {
                          Alert.alert(
                            "Hata",
                            e?.message || "Su içme hatırlatıcısı ayarlanamadı.",
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
                            ? colors.primary + "20"
                            : colors.border + "40",
                        },
                      ]}
                    >
                      <Target
                        size={20}
                        color={isMonday() ? colors.primary : colors.textMuted}
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

              {/* EKRAN YERLEŞİMİ VE TÜM AYARLAR */}
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
                        { backgroundColor: colors.primary + "20" },
                      ]}
                    >
                      <Settings size={20} color={colors.primary} />
                    </View>
                    <View style={styles.settingsItemTextContainer}>
                      <Text
                        style={[
                          styles.settingsItemTitleSmall,
                          { color: colors.text },
                        ]}
                      >
                        Ekran yerleşimi ve tüm ayarlar
                      </Text>
                      <Text
                        style={[
                          styles.settingsItemDescriptionSmall,
                          { color: colors.textMuted },
                        ]}
                      >
                        Dil, para birimi, tema ve diğer tercihler
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSettingsModalVisible(false);
                      navigation.navigate("Settings");
                    }}
                    style={[
                      styles.settingsActionButton,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <ChevronRight size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* GÜNLÜK AKTİVİTE BUTONLARI - SAĞDA DİKEYDE SABİT - Sadece Takipler sekmesinde göster */}
      {activeTab === "tracking" && (
        <View style={styles.fabWrapper} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.fabBase, { backgroundColor: "#3b82f6" }]}
            onPress={async () => {
              // Su içildi - 200 ml
              setSavingActivity(true);
              const dateStr = formatDateToLocalString(selectedDate);
              const result = await logWaterIntake(
                200,
                dateStr,
                "200ml su içildi",
              );
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
            style={[styles.fabBase, { backgroundColor: "#f59e0b" }]}
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
            style={[styles.fabBase, { backgroundColor: colors.primary }]}
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
      )}

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
                      {
                        color: colors.textMuted,
                        marginBottom: 20,
                        lineHeight: 20,
                      },
                    ]}
                  >
                    Yemek ve/veya içecek adını girin, kalori girebilir veya AI
                    ile devam edebilirsiniz.
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
                      <UtensilsCrossed
                        size={20}
                        color={colors.primary}
                        style={{ marginRight: 8 }}
                      />
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
                      <Droplet
                        size={20}
                        color={colors.primary}
                        style={{ marginRight: 8 }}
                      />
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
                      {
                        color: colors.textMuted,
                        marginBottom: 20,
                        lineHeight: 20,
                      },
                    ]}
                  >
                    Lütfen detay bilgilerini girin (örneğin: yarım/tam,
                    lavash/ekmek, kutu/şişe/bardak).
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
                        <UtensilsCrossed
                          size={20}
                          color={colors.primary}
                          style={{ marginRight: 8 }}
                        />
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
                        <Droplet
                          size={20}
                          color={colors.primary}
                          style={{ marginRight: 8 }}
                        />
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
                      {
                        color: colors.textMuted,
                        marginBottom: 20,
                        lineHeight: 20,
                      },
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
                      {
                        color: colors.textMuted,
                        marginBottom: 16,
                        lineHeight: 20,
                      },
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
                <View
                  style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}
                >
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
                    <Text
                      style={[styles.modalButtonText, { color: colors.text }]}
                    >
                      İptal
                    </Text>
                  </TouchableOpacity>

                  {(parseFloat(foodCaloriesInput) > 0 ||
                    parseFloat(drinkCaloriesInput) > 0) && (
                    <TouchableOpacity
                      onPress={async () => {
                        const items: Array<{
                          name: string;
                          calories: number;
                          details: string | null;
                          isDrink: boolean;
                          manualCalories?: number;
                        }> = [];

                        if (
                          foodNameInput.trim() &&
                          parseFloat(foodCaloriesInput) > 0
                        ) {
                          items.push({
                            name: foodNameInput.trim(),
                            calories: parseFloat(foodCaloriesInput),
                            details: null,
                            isDrink: false,
                            manualCalories: parseFloat(foodCaloriesInput),
                          });
                        }

                        if (
                          drinkNameInput.trim() &&
                          parseFloat(drinkCaloriesInput) > 0
                        ) {
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
                          backgroundColor: savingActivity
                            ? colors.textMuted
                            : colors.primary,
                          flex: 1,
                        },
                      ]}
                    >
                      {savingActivity ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text
                          style={[styles.modalButtonText, { color: "#fff" }]}
                        >
                          Kaydet
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {!parseFloat(foodCaloriesInput) &&
                    !parseFloat(drinkCaloriesInput) &&
                    (foodNameInput.trim() || drinkNameInput.trim()) && (
                      <TouchableOpacity
                        onPress={() => setModalMode("details")}
                        style={[
                          styles.modalButton,
                          styles.modalButtonConfirm,
                          { backgroundColor: colors.primary, flex: 1 },
                        ]}
                      >
                        <Text
                          style={[styles.modalButtonText, { color: "#fff" }]}
                        >
                          Devam Et
                        </Text>
                      </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity
                  onPress={async () => {
                    const permission =
                      await ImagePicker.requestCameraPermissionsAsync();
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
                  <Camera
                    size={20}
                    color={colors.primary}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={[styles.modalButtonText, { color: colors.primary }]}
                  >
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
                    <Text
                      style={[styles.modalButtonText, { color: colors.text }]}
                    >
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
                        const {
                          details,
                          calories,
                          error: calcError,
                        } = await getFoodDetailsWithCalories(
                          foodNameInput.trim(),
                          false,
                          foodDetailsInput.trim() || undefined,
                        );
                        setCalculatingCalories(false);

                        if (calcError || !calories) {
                          Alert.alert(
                            "Hata",
                            `Yemek için: ${calcError || "Kalori hesaplanamadı."}`,
                          );
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
                        const {
                          details,
                          calories,
                          error: calcError,
                        } = await getFoodDetailsWithCalories(
                          drinkNameInput.trim(),
                          true,
                          drinkDetailsInput.trim() || undefined,
                        );
                        setCalculatingCalories(false);

                        if (calcError || !calories) {
                          Alert.alert(
                            "Hata",
                            `İçecek için: ${calcError || "Kalori hesaplanamadı."}`,
                          );
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
                        backgroundColor: calculatingCalories
                          ? colors.textMuted
                          : colors.primary,
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
                    <Text
                      style={[styles.modalButtonText, { color: colors.text }]}
                    >
                      Geri
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      const permission =
                        await ImagePicker.requestCameraPermissionsAsync();
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
                    <Text
                      style={[styles.modalButtonText, { color: colors.text }]}
                    >
                      Yeniden Çek
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      setAiAnalyzing(true);
                      const result = await analyzeFoodFromImage(capturedImage);
                      setAiAnalyzing(false);

                      if (result.error || !result.calories) {
                        Alert.alert(
                          "Hata",
                          result.error || "Resim analiz edilemedi.",
                        );
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
                        backgroundColor: aiAnalyzing
                          ? colors.textMuted
                          : colors.primary,
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
            style={{
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
            }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
            enabled={true}
          >
            <View
              style={[
                styles.modalCard,
                { backgroundColor: colors.card, minHeight: 350 },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Egzersiz Ekle
                </Text>
                <TouchableOpacity
                  onPress={() => setExerciseModalVisible(false)}
                >
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
                    <Text
                      style={[styles.modalButtonText, { color: colors.text }]}
                    >
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
                      const result = await getExerciseCalories(
                        exerciseName,
                        duration,
                      );
                      setCalculatingExerciseCalories(false);

                      if (result.error || !result.caloriesBurned) {
                        Alert.alert(
                          "Hata",
                          result.error ||
                            "Kalori hesaplanamadı. Lütfen tekrar deneyin.",
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
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, maxHeight: "85%" },
            ]}
          >
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
                      {pendingItems.reduce(
                        (sum, item) => sum + item.calories,
                        0,
                      )}
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
                      notes,
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
                        Alert.alert("Başarılı", `Tüm öğeler kaydedildi.`);
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
                      Alert.alert(
                        "Hata",
                        result.error || "Kalori kaydı eklenemedi.",
                      );
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
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, maxHeight: "85%" },
            ]}
          >
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
                      backgroundColor: "#8b5cf620",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <Dumbbell size={24} color="#8b5cf6" />
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
                      backgroundColor: "#f59e0b10",
                      padding: 12,
                      borderRadius: 12,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#f59e0b20",
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
                            color: "#f59e0b",
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
                      confirmedExerciseName,
                    );
                    setSavingActivity(false);

                    if (result.success) {
                      Alert.alert(
                        "Başarılı",
                        `${confirmedExerciseName} egzersizi kaydedildi.`,
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
                      Alert.alert(
                        "Hata",
                        result.error || "Egzersiz kaydı eklenemedi.",
                      );
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
      <Modal
        visible={targetWeightModalVisible}
        transparent
        animationType="fade"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: colors.card, maxHeight: "90%" },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Hedef Kilo Belirle
                </Text>
                <TouchableOpacity
                  onPress={() => setTargetWeightModalVisible(false)}
                >
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
                  Diyet programınız için hedef kilonuzu belirleyin. Bu bilgi
                  ilerleme durumunuzu hesaplamak için kullanılacaktır.
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
                  <Text
                    style={[
                      styles.modalDesc,
                      { color: colors.textMuted, marginTop: 8, fontSize: 12 },
                    ]}
                  >
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
                  <Text
                    style={[styles.modalButtonText, { color: colors.text }]}
                  >
                    İptal
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    if (!targetWeightInput || !profile?.id) return;

                    const weightValue = parseFloat(
                      targetWeightInput.replace(",", "."),
                    );
                    if (
                      isNaN(weightValue) ||
                      weightValue <= 0 ||
                      weightValue > 300
                    ) {
                      Alert.alert(
                        "Hata",
                        "Geçerli bir kilo girin (0-300 kg arası).",
                      );
                      return;
                    }

                    setSaving(true);
                    try {
                      setTargetWeight(weightValue);
                      await AsyncStorage.setItem(
                        `diet_target_weight_${profile.id}`,
                        weightValue.toString(),
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
                  style={[
                    styles.modalButton,
                    styles.modalButtonSave,
                    { backgroundColor: colors.primary },
                  ]}
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
                style={[
                  styles.modalButton,
                  styles.modalButtonSave,
                  { backgroundColor: colors.primary },
                ]}
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

      {/* DİYET PROGRAMI OLUŞTURMA MODAL */}
      <Modal visible={dietPlanModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Yeni Haftalık Diyet Programı
              </Text>
              <TouchableOpacity onPress={() => setDietPlanModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.modalDesc,
                { color: colors.textMuted, marginBottom: 20 },
              ]}
            >
              BMI değerinize, alerji ve sağlık bilgilerinize göre
              kişiselleştirilmiş günlük diyet program hazırlanacaktır.
            </Text>

            {/* MUTFAK BİLGİSİ SEÇİMLERİ */}
            <View style={{ gap: 16, width: "100%", marginBottom: 20 }}>
              {/* MASRAF TERCIHİ */}
              <View>
                <SelectionGroup
                  label="Masraf Tercihi"
                  options={[
                    { label: "Uygun", value: "affordable" },
                    { label: "Orta", value: "moderate" },
                    { label: "Pahalı", value: "expensive" },
                  ]}
                  selectedValue={budgetPreference}
                  onSelect={(val: any) => setBudgetPreference(val)}
                />
              </View>

              {/* YAPILIŞ ZORLUĞU */}
              <View>
                <SelectionGroup
                  label="Yapılış Zorluğu"
                  options={[
                    { label: "Kolay", value: "easy" },
                    { label: "Orta", value: "moderate" },
                    { label: "Zor", value: "difficult" },
                  ]}
                  selectedValue={difficultyPreference}
                  onSelect={(val: any) => setDifficultyPreference(val)}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setDietPlanModalVisible(false)}
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
                  // Yeni haftalık diyet programı oluştur
                  if (!member || !profile?.id) return;

                  const age = calculateAge(member.birth_date);
                  if (!age) {
                    Alert.alert("Hata", "Doğum tarihi bulunamadı.");
                    setDietPlanModalVisible(false);
                    return;
                  }

                  const bmi = calculateBMI(member.weight, member.height);
                  if (!bmi) {
                    Alert.alert("Hata", "BMI hesaplanamadı.");
                    setDietPlanModalVisible(false);
                    return;
                  }

                  setSaving(true);
                  try {
                    // Bu Pazartesi'den bir sonraki Pazartesi'ye kadar program oluştur
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const nextMonday = startOfWeek(addDays(today, 7), {
                      weekStartsOn: 1,
                    });

                    const mealPrefs = member.meal_preferences || {};

                    const result = await generateDietPlan({
                      bmi,
                      weight: member.weight || 0,
                      height: member.height || 0,
                      age: age,
                      gender: member.gender,
                      currentDiet: mealPrefs.diet,
                      currentCuisine: mealPrefs.cuisine,
                      currentAvoid: mealPrefs.avoid,
                      allergies: member.allergies,
                      medications: member.medications,
                      notes: member.notes,
                      startDate: format(today, "yyyy-MM-dd"),
                      endDate: format(nextMonday, "yyyy-MM-dd"),
                      budgetPreference: budgetPreference,
                      difficultyPreference: difficultyPreference,
                    });

                    if (result.error || !result.needsDiet || !result.dietPlan) {
                      Alert.alert(
                        "Uyarı",
                        result.error ||
                          "Yeni diyet programı oluşturulamadı. Mevcut program devam edecek.",
                      );
                      setDietPlanModalVisible(false);
                      setSaving(false);
                      return;
                    }

                    // Diyet planını onay için sakla
                    setPendingDietPlan({
                      dietPlan: result.dietPlan,
                      updatedPreferences: result.updatedPreferences,
                      startDate: format(today, "yyyy-MM-dd"),
                      endDate: format(nextMonday, "yyyy-MM-dd"),
                    });

                    setDietPlanModalVisible(false);
                    setDietPlanApprovalVisible(true);
                  } catch (error: any) {
                    Alert.alert(
                      "Hata",
                      error.message || "Yeni diyet programı oluşturulamadı.",
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
                style={[
                  styles.modalButton,
                  styles.modalButtonSave,
                  { backgroundColor: colors.primary },
                ]}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                    Oluştur
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DİYET PLANI ONAY MODAL */}
      <Modal visible={dietPlanApprovalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, maxHeight: "90%", width: "90%" },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.text, marginBottom: 16 },
                ]}
              >
                Günlük Diyet Programı
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setDietPlanApprovalVisible(false);
                  setPendingDietPlan(null);
                }}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: "70%", width: "100%" }}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {pendingDietPlan?.dietPlan && (
                <>
                  <View
                    style={{
                      marginBottom: 16,
                      padding: 12,
                      backgroundColor: colors.background,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: colors.text,
                        marginBottom: 8,
                      }}
                    >
                      Program Özeti
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textMuted,
                        marginBottom: 4,
                      }}
                    >
                      Hedef:{" "}
                      {pendingDietPlan.dietPlan.goal || "Sağlıklı beslenme"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textMuted,
                        marginBottom: 4,
                      }}
                    >
                      Günlük Kalori:{" "}
                      {pendingDietPlan.dietPlan.daily_calories ||
                        "Hesaplanıyor"}{" "}
                      kcal
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>
                      Diyet Tipi:{" "}
                      {pendingDietPlan.dietPlan.diet_type || "Standart"}
                    </Text>
                  </View>

                  {pendingDietPlan.dietPlan.daily_meal_plans &&
                    pendingDietPlan.dietPlan.daily_meal_plans.length > 0 && (
                      <View>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: colors.text,
                            marginBottom: 12,
                          }}
                        >
                          Haftalık Yemek Planı
                        </Text>
                        {pendingDietPlan.dietPlan.daily_meal_plans.map(
                          (dayPlan: any, index: number) => (
                            <View
                              key={index}
                              style={{
                                marginBottom: 16,
                                padding: 12,
                                backgroundColor: colors.background,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: "700",
                                  color: colors.primary,
                                  marginBottom: 8,
                                }}
                              >
                                {format(
                                  new Date(dayPlan.date),
                                  "EEEE, d MMMM",
                                  { locale: tr },
                                ) ||
                                  dayPlan.day ||
                                  `Gün ${index + 1}`}
                              </Text>
                              {dayPlan.meals &&
                                dayPlan.meals.map(
                                  (meal: any, mealIndex: number) => (
                                    <View
                                      key={mealIndex}
                                      style={{ marginBottom: 6 }}
                                    >
                                      <Text
                                        style={{
                                          fontSize: 11,
                                          color: colors.textMuted,
                                          marginBottom: 2,
                                        }}
                                      >
                                        {meal.time} •{" "}
                                        {meal.type === "breakfast"
                                          ? "Kahvaltı"
                                          : meal.type === "lunch"
                                            ? "Öğle Yemeği"
                                            : meal.type === "dinner"
                                              ? "Akşam Yemeği"
                                              : "Atıştırmalık"}
                                        :
                                      </Text>
                                      <Text
                                        style={{
                                          fontSize: 12,
                                          color: colors.text,
                                        }}
                                      >
                                        {meal.meal} ({meal.calories} kcal)
                                      </Text>
                                    </View>
                                  ),
                                )}
                            </View>
                          ),
                        )}
                      </View>
                    )}
                </>
              )}
            </ScrollView>

            <View style={{ gap: 12, width: "100%", marginTop: 16 }}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={async () => {
                  if (!pendingDietPlan || !member || !profile?.id) return;

                  setSaving(true);
                  try {
                    // Diyet planını veritabanına kaydet
                    const { saveDietPlan } =
                      await import("../../services/dietPlans");
                    const saveResult = await saveDietPlan(
                      pendingDietPlan.startDate,
                      pendingDietPlan.endDate,
                      pendingDietPlan.dietPlan,
                      pendingDietPlan.dietPlan.goal,
                      pendingDietPlan.dietPlan.daily_calories,
                      pendingDietPlan.dietPlan.diet_type,
                    );

                    if (saveResult.error) {
                      Alert.alert(
                        "Hata",
                        "Diyet programı kaydedilemedi: " + saveResult.error,
                      );
                      setSaving(false);
                      return;
                    }

                    // meal_preferences'ı güncelle
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const updatedPrefs = {
                      ...member.meal_preferences,
                      last_diet_plan_date: format(today, "yyyy-MM-dd"),
                    };

                    await updateMemberDetails(profile.id, {
                      meal_preferences: updatedPrefs,
                    });

                    setDietPlanApprovalVisible(false);
                    setPendingDietPlan(null);
                    setDietPlanModalVisible(false);
                    Alert.alert(
                      "Başarılı",
                      "Yeni haftalık diyet programınız hazırlandı!",
                    );
                    await loadMember();
                  } catch (error: any) {
                    Alert.alert(
                      "Hata",
                      error.message || "Diyet programı kaydedilemedi.",
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                    Onayla ve Kaydet
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setDietPlanApprovalVisible(false);
                  setPendingDietPlan(null);
                }}
                disabled={saving}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  İptal
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EGZERSİZ TIMER FULL SCREEN MODAL */}
      <Modal
        visible={exerciseTimerModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          // Android geri butonu ile kapatmayı engelle
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flex: 1, flexDirection: "column" }}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: 24,
                paddingBottom: 220,
                alignItems: "center",
              }}
              showsVerticalScrollIndicator={false}
            >
              {/* HEADER - Minimize Button */}
              <View
                style={{
                  width: "100%",
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  paddingTop: 24,
                  marginBottom: 20,
                }}
              >
                <TouchableOpacity
                  onPress={() => setExerciseTimerModalVisible(false)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.border,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* MAIN CONTENT */}
              <View
                style={{
                  justifyContent: "center",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                {/* BIG TIMER - TOP */}
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <Text
                    style={{
                      fontSize: 80,
                      fontWeight: "900",
                      color: exerciseTimerPaused
                        ? colors.textMuted
                        : isReadingTime
                          ? "#f59e0b"
                          : colors.primary,
                      fontFamily:
                        Platform.OS === "ios" ? "Courier" : "monospace",
                      textAlign: "center",
                    }}
                  >
                    {formatTime(remainingTime)}
                  </Text>
                </View>

                {/* TWO CIRCLES SIDE BY SIDE - MOVED UNDER TIMER */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 30,
                    paddingHorizontal: 20,
                    gap: 30, // Modern gap between circles
                  }}
                >
                  {/* PROGRESS CIRCLE - MODERN */}
                  <View
                    style={{
                      width: 150,
                      height: 150,
                      borderRadius: 75,
                      backgroundColor: colors.card,
                      justifyContent: "center",
                      alignItems: "center",
                      position: "relative",
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      elevation: 6,
                      borderWidth: 3,
                      borderColor: colors.primary + "30",
                    }}
                  >
                    {/* Progress Circle SVG */}
                    <Svg
                      width="150"
                      height="150"
                      style={{ position: "absolute" }}
                    >
                      <SvgCircle
                        cx="75"
                        cy="75"
                        r="65"
                        stroke={colors.border}
                        strokeWidth="6"
                        fill="transparent"
                      />
                      <SvgCircle
                        cx="75"
                        cy="75"
                        r="65"
                        stroke={colors.primary}
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 65}`}
                        strokeDashoffset={`${
                          2 *
                          Math.PI *
                          65 *
                          (1 -
                            currentExerciseStep /
                              (currentExercisePlan?.exercises?.length || 1))
                        }`}
                        strokeLinecap="round"
                        transform="rotate(-90 75 75)"
                      />
                    </Svg>

                    {/* Center Content */}
                    <View style={{ alignItems: "center" }}>
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: "800",
                          color: colors.text,
                        }}
                      >
                        {Math.round(
                          (currentExerciseStep /
                            (currentExercisePlan?.exercises?.length || 1)) *
                            100,
                        )}
                        %
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textMuted,
                          marginTop: 2,
                          textAlign: "center",
                        }}
                      >
                        Egzersiz{"\n"}Tamamlandı
                      </Text>
                    </View>
                  </View>

                  {/* CALORIES CIRCLE - MODERN */}
                  <View
                    style={{
                      width: 150,
                      height: 150,
                      borderRadius: 75,
                      backgroundColor: colors.card,
                      justifyContent: "center",
                      alignItems: "center",
                      position: "relative",
                      shadowColor: "#ff6b35",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      elevation: 6,
                      borderWidth: 3,
                      borderColor: "#ff6b35" + "30",
                    }}
                  >
                    {/* Calorie Progress Circle SVG */}
                    <Svg
                      width="150"
                      height="150"
                      style={{ position: "absolute" }}
                    >
                      <SvgCircle
                        cx="75"
                        cy="75"
                        r="65"
                        stroke={colors.border}
                        strokeWidth="6"
                        fill="transparent"
                      />
                      <SvgCircle
                        cx="75"
                        cy="75"
                        r="65"
                        stroke="#ff6b35"
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 65}`}
                        strokeDashoffset={`${
                          2 *
                          Math.PI *
                          65 *
                          (1 -
                            burnedCaloriesInSession /
                              (currentExercisePlan?.total_calories || 1))
                        }`}
                        strokeLinecap="round"
                        transform="rotate(-90 75 75)"
                      />
                    </Svg>

                    {/* Center Content */}
                    <View style={{ alignItems: "center" }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 2,
                        }}
                      >
                        <Flame size={16} color="#ff6b35" />
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: "800",
                            color: colors.text,
                            marginLeft: 4,
                          }}
                        >
                          {burnedCaloriesInSession}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 11,
                          color: colors.textMuted,
                          textAlign: "center",
                        }}
                      >
                        / {currentExercisePlan?.total_calories || 0}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textMuted,
                          marginTop: 2,
                          textAlign: "center",
                        }}
                      >
                        Yakılan{"\n"}Kalori
                      </Text>
                    </View>
                  </View>
                </View>

                {/* CURRENT EXERCISE - DETAILED - MOVED AFTER CIRCLES */}
                <Animated.View
                  style={{
                    alignItems: "center",
                    marginBottom: 30,
                    backgroundColor: colors.card,
                    marginHorizontal: 6,
                    paddingTop: 12,
                    paddingBottom: 20,
                    paddingHorizontal: 20,
                    borderRadius: 16,
                    borderWidth: isReadingTime ? 3 : 0,
                    borderColor: borderOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["transparent", "#f59e0b"],
                    }),
                    shadowColor: isReadingTime ? "#f59e0b" : "transparent",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: borderOpacity,
                    shadowRadius: 8,
                    elevation: isReadingTime ? 8 : 0,
                  }}
                >
                  {isReadingTime && (
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: "#f59e0b",
                        textAlign: "center",
                        marginBottom: 8,
                      }}
                    >
                      Sıradaki egzersiz • {readingTimeLeft} sn dinlenme
                    </Text>
                  )}
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "800",
                      color: colors.text,
                      textAlign: "center",
                      marginBottom: 12,
                    }}
                  >
                    {(isReadingTime && readingTimeNextExerciseIndex != null
                      ? currentExercisePlan?.exercises?.[
                          readingTimeNextExerciseIndex
                        ]
                      : currentExercisePlan?.exercises?.[currentExerciseStep]
                    )?.name?.replace(/\s*\([^)]*\)/g, "") || "Egzersiz"}
                  </Text>

                  {/* Exercise Type & Details */}
                  {(() => {
                    const exercise =
                      isReadingTime && readingTimeNextExerciseIndex != null
                        ? currentExercisePlan?.exercises?.[
                            readingTimeNextExerciseIndex
                          ]
                        : currentExercisePlan?.exercises?.[currentExerciseStep];
                    if (!exercise) return null;

                    const typeLabel =
                      exercise.type === "cardio"
                        ? "Kardiyovasküler"
                        : exercise.type === "strength"
                          ? "Güç"
                          : exercise.type === "flexibility"
                            ? "Esneklik"
                            : exercise.type === "balance"
                              ? "Denge"
                              : "Diğer";

                    return (
                      <>
                        {/* Type & Duration/Reps */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 12,
                            flexWrap: "wrap",
                            justifyContent: "center",
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: colors.primary + "20",
                              paddingHorizontal: 12,
                              paddingVertical: 4,
                              borderRadius: 12,
                              marginRight: 8,
                              marginBottom: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                color: colors.primary,
                                fontWeight: "600",
                              }}
                            >
                              {typeLabel}
                            </Text>
                          </View>

                          <View
                            style={{
                              backgroundColor: colors.border + "40",
                              paddingHorizontal: 12,
                              paddingVertical: 4,
                              borderRadius: 12,
                              marginRight: 8,
                              marginBottom: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                color: colors.text,
                                fontWeight: "600",
                              }}
                            >
                              {exercise.duration} dk
                            </Text>
                          </View>

                          {exercise.sets && exercise.reps && (
                            <View
                              style={{
                                backgroundColor: "#ff6b35" + "20",
                                paddingHorizontal: 12,
                                paddingVertical: 4,
                                borderRadius: 12,
                                marginBottom: 4,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: "#ff6b35",
                                  fontWeight: "600",
                                }}
                              >
                                {exercise.sets} set × {exercise.reps} tekrar
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Instructions */}
                        {exercise.instructions && (
                          <Text
                            style={{
                              fontSize: 14,
                              color: colors.textMuted,
                              textAlign: "center",
                              lineHeight: 20,
                              fontStyle: "italic",
                            }}
                          >
                            "{exercise.instructions}"
                          </Text>
                        )}
                      </>
                    );
                  })()}
                </Animated.View>
              </View>
            </ScrollView>

            {/* ALTTA SABİT: her buton kendi gölgesiyle, sarmalayan kutu yok */}
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                flexDirection: "column",
                alignItems: "center",
                paddingHorizontal: 24,
                paddingBottom: Math.max(insets.bottom, 24),
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 40,
                }}
              >
                <TouchableOpacity
                  onPress={
                    exerciseTimerPaused
                      ? resumeExerciseTimer
                      : pauseExerciseTimer
                  }
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: exerciseTimerPaused
                      ? colors.primary
                      : "#f59e0b",
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    elevation: 8,
                  }}
                >
                  {exerciseTimerPaused ? (
                    <Play size={32} color="#fff" />
                  ) : (
                    <Pause size={32} color="#fff" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={stopExerciseTimer}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: "#ef4444",
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    elevation: 8,
                  }}
                >
                  <Square size={32} color="#fff" />
                </TouchableOpacity>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 40,
                  marginTop: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.textMuted,
                    width: 80,
                    textAlign: "center",
                  }}
                >
                  {exerciseTimerPaused ? "Devam" : "Duraklat"}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.textMuted,
                    width: 80,
                    textAlign: "center",
                  }}
                >
                  Durdur
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
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
    paddingHorizontal: 12,
    paddingTop: 20,
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
    bottom: Platform.OS === "ios" ? 98 : 88,
    right: 12,
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
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
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
  settingsSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
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
  compactTrackingGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  compactTrackingItem: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  compactTrackingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  compactTrackingInfo: {
    alignItems: "center",
    marginTop: 8,
  },
  compactTrackingLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  compactTrackingValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  compactTrackingTarget: {
    fontSize: 10,
    fontWeight: "500",
  },
  netCaloriesInfo: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  netCaloriesText: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
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
