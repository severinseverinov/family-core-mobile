import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "../../contexts/ThemeContext";
import ModernInput from "../../components/ui/ModernInput";
import {
  updateMemberDetails,
  FamilyMember,
  getMemberById,
} from "../../services/family";
import {
  ShieldAlert,
  Save,
  Share2,
  Activity,
  GraduationCap,
  Utensils,
  ChevronLeft,
} from "lucide-react-native";
import SelectionGroup from "../../components/ui/SelectionGroup";
import { useFocusEffect } from "@react-navigation/native";

export default function MemberDetailScreen({ route, navigation }: any) {
  const { member }: { member: FamilyMember } = route.params;
  const { colors } = useTheme();
  const [editMember, setEditMember] = useState<FamilyMember>(member);
  const [qrVisible, setQrVisible] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const [mealPreferences, setMealPreferences] = useState({
    cuisine: member?.meal_preferences?.cuisine || "world",
    calories: member?.meal_preferences?.calories || "",
    avoid: member?.meal_preferences?.avoid || "",
    diet: member?.meal_preferences?.diet || "standard",
    notes: member?.meal_preferences?.notes || "",
  });

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
      });
    },
    [resolveInfoMode]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        const res = await getMemberById(member.id);
        if (active && res.member) hydrateFromMember(res.member as FamilyMember);
      };
      load();
      return () => {
        active = false;
      };
    }, [member.id, hydrateFromMember])
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
      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <ModernInput
            label="Kilo (kg) *"
            value={editMember.weight ? String(editMember.weight) : ""}
            onChangeText={t => {
              const num = t.replace(/[^0-9.]/g, '');
              setEditMember({ ...editMember, weight: num ? Number(num) : undefined });
            }}
            keyboardType="numeric"
            style={centeredInputStyle}
            placeholder="Örn: 70"
          />
        </View>
        <View style={{ flex: 1 }}>
          <ModernInput
            label="Boy (cm) *"
            value={editMember.height ? String(editMember.height) : ""}
            onChangeText={t => {
              const num = t.replace(/[^0-9.]/g, '');
              setEditMember({ ...editMember, height: num ? Number(num) : undefined });
            }}
            keyboardType="numeric"
            style={centeredInputStyle}
            placeholder="Örn: 175"
          />
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
      <ModernInput
        label="Kalori hedefi"
        value={mealPreferences.calories}
        onChangeText={t =>
          setMealPreferences(prev => ({ ...prev, calories: t }))
        }
        keyboardType="numeric"
        style={centeredInputStyle}
      />
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
        onChangeText={t => setMealPreferences(prev => ({ ...prev, notes: t }))}
        multiline
        style={centeredMultilineStyle}
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
