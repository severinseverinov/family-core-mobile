import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "../../contexts/ThemeContext";
import ModernInput from "../../components/ui/ModernInput";
import { updateMemberDetails, FamilyMember } from "../../services/family";
import {
  ShieldAlert,
  Save,
  Share2,
  Activity,
  GraduationCap,
  Syringe,
} from "lucide-react-native";
import SelectionGroup from "../../components/ui/SelectionGroup";

export default function MemberDetailScreen({ route, navigation }: any) {
  const { member }: { member: FamilyMember } = route.params;
  const { colors } = useTheme();
  const [editMember, setEditMember] = useState<FamilyMember>(member);
  const [qrVisible, setQrVisible] = useState(false);

  const handleSave = async () => {
    const res = await updateMemberDetails(member.id, editMember);
    if (res.success) {
      Alert.alert("Başarılı", "Bilgiler güncellendi.");
      navigation.goBack();
    }
  };

  const vCardData = `BEGIN:VCARD
  VERSION:3.0
  FN:ACIL - ${editMember.full_name}
  TEL;TYPE=CELL:${editMember.phone || ""}
  NOTE:Kan Grubu: ${editMember.blood_type || "Bilinmiyor"}\\
  nAlerjiler: ${editMember.allergies || "Yok"}\\
  nKronik: ${editMember.chronic_diseases || "Yok"}
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* GENEL BİLGİLER */}
      <SectionTitle icon={GraduationCap} title="Genel ve Eğitim" />
      <ModernInput
        label="Okul / Kurum"
        value={editMember.school}
        onChangeText={t => setEditMember({ ...editMember, school: t })}
      />
      <ModernInput
        label="Telefon"
        value={editMember.phone}
        onChangeText={t => setEditMember({ ...editMember, phone: t })}
        keyboardType="phone-pad"
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
            label="Boy (cm)"
            value={editMember.height}
            onChangeText={t => setEditMember({ ...editMember, height: t })}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <ModernInput
            label="Kilo (kg)"
            value={editMember.weight}
            onChangeText={t => setEditMember({ ...editMember, weight: t })}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* SAĞLIK VE GEÇMİŞ */}
      <SectionTitle icon={ShieldAlert} title="Sağlık ve Kritik Bilgiler" />
      <ModernInput
        label="Kan Grubu"
        value={editMember.blood_type}
        onChangeText={t => setEditMember({ ...editMember, blood_type: t })}
      />
      <ModernInput
        label="Alerjiler"
        value={editMember.allergies}
        onChangeText={t => setEditMember({ ...editMember, allergies: t })}
        multiline
      />
      <ModernInput
        label="Kronik Hastalıklar"
        value={editMember.chronic_diseases}
        onChangeText={t =>
          setEditMember({ ...editMember, chronic_diseases: t })
        }
        multiline
      />
      <ModernInput
        label="Geçirilmiş Ameliyatlar"
        value={editMember.surgeries}
        onChangeText={t => setEditMember({ ...editMember, surgeries: t })}
        multiline
      />

      {/* AŞI VE GEÇMİŞ HASTALIKLAR */}
      <SectionTitle icon={Syringe} title="Aşı ve Tıbbi Geçmiş" />
      <ModernInput
        label="Aşı Bilgileri"
        value={editMember.vaccinations}
        onChangeText={t => setEditMember({ ...editMember, vaccinations: t })}
        multiline
      />
      <ModernInput
        label="Geçirilmiş Hastalıklar"
        value={editMember.past_illnesses}
        onChangeText={t => setEditMember({ ...editMember, past_illnesses: t })}
        multiline
      />

      {/* AKSİYON BUTONLARI */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Save size={20} color="#fff" />
          <Text style={styles.btnText}>Kaydet</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
    gap: 10,
  },
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
