import React, { useCallback, useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import ModernInput from "../../components/ui/ModernInput";
import {
  updateMemberDetails,
  FamilyMember,
  getMemberById,
} from "../../services/family";
import { generateDietPlan } from "../../services/kitchen";
import { saveDietPlan } from "../../services/dietPlans";
import { generateExercisePlan, saveExercisePlan } from "../../services/exercisePlans";
import {
  ShieldAlert,
  Save,
  Share2,
  Activity,
  GraduationCap,
  Utensils,
  ChevronLeft,
  Apple,
} from "lucide-react-native";
import { calculateAge } from "../../services/waterReminder";
import SelectionGroup from "../../components/ui/SelectionGroup";
import { useFocusEffect } from "@react-navigation/native";
import { startOfWeek, addDays, format, eachDayOfInterval } from "date-fns";
import { tr } from "date-fns/locale";

export default function MemberDetailScreen({ route, navigation }: any) {
  const { member, showDietModal, isMemberEdit }: { member: FamilyMember; showDietModal?: boolean; isMemberEdit?: boolean } = route.params || {};
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [editMember, setEditMember] = useState<FamilyMember>(member);
  
  // Üye kendi bilgilerini düzenliyorsa, önemli alanları readonly yap
  const isReadOnlyField = isMemberEdit;
  
  // Kullanıcı yönetici mi kontrol et
  const isAdmin = ["owner", "admin"].includes(profile?.role || "");
  const canEditNotes = isAdmin || !isMemberEdit; // Yönetici veya kendi bilgilerini düzenliyorsa notları düzenleyebilir
  
  const [qrVisible, setQrVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dietModalVisible, setDietModalVisible] = useState(false);
  const [dietLoading, setDietLoading] = useState(false);
  const [dietPlan, setDietPlan] = useState<any>(null);
  const [dietPlanApprovalVisible, setDietPlanApprovalVisible] = useState(false);
  const [budgetPreference, setBudgetPreference] = useState<"affordable" | "moderate" | "expensive">("moderate"); // Masraf tercihi
  const [difficultyPreference, setDifficultyPreference] = useState<"easy" | "moderate" | "difficult">("moderate"); // Yapılış zorluğu
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false); // Egzersiz planı modalı
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [exercisePlan, setExercisePlan] = useState<any>(null);
  const [exercisePlanApprovalVisible, setExercisePlanApprovalVisible] = useState(false);
  const [equipmentPreference, setEquipmentPreference] = useState<"home_no_equipment" | "home_with_equipment" | "gym">("home_no_equipment"); // Ekipman tercihi
  const [fitnessLevel, setFitnessLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate"); // Fitness seviyesi
  const centeredInputStyle = { textAlignVertical: "center" as const };
  const centeredMultilineStyle = {
    textAlignVertical: "center" as const,
    paddingVertical: 14,
  };
  const resolveInfoMode = useCallback((target: FamilyMember) => {
    const hasSchool = Boolean(
      target?.school_name || target?.school_class || target?.school_no
    );
    const hasWork = Boolean(target?.workplace || target?.occupation);
    if (target?.role === "member") return "school";
    if (hasSchool && hasWork) return "both";
    if (hasWork) return "work";
    return "school";
  }, []);
  const [infoMode, setInfoMode] = useState<"school" | "work" | "both">(
    resolveInfoMode(member)
  );
  const [mealPreferences, setMealPreferences] = useState<{
    cuisine: string;
    calories: string;
    avoid: string;
    diet: string;
    notes: string;
    diet_start_date: string;
    diet_active: boolean;
    diet_enabled?: boolean;
    exercise_enabled?: boolean;
  }>({
    cuisine: member?.meal_preferences?.cuisine || "world",
    calories: member?.meal_preferences?.calories || "",
    avoid: member?.meal_preferences?.avoid || "",
    diet: member?.meal_preferences?.diet || "standard",
    notes: member?.meal_preferences?.notes || "",
    diet_start_date: member?.meal_preferences?.diet_start_date || "",
    diet_active: member?.meal_preferences?.diet_active || false,
    diet_enabled: member?.meal_preferences?.diet_enabled !== false,
    exercise_enabled: member?.meal_preferences?.exercise_enabled !== false,
  });
  
  // Diyet programı aktif mi kontrol et
  const hasActiveDiet = useMemo(() => {
    if (!mealPreferences) return false;
    
    // diet_active boolean olarak tanımlı, ama JSONB'den string olarak gelebilir
    const dietActiveValue: any = mealPreferences.diet_active;
    const isActive = 
      dietActiveValue === true || 
      (typeof dietActiveValue === "string" && dietActiveValue.toLowerCase() === "true") ||
      (typeof dietActiveValue === "number" && dietActiveValue === 1);
    
    const startDate = mealPreferences.diet_start_date;
    const hasStartDate = startDate && String(startDate).trim() !== "" && String(startDate).trim() !== "null";
    
    const result = Boolean(isActive && hasStartDate);
    
    return result;
  }, [mealPreferences]);
  
  const [dietRenewalModalVisible, setDietRenewalModalVisible] = useState(false);

  const hydrateFromMember = useCallback(
    (next: FamilyMember) => {
      setEditMember(next);
      setInfoMode(resolveInfoMode(next));
      setMealPreferences({
        cuisine: next?.meal_preferences?.cuisine || "world",
        calories: next?.meal_preferences?.calories || "",
        avoid: next?.meal_preferences?.avoid || "",
        diet: next?.meal_preferences?.diet || "standard",
        notes: next?.meal_preferences?.notes || "",
        diet_start_date: next?.meal_preferences?.diet_start_date || "",
        diet_active: next?.meal_preferences?.diet_active || false,
        diet_enabled: next?.meal_preferences?.diet_enabled !== false, // Varsayılan true
        exercise_enabled: next?.meal_preferences?.exercise_enabled !== false, // Varsayılan true
      });
      
      // 30 gün kontrolü
      if (next?.meal_preferences?.diet_start_date && next?.meal_preferences?.diet_active) {
        const startDate = new Date(next.meal_preferences.diet_start_date);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff >= 30) {
          // 30 gün geçmişse kontrol modalını göster
          setTimeout(() => {
            setDietRenewalModalVisible(true);
          }, 500);
        }
      }
    },
    [resolveInfoMode]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        const res = await getMemberById(member.id);
        if (active && res.member) {
          hydrateFromMember(res.member as FamilyMember);
          // Eğer showDietModal parametresi varsa ve diyet aktifse modal'ı aç
          const params = route.params || {};
          if (params.showDietModal && res.member.meal_preferences?.diet_active) {
            setTimeout(() => {
              setDietModalVisible(true);
            }, 300);
          }
        }
      };
      load();
      return () => {
        active = false;
      };
    }, [member.id, hydrateFromMember, route.params])
  );


  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await updateMemberDetails(member.id, {
        ...editMember,
        meal_preferences: mealPreferences,
      });
    if (res.success) {
      Alert.alert("Başarılı", "Bilgiler güncellendi.");
      // Üye bilgilerini yeniden yükle
      const memberRes = await getMemberById(member.id);
      if (memberRes.member) {
        hydrateFromMember(memberRes.member as FamilyMember);
      }
      navigation.goBack();
        return;
      }
      Alert.alert("Hata", res.error || "Bilgiler güncellenemedi.");
    } catch (error: any) {
      Alert.alert("Hata", error?.message || "Bilgiler güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  // BMI hesaplama fonksiyonu
  const calculateBMI = (weight: number | undefined, height: number | undefined) => {
    if (!weight || !height || height === 0) return null;
    // Boy cm cinsinden, metreye çevir
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10; // 1 ondalık basamak
  };

  // BMI değerlendirme fonksiyonu
  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { status: "Zayıf", color: "#3b82f6", advice: "Sağlıklı kilo almak için dengeli beslenme önerilir." };
    if (bmi < 25) return { status: "Normal", color: "#10b981", advice: "Harika! Sağlıklı kilo aralığındasınız." };
    if (bmi < 30) return { status: "Fazla Kilolu", color: "#f59e0b", advice: "Sağlıklı kilo vermek için diyet ve egzersiz önerilir." };
    return { status: "Obez", color: "#ef4444", advice: "Sağlıklı kilo vermek için bir doktora danışmanız önerilir." };
  };

  const bmi = calculateBMI(editMember.weight, editMember.height);
  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  const vCardData = `BEGIN:VCARD
  VERSION:3.0
  FN:ACIL - ${editMember.full_name}
  TEL;TYPE=CELL:${editMember.phone || ""}
  NOTE:Kan Grubu: ${editMember.blood_type || "Bilinmiyor"}\\
  nAlerjiler: ${editMember.allergies || "Yok"}\\
  nİlaçlar: ${editMember.medications || "Yok"}
  END:VCARD`;

  const SectionTitle = ({ icon: Icon, title }: any) => (
    <View style={styles.sectionHeader}>
      <Icon size={20} color={colors.primary} />
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>
        {title}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { borderColor: colors.border }]}
          >
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            Üye Detayları
          </Text>
        </View>

      {/* FİZİKSEL BİLGİLER */}
      <SectionTitle icon={Activity} title="Fiziksel Bilgiler" />
      <SelectionGroup
        label="Cinsiyet"
        options={[
          { label: "Erkek", value: "male" },
          { label: "Kadın", value: "female" },
          { label: "Belirtmek İstemiyorum", value: "other" },
        ]}
        selectedValue={editMember.gender || "other"}
        onSelect={val => setEditMember({ ...editMember, gender: val })}
      />
      <ModernInput
        label="Doğum Tarihi"
        value={editMember.birth_date || ""}
        onChangeText={t => {
          if (isReadOnlyField) return; // Üye kendi bilgilerini düzenliyorsa değiştirilemez
          // YYYY-MM-DD formatında tarih girişi
          let formatted = t.replace(/[^0-9-]/g, '');
          if (formatted.length > 10) formatted = formatted.slice(0, 10);
          setEditMember({ ...editMember, birth_date: formatted });
        }}
        keyboardType="default"
        style={[centeredInputStyle, isReadOnlyField && { opacity: 0.5 }]}
        placeholder="YYYY-MM-DD (Örn: 1990-01-15)"
        editable={!isReadOnlyField}
      />
      {isReadOnlyField && (
        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, marginLeft: 4, marginBottom: 8 }}>
          Bu bilgi sadece ebeveynler tarafından değiştirilebilir
        </Text>
      )}
      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 10 }}>
      <ModernInput
            label="Kilo (kg) *"
            value={editMember.weight ? String(editMember.weight) : ""}
            onChangeText={t => {
              if (isReadOnlyField) return; // Üye kendi bilgilerini düzenliyorsa değiştirilemez
              const num = t.replace(/[^0-9.]/g, '');
              setEditMember({ ...editMember, weight: num ? Number(num) : undefined });
            }}
            keyboardType="numeric"
            style={[centeredInputStyle, isReadOnlyField && { opacity: 0.5 }]}
            placeholder="Örn: 70"
            editable={!isReadOnlyField}
          />
          {isReadOnlyField && (
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, marginLeft: 4 }}>
              Bu bilgi sadece ebeveynler tarafından değiştirilebilir
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <ModernInput
            label="Boy (cm) *"
            value={editMember.height ? String(editMember.height) : ""}
            onChangeText={t => {
              if (isReadOnlyField) return; // Üye kendi bilgilerini düzenliyorsa değiştirilemez
              const num = t.replace(/[^0-9.]/g, '');
              setEditMember({ ...editMember, height: num ? Number(num) : undefined });
            }}
            keyboardType="numeric"
            style={[centeredInputStyle, isReadOnlyField && { opacity: 0.5 }]}
            placeholder="Örn: 175"
            editable={!isReadOnlyField}
          />
          {isReadOnlyField && (
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, marginLeft: 4 }}>
              Bu bilgi sadece ebeveynler tarafından değiştirilebilir
            </Text>
          )}
        </View>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <ModernInput
            label="Tişört Bedeni"
            value={editMember.tshirt_size}
            onChangeText={t => setEditMember({ ...editMember, tshirt_size: t })}
            style={centeredInputStyle}
          />
        </View>
        <View style={{ flex: 1 }}>
          <ModernInput
            label="Ayakkabı No"
            value={editMember.shoe_size}
            onChangeText={t => setEditMember({ ...editMember, shoe_size: t })}
            keyboardType="numeric"
            style={centeredInputStyle}
          />
        </View>
      </View>

      {/* BMI GÖSTERİMİ */}
      {editMember.weight && editMember.height && bmi && bmiCategory && (
        <View style={{
          padding: 16,
          borderRadius: 16,
          marginTop: 12,
          backgroundColor: bmiCategory.color + "15",
          borderWidth: 1,
          borderColor: bmiCategory.color + "40",
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <View>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
                Vücut Kitle İndeksi (BMI)
              </Text>
              <Text style={{ fontSize: 24, fontWeight: "800", color: bmiCategory.color }}>
                {bmi}
              </Text>
            </View>
            <View style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: bmiCategory.color,
            }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                {bmiCategory.status}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
            {bmiCategory.advice}
          </Text>
        </View>
      )}

      {/* DİYET VE EGZERSİZ AÇMA/KAPAMA SWİTCH'LERİ */}
      {editMember.weight && editMember.height && bmi && bmiCategory && (
        <View style={{
          padding: 16,
          borderRadius: 16,
          marginTop: 12,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 16 }}>
            Diyet ve Egzersiz Ayarları
          </Text>
          
          {/* DİYET SWİTCH */}
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <Apple size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                  Diyet Programı
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginLeft: 26 }}>
                Diyet programı özelliklerini aktif/pasif yapın
              </Text>
            </View>
            <Switch
              value={mealPreferences.diet_enabled !== false}
              onValueChange={async (value) => {
                // Eğer kapatılıyorsa (false yapılıyorsa), onay iste
                if (!value) {
                  Alert.alert(
                    "Diyet Programını Kapat",
                    "Diyet programı özelliğini kapatmak istediğinizden emin misiniz? Aktif bir diyet programı varsa sonlandırılacaktır.",
                    [
                      {
                        text: "İptal",
                        style: "cancel",
                        onPress: () => {
                          // Switch'i geri al (değişiklik yapma)
                        },
                      },
                      {
                        text: "Kapat",
                        style: "destructive",
                        onPress: async () => {
                          const updatedPrefs = {
                            ...mealPreferences,
                            diet_enabled: false,
                          };
                          
                          // Eğer aktif diyet varsa, sonlandır
                          if (mealPreferences.diet_active) {
                            updatedPrefs.diet_active = false;
                            updatedPrefs.diet_start_date = "";
                          }
                          
                          setMealPreferences(updatedPrefs);
                          
                          // Veritabanına kaydet
                          try {
                            await updateMemberDetails(member.id, {
                              meal_preferences: updatedPrefs,
                            });
                            
                            // Üye bilgilerini yeniden yükle
                            const res = await getMemberById(member.id);
                            if (res.member) {
                              hydrateFromMember(res.member as FamilyMember);
                            }
                          } catch (error) {
                            Alert.alert("Hata", "Ayarlar kaydedilemedi.");
                            // Geri al
                            setMealPreferences({
                              ...mealPreferences,
                              diet_enabled: true,
                            });
                          }
                        },
                      },
                    ]
                  );
                  return;
                }
                
                // Açılıyorsa (true yapılıyorsa), direkt kaydet
                const updatedPrefs = {
                  ...mealPreferences,
                  diet_enabled: value,
                };
                
                setMealPreferences(updatedPrefs);
                
                // Veritabanına kaydet
                try {
                  await updateMemberDetails(member.id, {
                    meal_preferences: updatedPrefs,
                  });
                  
                  // Üye bilgilerini yeniden yükle
                  const res = await getMemberById(member.id);
                  if (res.member) {
                    hydrateFromMember(res.member as FamilyMember);
                  }
                } catch (error) {
                  Alert.alert("Hata", "Ayarlar kaydedilemedi.");
                  // Geri al
                  setMealPreferences({
                    ...mealPreferences,
                    diet_enabled: !value,
                  });
                }
              }}
              trackColor={{
                false: colors.border,
                true: colors.primary,
              }}
              thumbColor="#fff"
              ios_backgroundColor={colors.border}
            />
          </View>
          
          {/* EGZERSİZ SWİTCH */}
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <Activity size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                  Egzersiz Programı
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginLeft: 26 }}>
                Egzersiz programı özelliklerini aktif/pasif yapın
              </Text>
            </View>
            <Switch
              value={mealPreferences.exercise_enabled !== false}
              onValueChange={async (value) => {
                // Eğer kapatılıyorsa (false yapılıyorsa), onay iste
                if (!value) {
                  Alert.alert(
                    "Egzersiz Programını Kapat",
                    "Egzersiz programı özelliğini kapatmak istediğinizden emin misiniz?",
                    [
                      {
                        text: "İptal",
                        style: "cancel",
                        onPress: () => {
                          // Switch'i geri al (değişiklik yapma)
                        },
                      },
                      {
                        text: "Kapat",
                        style: "destructive",
                        onPress: async () => {
                          const updatedPrefs = {
                            ...mealPreferences,
                            exercise_enabled: false,
                          };
                          
                          setMealPreferences(updatedPrefs);
                          
                          // Veritabanına kaydet
                          try {
                            await updateMemberDetails(member.id, {
                              meal_preferences: updatedPrefs,
                            });
                            
                            // Üye bilgilerini yeniden yükle
                            const res = await getMemberById(member.id);
                            if (res.member) {
                              hydrateFromMember(res.member as FamilyMember);
                            }
                          } catch (error) {
                            Alert.alert("Hata", "Ayarlar kaydedilemedi.");
                            // Geri al
                            setMealPreferences({
                              ...mealPreferences,
                              exercise_enabled: true,
                            });
                          }
                        },
                      },
                    ]
                  );
                  return;
                }
                
                // Açılıyorsa (true yapılıyorsa), direkt kaydet
                const updatedPrefs = {
                  ...mealPreferences,
                  exercise_enabled: value,
                };
                
                setMealPreferences(updatedPrefs);
                
                // Veritabanına kaydet
                try {
                  await updateMemberDetails(member.id, {
                    meal_preferences: updatedPrefs,
                  });
                  
                  // Üye bilgilerini yeniden yükle
                  const res = await getMemberById(member.id);
                  if (res.member) {
                    hydrateFromMember(res.member as FamilyMember);
                  }
                } catch (error) {
                  Alert.alert("Hata", "Ayarlar kaydedilemedi.");
                  // Geri al
                  setMealPreferences({
                    ...mealPreferences,
                    exercise_enabled: !value,
                  });
                }
              }}
              trackColor={{
                false: colors.border,
                true: colors.primary,
              }}
              thumbColor="#fff"
              ios_backgroundColor={colors.border}
            />
          </View>

          {/* DİYET / EGZERSİZ PROGRAMI OLUŞTUR BUTONLARI */}
          {mealPreferences.diet_enabled !== false && (
            <TouchableOpacity
              onPress={() => setDietModalVisible(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: colors.primary + "20",
                marginBottom: 8,
              }}
            >
              <Apple size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>
                7 Günlük Diyet Programı Oluştur
              </Text>
            </TouchableOpacity>
          )}
          {mealPreferences.exercise_enabled !== false && (
            <TouchableOpacity
              onPress={() => setExerciseModalVisible(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: colors.primary + "20",
              }}
            >
              <Activity size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>
                Egzersiz Programı Oluştur
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* SAĞLIK VE GEÇMİŞ */}
      <SectionTitle icon={ShieldAlert} title="Sağlık ve Kritik Bilgiler" />
      <ModernInput
        label="Kan Grubu"
        value={editMember.blood_type}
        onChangeText={t => setEditMember({ ...editMember, blood_type: t })}
        style={centeredInputStyle}
      />
      <ModernInput
        label="Alerjiler"
        value={editMember.allergies}
        onChangeText={t => setEditMember({ ...editMember, allergies: t })}
        multiline
        style={centeredMultilineStyle}
      />
      <ModernInput
        label="Kullandığı İlaçlar"
        value={editMember.medications}
        onChangeText={t => setEditMember({ ...editMember, medications: t })}
        multiline
        style={centeredMultilineStyle}
      />
      <ModernInput
        label="Notlar"
        value={editMember.notes}
        onChangeText={t => setEditMember({ ...editMember, notes: t })}
        multiline
        style={centeredMultilineStyle}
      />

      {/* YEMEK TERCİHLERİ */}
      <SectionTitle icon={Utensils} title="Yemek Tercihleri" />
      <SelectionGroup
        label="Mutfak"
        options={[
          { label: "Dünya", value: "world" },
          { label: "Türk", value: "turkish" },
          { label: "Kürt", value: "kurdish" },
          { label: "Arap", value: "arab" },
          { label: "İtalyan", value: "italian" },
          { label: "Meksika", value: "mexican" },
          { label: "Asya", value: "asian" },
        ]}
        selectedValue={mealPreferences.cuisine}
        onSelect={(val: any) =>
          setMealPreferences(prev => ({ ...prev, cuisine: val }))
        }
      />
      <SelectionGroup
        label="Diyet tipi"
        options={[
          { label: "Standart", value: "standard" },
          { label: "Vejetaryen", value: "vegetarian" },
          { label: "Vegan", value: "vegan" },
          { label: "Keto", value: "keto" },
          { label: "Glutensiz", value: "gluten_free" },
        ]}
        selectedValue={mealPreferences.diet}
        onSelect={(val: any) =>
          setMealPreferences(prev => ({ ...prev, diet: val }))
        }
      />
      {mealPreferences.calories && (
        <View style={{
          padding: 12,
          borderRadius: 12,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
          marginTop: 8,
        }}>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
            Günlük Kalori Hedefi (AI tarafından hesaplandı)
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
            {mealPreferences.calories} kcal
          </Text>
        </View>
      )}
      <ModernInput
        label="Yemediği içerikler"
        value={mealPreferences.avoid}
        onChangeText={t => setMealPreferences(prev => ({ ...prev, avoid: t }))}
        placeholder="Örn: mantar, deniz ürünleri"
        style={centeredInputStyle}
      />
      <ModernInput
        label="Notlar / Özel istekler"
        value={mealPreferences.notes}
        onChangeText={t => {
          if (!canEditNotes) return; // Sadece yönetici veya kendi bilgilerini düzenliyorsa değiştirilebilir
          setMealPreferences(prev => ({ ...prev, notes: t }));
        }}
        multiline
        style={[centeredMultilineStyle, !canEditNotes && { opacity: 0.5 }]}
        editable={canEditNotes}
        placeholder={canEditNotes ? "Özel isteklerinizi yazın..." : "Bu alan sadece yöneticiler tarafından düzenlenebilir"}
      />

      {/* GENEL BİLGİLER */}
      <SectionTitle icon={GraduationCap} title="Genel ve Eğitim" />
      {editMember.role !== "member" ? (
        <SelectionGroup
          label="Bilgi tipi"
          options={[
            { label: "Okul", value: "school" },
            { label: "İş", value: "work" },
            { label: "İkisi de", value: "both" },
          ]}
          selectedValue={infoMode}
          onSelect={(val: any) => setInfoMode(val)}
        />
      ) : (
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          Çocuk profillerinde iş yeri bilgisi istenmez.
        </Text>
      )}
      {infoMode !== "work" && (
        <>
          <ModernInput
            label="Okul / Kurum"
            value={editMember.school_name}
            onChangeText={t => setEditMember({ ...editMember, school_name: t })}
            style={centeredInputStyle}
          />
          <ModernInput
            label="Sınıf"
            value={editMember.school_class}
            onChangeText={t => setEditMember({ ...editMember, school_class: t })}
            style={centeredInputStyle}
          />
          <ModernInput
            label="Okul No"
            value={editMember.school_no}
            onChangeText={t => setEditMember({ ...editMember, school_no: t })}
            style={centeredInputStyle}
          />
        </>
      )}
      {editMember.role !== "member" && infoMode !== "school" && (
        <>
          <ModernInput
            label="İş Yeri"
            value={editMember.workplace}
            onChangeText={t => setEditMember({ ...editMember, workplace: t })}
            style={centeredInputStyle}
          />
          <ModernInput
            label="Meslek"
            value={editMember.occupation}
            onChangeText={t => setEditMember({ ...editMember, occupation: t })}
            style={centeredInputStyle}
          />
        </>
      )}
      <ModernInput
        label="Telefon"
        value={editMember.phone}
        onChangeText={t => setEditMember({ ...editMember, phone: t })}
        keyboardType="phone-pad"
        style={centeredInputStyle}
      />

      {/* AKSİYON BUTONLARI */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Save size={20} color="#fff" />
          <Text style={styles.btnText}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#ef4444" }]}
          onPress={() => setQrVisible(true)}
        >
          <Share2 size={20} color="#fff" />
          <Text style={styles.btnText}>Acil Durum QR</Text>
        </TouchableOpacity>
      </View>

      {/* DİYET MODAL */}
      <Modal visible={dietModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.qrCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.qrTitle, { color: colors.text }]}>
              Diyet Programı Oluştur
            </Text>
            <Text style={[styles.qrDesc, { color: colors.textMuted, marginBottom: 20 }]}>
              BMI değerinize, alerji ve sağlık bilgilerinize göre kişiselleştirilmiş 7 günlük diyet programı hazırlanacaktır.
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
            
            <View style={{ gap: 12, width: "100%" }}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  if (!bmi || !editMember.weight || !editMember.height) return;
                  
                  // Yaş hesapla
                  const age = calculateAge(editMember.birth_date);
                  if (!age) {
                    Alert.alert(
                      "Eksik Bilgi",
                      "Diyet programı oluşturmak için doğum tarihi gereklidir. Lütfen doğum tarihini girin."
                    );
                    return;
                  }
                  
                  // 18 yaşından küçükler için ebeveyn onayı gerekli
                  if (age < 18 && !isAdmin) {
                    Alert.alert(
                      "Ebeveyn Onayı Gerekli",
                      "18 yaşından küçükler için diyet programı oluşturmak ebeveyn onayı gerektirir. Lütfen ailenizdeki yönetici (ebeveyn) ile iletişime geçin. Program ancak ebeveyn hesabıyla oluşturulabilir."
                    );
                    return;
                  }
                  
                  setDietLoading(true);
                  try {
                    // Başlangıç tarihi: Bugün
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    // Bir sonraki Pazartesi'yi bul (eğer bugün Pazartesi ise bir sonraki pazartesi)
                    const todayDay = today.getDay(); // 0 = Pazar, 1 = Pazartesi, ...
                    let nextMonday: Date;
                    
                    if (todayDay === 1) {
                      // Bugün Pazartesi ise, bir sonraki pazartesi (7 gün sonra)
                      nextMonday = addDays(today, 7);
                    } else {
                      // Bir sonraki Pazartesi'yi bul
                      const daysUntilMonday = (8 - todayDay) % 7 || 7;
                      nextMonday = startOfWeek(addDays(today, daysUntilMonday), { weekStartsOn: 1 });
                    }
                    
                    const startDateStr = format(today, "yyyy-MM-dd");
                    const endDateStr = format(nextMonday, "yyyy-MM-dd");
                    
                    const result = await generateDietPlan({
                      bmi,
                      weight: editMember.weight,
                      height: editMember.height,
                      age: age,
                      gender: editMember.gender,
                      currentDiet: mealPreferences.diet,
                      currentCuisine: mealPreferences.cuisine,
                      currentAvoid: mealPreferences.avoid,
                      allergies: editMember.allergies,
                      medications: editMember.medications,
                      notes: editMember.notes,
                      startDate: startDateStr,
                      endDate: endDateStr,
                      budgetPreference: budgetPreference,
                      difficultyPreference: difficultyPreference,
                    });
                    
                    if (result.error) {
                      Alert.alert("Hata", result.error);
                      setDietLoading(false);
                      return;
                    }
                    
                    if (!result.needsDiet) {
                      Alert.alert(
                        "Bilgi",
                        result.message || "BMI değeriniz sağlıklı aralıkta. Özel bir diyet programına gerek yok."
                      );
                      setDietModalVisible(false);
                      setDietLoading(false);
                      return;
                    }
                    
                    // Diyet planını kaydet ve onay ekranını göster
                    if (result.dietPlan) {
                      setDietPlan(result);
                      setDietModalVisible(false);
                      setDietPlanApprovalVisible(true);
                    }
                  } catch (error: any) {
                    Alert.alert("Hata", error.message || "Diyet programı oluşturulamadı.");
                  } finally {
                    setDietLoading(false);
                  }
                }}
                disabled={dietLoading}
              >
                {dietLoading ? (
                  <Text style={styles.btnText}>Hazırlanıyor...</Text>
                ) : (
                  <>
                    <Apple size={20} color="#fff" />
                    <Text style={styles.btnText}>7 Günlük Program Oluştur</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.border }]}
                onPress={() => {
                  setDietModalVisible(false);
                }}
                disabled={dietLoading}
              >
                <Text style={[styles.btnText, { color: colors.text }]}>İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DİYET PLANI ONAY MODAL */}
      <Modal visible={dietPlanApprovalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.qrCard, { backgroundColor: colors.card, maxHeight: "90%", width: "90%" }]}>
            <Text style={[styles.qrTitle, { color: colors.text, marginBottom: 16 }]}>
              7 Günlük Diyet Programı
            </Text>
            
            <ScrollView 
              style={{ maxHeight: "70%", width: "100%" }}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {dietPlan?.dietPlan && (
                <>
                  <View style={{ marginBottom: 16, padding: 12, backgroundColor: colors.background, borderRadius: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 8 }}>
                      Program Özeti
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
                      Hedef: {dietPlan.dietPlan.goal || "Sağlıklı beslenme"}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
                      Günlük Kalori: {dietPlan.dietPlan.daily_calories || "Hesaplanıyor"} kcal
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>
                      Diyet Tipi: {dietPlan.dietPlan.diet_type || "Standart"}
                    </Text>
                  </View>
                  
                  {dietPlan.dietPlan.daily_meal_plans && dietPlan.dietPlan.daily_meal_plans.length > 0 && (
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 12 }}>
                        Günlük Yemek Planı
                      </Text>
                      {dietPlan.dietPlan.daily_meal_plans.map((dayPlan: any, index: number) => (
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
                          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary, marginBottom: 8 }}>
                            {dayPlan.day || `Gün ${index + 1}`} ({dayPlan.date})
                          </Text>
                          {dayPlan.meals && dayPlan.meals.map((meal: any, mealIndex: number) => (
                            <View key={mealIndex} style={{ marginBottom: 8, paddingBottom: 8, borderBottomWidth: mealIndex < dayPlan.meals.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2, textTransform: "uppercase" }}>
                                    {meal.time} • {meal.type === "breakfast" ? "Kahvaltı" : meal.type === "lunch" ? "Öğle Yemeği" : meal.type === "dinner" ? "Akşam Yemeği" : "Atıştırmalık"}
                                  </Text>
                                  <Text style={{ fontSize: 13, color: colors.text, fontWeight: "600" }}>{meal.meal}</Text>
                                </View>
                                {meal.calories && (
                                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600", marginLeft: 8 }}>
                                    {meal.calories} kcal
                                  </Text>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>
                  )}
                  {/* Eski format desteği (backward compatibility) */}
                  {dietPlan.dietPlan.weekly_meal_suggestions && dietPlan.dietPlan.weekly_meal_suggestions.length > 0 && !dietPlan.dietPlan.daily_meal_plans && (
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 12 }}>
                        Haftalık Yemek Planı
                      </Text>
                      {dietPlan.dietPlan.weekly_meal_suggestions.map((day: any, index: number) => (
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
                          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary, marginBottom: 8 }}>
                            {day.day || `Gün ${index + 1}`}
                          </Text>
                          {day.breakfast && (
                            <View style={{ marginBottom: 6 }}>
                              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Kahvaltı:</Text>
                              <Text style={{ fontSize: 12, color: colors.text }}>{day.breakfast}</Text>
                            </View>
                          )}
                          {day.lunch && (
                            <View style={{ marginBottom: 6 }}>
                              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Öğle Yemeği:</Text>
                              <Text style={{ fontSize: 12, color: colors.text }}>{day.lunch}</Text>
                            </View>
                          )}
                          {day.dinner && (
                            <View style={{ marginBottom: 6 }}>
                              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Akşam Yemeği:</Text>
                              <Text style={{ fontSize: 12, color: colors.text }}>{day.dinner}</Text>
                            </View>
                          )}
                          {day.snacks && (
                            <View>
                              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Atıştırmalıklar:</Text>
                              <Text style={{ fontSize: 12, color: colors.text }}>{day.snacks}</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
            
            <View style={{ gap: 12, width: "100%", marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  if (!dietPlan?.updatedPreferences) return;
                  
                  // Diyet tipi güncelle
                  let newDiet = dietPlan.updatedPreferences.diet || mealPreferences.diet;
                  
                  // BMI'ye göre diyet tipini belirle
                  if (bmi && bmi < 18.5) {
                    newDiet = "standard";
                  } else if (bmi && bmi >= 25) {
                    if (mealPreferences.diet === "keto" || mealPreferences.diet === "low_carb") {
                      newDiet = mealPreferences.diet;
                    } else {
                      newDiet = "standard";
                    }
                  }
                  
                  // Kalori hedefi
                  const newCalories = dietPlan.updatedPreferences.calories || "";
                  
                  // Yemek tercihlerini güncelle ve diyet planını kaydet
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  // Diyet planını veritabanına kaydet
                  const startDateStr = format(today, "yyyy-MM-dd");
                  const nextMonday = startOfWeek(addDays(today, 7), { weekStartsOn: 1 });
                  const endDateStr = format(nextMonday, "yyyy-MM-dd");
                  
                  const saveResult = await saveDietPlan(
                    startDateStr,
                    endDateStr,
                    dietPlan.dietPlan,
                    dietPlan.dietPlan.goal,
                    dietPlan.dietPlan.daily_calories,
                    dietPlan.dietPlan.diet_type
                  );
                  
                  if (saveResult.error) {
                    Alert.alert("Hata", "Diyet programı kaydedilemedi: " + saveResult.error);
                    return;
                  }
                  
                  const updatedMealPreferences = {
                    ...mealPreferences,
                    diet: newDiet,
                    calories: newCalories,
                    cuisine: dietPlan.updatedPreferences?.cuisine || mealPreferences.cuisine,
                    avoid: dietPlan.updatedPreferences?.avoid || mealPreferences.avoid,
                    notes: mealPreferences.notes || "",
                    diet_start_date: today.toISOString(),
                    diet_active: true,
                    last_diet_plan_date: format(today, "yyyy-MM-dd"),
                  };
                  
                  setMealPreferences(updatedMealPreferences);
                  
                  // meal_preferences'ı da güncelle (diet_plan artık ayrı tabloda, ama backward compatibility için)
                  if (member?.id) {
                    try {
                      await updateMemberDetails(member.id, {
                        meal_preferences: updatedMealPreferences,
                      });
                    } catch (error: any) {
                      Alert.alert("Hata", "Tercihler kaydedilemedi: " + (error.message || "Bilinmeyen hata"));
                      return;
                    }
                  }
                  
                  setDietPlanApprovalVisible(false);
                  setDietPlan(null);
                  Alert.alert("Başarılı", "7 günlük diyet programınız kaydedildi.");
                }}
              >
                <Text style={styles.btnText}>Onayla ve Kaydet</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.border }]}
                onPress={() => {
                  setDietPlanApprovalVisible(false);
                  setDietPlan(null);
                }}
              >
                <Text style={[styles.btnText, { color: colors.text }]}>İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EGZERSİZ PLANI MODAL */}
      <Modal visible={exerciseModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.qrCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.qrTitle, { color: colors.text }]}>
              Egzersiz Planı Oluştur
            </Text>
            <Text style={[styles.qrDesc, { color: colors.textMuted, marginBottom: 20 }]}>
              Yaş, kilo, boy ve sağlık bilgilerinize göre kişiselleştirilmiş haftalık egzersiz programı hazırlanacaktır.
            </Text>
            
            {/* EKİPMAN VE FİTNESS SEVİYESİ SEÇİMLERİ */}
            <View style={{ gap: 16, width: "100%", marginBottom: 20 }}>
              {/* EKİPMAN TERCIHİ */}
              <View>
                <SelectionGroup
                  label="Ekipman Tercihi"
                  options={[
                    { label: "Evde Aletsiz", value: "home_no_equipment" },
                    { label: "Evde Aletli", value: "home_with_equipment" },
                    { label: "Spor Salonu", value: "gym" },
                  ]}
                  selectedValue={equipmentPreference}
                  onSelect={(val: any) => setEquipmentPreference(val)}
                />
              </View>
              
              {/* FİTNESS SEVİYESİ */}
              <View>
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
            </View>
            
            <View style={{ gap: 12, width: "100%" }}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  if (!editMember.weight || !editMember.height) return;
                  
                  // Yaş hesapla
                  const age = calculateAge(editMember.birth_date);
                  if (!age) {
                    Alert.alert(
                      "Eksik Bilgi",
                      "Egzersiz programı oluşturmak için doğum tarihi gereklidir. Lütfen doğum tarihini girin."
                    );
                    return;
                  }
                  
                  // 18 yaşından küçükler için ebeveyn onayı gerekli
                  if (age < 18 && !isAdmin) {
                    Alert.alert(
                      "Ebeveyn Onayı Gerekli",
                      "18 yaşından küçükler için egzersiz programı oluşturmak ebeveyn onayı gerektirir. Lütfen ailenizdeki yönetici (ebeveyn) ile iletişime geçin. Program ancak ebeveyn hesabıyla oluşturulabilir."
                    );
                    return;
                  }
                  
                  setExerciseLoading(true);
                  try {
                    // Bugünün gününü kontrol et
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const todayDay = today.getDay(); // 0 = Pazar, 1 = Pazartesi, ...
                    
                    // Diyet planı gibi: Eğer bugün pazartesi ise bugünden başla ve bir sonraki pazartesiye kadar, değilse bugünden başla ve bir sonraki pazartesiye kadar
                    let startDate: Date = today;
                    let endDate: Date;
                    
                    if (todayDay === 1) {
                      // Pazartesi ise, bugünden başla ve bir sonraki pazartesiye kadar (7 gün sonra)
                      endDate = addDays(today, 7);
                    } else {
                      // Pazartesi değilse, bugünden başla ve bir sonraki pazartesiye kadar (pazartesi dahil)
                      const daysUntilNextMonday = (8 - todayDay) % 7 || 7;
                      endDate = startOfWeek(addDays(today, daysUntilNextMonday), { weekStartsOn: 1 });
                    }
                    
                    const startDateStr = format(startDate, "yyyy-MM-dd");
                    const endDateStr = format(endDate, "yyyy-MM-dd");
                    const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    
                    // BMI hesapla (egzersiz planı için gerekli olabilir)
                    const heightInMeters = (editMember.height || 0) / 100;
                    const bmi = editMember.weight && heightInMeters > 0
                      ? (editMember.weight / (heightInMeters * heightInMeters))
                      : 0;
                    
                    // Egzersiz kalori hedefi hesapla (yaş, kilo, boy, cinsiyete göre)
                    // BMR (Bazal Metabolizma Hızı) hesaplama
                    let bmr = 0;
                    if (age && editMember.weight && editMember.height) {
                      if (editMember.gender === "male" || editMember.gender === "erkek") {
                        bmr = 10 * editMember.weight + 6.25 * editMember.height - 5 * age + 5;
                      } else {
                        bmr = 10 * editMember.weight + 6.25 * editMember.height - 5 * age - 161;
                      }
                    }
                    const tdee = bmr * 1.55; // Orta seviye aktivite
                    const exerciseCalorieTarget = Math.max(300, Math.min(600, Math.round(tdee * 0.22)));
                    
                    // Her gün için egzersiz planı oluştur
                    const exercisePlans: any[] = [];
                    const days = eachDayOfInterval({ start: startDate, end: endDate });
                    
                    for (const day of days) {
                      const dayStr = format(day, "yyyy-MM-dd");
                      
                      const result = await generateExercisePlan({
                        age: age,
                        weight: editMember.weight,
                        height: editMember.height,
                        gender: editMember.gender,
                        fitnessLevel: fitnessLevel,
                        equipmentType: equipmentPreference,
                        targetCalories: exerciseCalorieTarget,
                        availableTime: 45, // Varsayılan 45 dakika
                        language: "tr",
                        injuries: editMember.notes || undefined, // Kronik hastalıklar/notlar
                        preferences: editMember.allergies || undefined, // Alerjiler (egzersiz için değil ama genel sağlık bilgisi)
                      });
                      
                      if (result.error || !result.data) {
                        Alert.alert("Hata", `Egzersiz planı oluşturulamadı: ${result.error || "Bilinmeyen hata"}`);
                        setExerciseLoading(false);
                        return;
                      }
                      
                      // Planı veritabanına kaydet
                      const saveResult = await saveExercisePlan(
                        dayStr,
                        result.data,
                        equipmentPreference
                      );
                      
                      if (saveResult.error) {
                        // Hata sessizce yok sayılıyor
                      } else {
                        exercisePlans.push({
                          date: dayStr,
                          plan: result.data,
                        });
                      }
                    }
                    
                    if (exercisePlans.length === 0) {
                      Alert.alert("Hata", "Hiçbir egzersiz planı oluşturulamadı.");
                      setExerciseLoading(false);
                      return;
                    }
                    
                    // Planları onay için sakla
                    setExercisePlan({
                      plans: exercisePlans,
                      startDate: startDateStr,
                      endDate: endDateStr,
                      numDays: numDays,
                    });
                    
                    setExerciseModalVisible(false);
                    setExercisePlanApprovalVisible(true);
                  } catch (error: any) {
                    Alert.alert("Hata", error.message || "Egzersiz planı oluşturulamadı.");
                  } finally {
                    setExerciseLoading(false);
                  }
                }}
                disabled={exerciseLoading}
              >
                {exerciseLoading ? (
                  <Text style={styles.btnText}>Oluşturuluyor...</Text>
                ) : (
                  <Text style={styles.btnText}>Oluştur</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.border }]}
                onPress={() => setExerciseModalVisible(false)}
                disabled={exerciseLoading}
              >
                <Text style={[styles.btnText, { color: colors.text }]}>İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EGZERSİZ PLANI ONAY MODAL */}
      <Modal visible={exercisePlanApprovalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.qrCard, { backgroundColor: colors.card, maxHeight: "90%", width: "90%" }]}>
            <Text style={[styles.qrTitle, { color: colors.text, marginBottom: 16 }]}>
              {exercisePlan?.numDays || 7} Günlük Egzersiz Programı
            </Text>
            
            <ScrollView 
              style={{ maxHeight: "70%", width: "100%" }}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {exercisePlan?.plans && exercisePlan.plans.length > 0 && (
                <>
                  <View style={{ marginBottom: 16, padding: 12, backgroundColor: colors.background, borderRadius: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 8 }}>
                      Program Özeti
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
                      Başlangıç: {format(new Date(exercisePlan.startDate), "d MMMM yyyy", { locale: require("date-fns/locale/tr").tr })}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
                      Bitiş: {format(new Date(exercisePlan.endDate), "d MMMM yyyy", { locale: require("date-fns/locale/tr").tr })}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>
                      Toplam Gün: {exercisePlan.numDays}
                    </Text>
                  </View>
                  
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 12 }}>
                      Günlük Egzersiz Planı
                    </Text>
                    {exercisePlan.plans.map((dayPlan: any, index: number) => (
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
                        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary, marginBottom: 8 }}>
                          {format(new Date(dayPlan.date), "EEEE, d MMMM", { locale: tr })}
                        </Text>
                        {dayPlan.plan.exercises && dayPlan.plan.exercises.map((exercise: any, exerciseIndex: number) => (
                          <View key={exerciseIndex} style={{ marginBottom: 6 }}>
                            <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>
                              {exercise.name} ({exercise.duration} dk) - {exercise.calories} kcal
                            </Text>
                            {exercise.instructions && (
                              <Text style={{ fontSize: 10, color: colors.textMuted, fontStyle: "italic" }}>
                                {exercise.instructions}
                              </Text>
                            )}
                          </View>
                        ))}
                        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>
                            Toplam: {dayPlan.plan.total_duration} dk • {dayPlan.plan.total_calories} kcal
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
            
            <View style={{ gap: 12, width: "100%", marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  // Planlar zaten kaydedilmiş (generateExercisePlan içinde kaydedildi)
                  setExercisePlanApprovalVisible(false);
                  setExercisePlan(null);
                  Alert.alert("Başarılı", `${exercisePlan?.numDays || 7} günlük egzersiz programınız kaydedildi.`);
                }}
              >
                <Text style={styles.btnText}>Onayla</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.border }]}
                onPress={() => {
                  setExercisePlanApprovalVisible(false);
                  setExercisePlan(null);
                }}
              >
                <Text style={[styles.btnText, { color: colors.text }]}>İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DİYET YENİLEME MODAL (30 Gün Sonra) */}
      <Modal visible={dietRenewalModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.qrCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.qrTitle, { color: colors.text }]}>
              Diyet Programı Süresi Doldu
            </Text>
            <Text style={[styles.qrDesc, { color: colors.textMuted, marginBottom: 20, textAlign: "left" }]}>
              Bir aylık diyet programınız tamamlandı. Devam etmek istiyor musunuz?
            </Text>
            
            <View style={{ gap: 12, width: "100%" }}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  // Devam et - Yeni BMI hesaplaması yap ve tercihleri güncelle
                  if (!bmi || !editMember.weight || !editMember.height) {
                    setDietRenewalModalVisible(false);
                    return;
                  }
                  
                  // Yaş hesapla
                  const age = calculateAge(editMember.birth_date);
                  if (!age) {
                    Alert.alert(
                      "Eksik Bilgi",
                      "Diyet programı yenilemek için doğum tarihi gereklidir. Lütfen doğum tarihini girin."
                    );
                    setDietRenewalModalVisible(false);
                    return;
                  }
                  
                  setDietLoading(true);
                  try {
                    const result = await generateDietPlan({
                      bmi,
                      weight: editMember.weight,
                      height: editMember.height,
                      age: age,
                      gender: editMember.gender,
                      currentDiet: mealPreferences.diet,
                      currentCuisine: mealPreferences.cuisine,
                      currentAvoid: mealPreferences.avoid,
                      budgetPreference: budgetPreference,
                      difficultyPreference: difficultyPreference,
                    });
                    
                    if (result.error || !result.needsDiet) {
                      Alert.alert("Bilgi", result.message || "Diyet programı oluşturulamadı.");
                      setDietRenewalModalVisible(false);
                      setDietLoading(false);
                      return;
                    }
                    
                    if (result.updatedPreferences) {
                      let newDiet = result.updatedPreferences.diet || mealPreferences.diet;
                      if (bmi < 18.5) {
                        newDiet = "standard";
                      } else if (bmi >= 25) {
                        if (mealPreferences.diet === "keto" || mealPreferences.diet === "low_carb") {
                          newDiet = mealPreferences.diet;
                        } else {
                          newDiet = "standard";
                        }
                      }
                      
                      const newCalories = result.updatedPreferences.calories || "";
                      
                      // Notlar alanını AI'dan gelen notlarla değiştirme, sadece kullanıcı veya yönetici yazabilir
                      setMealPreferences(prev => ({
                        ...prev,
                        diet: newDiet,
                        calories: newCalories,
                        cuisine: result.updatedPreferences?.cuisine || prev.cuisine,
                        avoid: result.updatedPreferences?.avoid || prev.avoid,
                        // notes alanını koru, AI'dan gelen notları ekleme
                        notes: prev.notes || "",
                        diet_start_date: new Date().toISOString(), // Yeni başlangıç tarihi
                        diet_active: true, // Diyet aktif
                      }));
                      
                      Alert.alert(
                        "Başarılı",
                        "Diyet programınız yenilendi ve tercihleriniz güncellendi. Lütfen kaydedin."
                      );
                    }
                    
                    setDietRenewalModalVisible(false);
                  } catch (error: any) {
                    Alert.alert("Hata", error.message || "Diyet programı yenilenemedi.");
                  } finally {
                    setDietLoading(false);
                  }
                }}
                disabled={dietLoading}
              >
                {dietLoading ? (
                  <Text style={styles.btnText}>Yenileniyor...</Text>
                ) : (
                  <>
                    <Apple size={20} color="#fff" />
                    <Text style={styles.btnText}>Evet, Devam Et</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.border }]}
                onPress={() => {
                  // Diyeti durdur - diet_active'i false yap
                  setMealPreferences(prev => ({
                    ...prev,
                    diet_active: false,
                    diet_start_date: "",
                  }));
                  
                  Alert.alert(
                    "Diyet Durduruldu",
                    "Diyet programı durduruldu. Yemek tercihlerinizi manuel olarak düzenleyebilirsiniz."
                  );
                  
                  setDietRenewalModalVisible(false);
                }}
                disabled={dietLoading}
              >
                <Text style={[styles.btnText, { color: colors.text }]}>Hayır, Durdur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR MODAL */}
      <Modal visible={qrVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.qrCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.qrTitle, { color: colors.text }]}>
              Acil Durum Kartı
            </Text>
            <QRCode
              value={vCardData}
              size={200}
              backgroundColor="transparent"
              color={colors.text}
            />
            <Text style={[styles.qrDesc, { color: colors.textMuted }]}>
              Acil bir durumda bu kodu sağlık personeline taratabilirsiniz.
            </Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setQrVisible(false)}
            >
              <Text style={{ color: colors.primary, fontWeight: "bold" }}>
                Kapat
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ height: 100 }} />
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingVertical: 10,
    marginBottom: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: "900",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
    gap: 10,
  },
  helperText: { fontSize: 12, marginBottom: 10, marginLeft: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "800", textTransform: "uppercase" },
  row: { flexDirection: "row" },
  actions: { gap: 12, marginTop: 20 },
  btn: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  qrCard: { padding: 30, borderRadius: 30, alignItems: "center", width: "85%" },
  qrTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  qrDesc: { textAlign: "center", marginTop: 20, fontSize: 13 },
  closeBtn: { marginTop: 25, padding: 10 },
});
