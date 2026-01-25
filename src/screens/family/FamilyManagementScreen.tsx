import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import HeartbeatLoader from "../../components/ui/HeartbeatLoader";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  UserPlus,
  Shield,
  Heart,
  Droplet,
  ChevronRight,
  X,
  Trash2,
  Settings,
  Landmark, // İkon eklendi
  PieChart, // İkon eklendi
  ChevronLeft,
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import ModernInput from "../../components/ui/ModernInput";
import {
  getFamilyMembers,
  getFamilyDetails,
  createInvitation,
  removeMember,
  updateFamilySettings,
  updateMemberDetails,
  FamilyMember,
} from "../../services/family";
import * as ImagePicker from "expo-image-picker";

export default function FamilyManagementScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { profile: myProfile } = useAuth();
  const queryClient = useQueryClient();

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [family, setFamily] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingFamily, setSavingFamily] = useState(false);
  const [familyNameDraft, setFamilyNameDraft] = useState("");
  const [familyAvatarDraftUri, setFamilyAvatarDraftUri] = useState<
    string | null
  >(null);

  // Davet & Modal State'leri
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedMemberDetail, setSelectedMemberDetail] =
    useState<FamilyMember | null>(null);

  const isAdmin = ["owner", "admin"].includes(myProfile?.role || "");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [membersRes, familyRes] = await Promise.all([
      getFamilyMembers(),
      getFamilyDetails(),
    ]);
    setMembers(membersRes.members as any);
    setFamily(familyRes.family);
    setFamilyNameDraft(familyRes.family?.name || "");
    setLoading(false);
  };

  const handlePickFamilyAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Hata", "Galeri izni gerekli.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setFamilyAvatarDraftUri(result.assets[0].uri);
    }
  };

  const handleSaveFamily = async () => {
    if (!family?.id) return;
    setSavingFamily(true);
    const res = await updateFamilySettings({
      familyId: family.id,
      name: familyNameDraft,
      avatarUri: familyAvatarDraftUri,
    });
    setSavingFamily(false);
    if (res.success) {
      Alert.alert("Başarılı", "Aile ayarları güncellendi.");
      setFamilyAvatarDraftUri(null);
      // Refresh dashboard widgets (FamilyWidget uses dashboard query cache)
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      loadData();
    } else {
      Alert.alert("Hata", res.error || "Ayarlar güncellenemedi.");
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.includes("@"))
      return Alert.alert("Hata", "Geçerli e-posta girin.");
    const res = await createInvitation(inviteEmail, "member");
    if (res.success) {
      Alert.alert("Başarılı", `Davet kodu: ${res.token}`);
      setInviteEmail("");
      setIsInviteModalOpen(false);
    } else {
      Alert.alert("Hata", res.error);
    }
  };

  const handleRemove = (member: FamilyMember) => {
    if (member.id === myProfile?.id) return;
    Alert.alert("Üyeyi Çıkar", "Emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Çıkar",
        style: "destructive",
        onPress: async () => {
          const res = await removeMember(member.id);
          if (res.success) {
            loadData();
            setSelectedMemberDetail(null);
          } else Alert.alert("Hata", res.error);
        },
      },
    ]);
  };

  const handleToggleRole = (member: FamilyMember) => {
    const nextRole = member.role === "admin" ? "member" : "admin";
    const actionLabel = nextRole === "admin" ? "Yönetici Yap" : "Yöneticiliği Kaldır";
    Alert.alert(
      "Rolü Güncelle",
      `${member.full_name} için rolü "${nextRole === "admin" ? "Yönetici" : "Üye"}" olarak güncellemek istiyor musun?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: actionLabel,
          onPress: async () => {
            const res = await updateMemberDetails(member.id, { role: nextRole });
            if (res.success) {
              setSelectedMemberDetail(prev =>
                prev ? { ...prev, role: nextRole } : prev
              );
              loadData();
              Alert.alert("Başarılı", "Rol güncellendi.");
            } else {
              Alert.alert("Hata", res.error || "Rol güncellenemedi.");
            }
          },
        },
      ]
    );
  };


  // HEADER KISMI (ListHeaderComponent olarak kullanılacak)
  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* AİLE AYARLARI */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
        AİLE AYARLARI
      </Text>
      <View
        style={[
          styles.familyCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.familyTopRow}>
          <View
            style={[styles.familyAvatarCircle, { borderColor: colors.border }]}
          >
            <Image
              source={{
                uri:
                  familyAvatarDraftUri ||
                  family?.image_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    family?.name || "Family"
                  )}&background=0f172a&color=ffffff&size=256&format=png&bold=true`,
              }}
              style={styles.familyAvatar}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ModernInput
              label="Aile adı"
              value={familyNameDraft}
              onChangeText={setFamilyNameDraft}
              placeholder="Örn: Yılmaz Ailesi"
              editable={isAdmin}
            />
            <View style={styles.familyActionsRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  { borderColor: colors.border, opacity: isAdmin ? 1 : 0.5 },
                ]}
                onPress={handlePickFamilyAvatar}
                disabled={!isAdmin}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                  Avatar Seç
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primarySmallBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: isAdmin ? 1 : 0.5,
                  },
                ]}
                onPress={handleSaveFamily}
                disabled={!isAdmin || savingFamily}
              >
                {savingFamily ? (
                  <HeartbeatLoader size={20} variant="inline" />
                ) : (
                  <Text style={styles.primarySmallBtnText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
            {!isAdmin ? (
              <Text style={[styles.helperText, { color: colors.textMuted }]}>
                Aile ayarlarını sadece yönetici değiştirebilir.
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Liste Başlığı */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
        AİLE ÜYELERİ ({members.length})
      </Text>
    </View>
  );

  const renderMember = ({ item }: { item: FamilyMember }) => (
    <View
      style={[
        styles.memberCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
        onPress={() => setSelectedMemberDetail(item)}
    >
      <Image
        source={{
          uri:
            item.avatar_url ||
            `https://api.dicebear.com/7.x/avataaars/png?seed=${item.id}`,
        }}
        style={styles.avatar}
      />
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: colors.text }]}>
          {item.full_name}
        </Text>
        <View style={styles.roleTag}>
          <Shield
            size={12}
            color={item.role === "owner" ? "#f59e0b" : colors.primary}
          />
          <Text
            style={[
              styles.roleText,
              { color: item.role === "owner" ? "#f59e0b" : colors.primary },
            ]}
          >
            {item.role === "owner"
              ? "Aile Reisi"
              : item.role === "admin"
              ? "Yönetici"
              : "Üye"}
          </Text>
        </View>
      </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate("MemberDetail", { member: item })}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
      <ChevronRight size={20} color={colors.textMuted} />
    </TouchableOpacity>
    </View>
  );

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <HeartbeatLoader size={56} variant="full" />
      </View>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { borderColor: colors.border }]}
          >
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            {family?.name || "Ailem"}
          </Text>
          <Text style={[styles.subTitle, { color: colors.textMuted }]}>
              Aileyi Yönet
          </Text>
          </View>
        </View>
        {isAdmin && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setIsInviteModalOpen(true)}
          >
            <UserPlus size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader} // Header buraya eklendi
      />

      {/* DAVET MODALI */}
      <Modal visible={isInviteModalOpen} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.modalOverlay}
            keyboardShouldPersistTaps="handled"
          >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Yeni Üye Davet Et
              </Text>
              <TouchableOpacity onPress={() => setIsInviteModalOpen(false)}>
                <X color={colors.text} />
              </TouchableOpacity>
            </View>
            <ModernInput
              label="E-posta Adresi"
              placeholder="user@example.com"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={handleInvite}
            >
              <Text style={styles.btnText}>Davet Gönder</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ÜYE DETAY MODALI */}
      <Modal visible={!!selectedMemberDetail} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModal, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.closeDetail}
              onPress={() => setSelectedMemberDetail(null)}
            >
              <X color={colors.text} />
            </TouchableOpacity>

            <Image
              source={{
                uri:
                  selectedMemberDetail?.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/png?seed=${selectedMemberDetail?.id}`,
              }}
              style={styles.largeAvatar}
            />
            <Text style={[styles.detailName, { color: colors.text }]}>
              {selectedMemberDetail?.full_name}
            </Text>
            <Text style={[styles.detailEmail, { color: colors.textMuted }]}>
              {selectedMemberDetail?.email}
            </Text>

            <View style={styles.healthInfoRow}>
              <View
                style={[
                  styles.healthBox,
                  { backgroundColor: colors.background },
                ]}
              >
                <Droplet size={20} color="#ef4444" />
                <Text style={[styles.healthLabel, { color: colors.textMuted }]}>
                  Kan Grubu
                </Text>
                <Text style={[styles.healthValue, { color: colors.text }]}>
                  {selectedMemberDetail?.blood_type || "--"}
                </Text>
              </View>
              <View
                style={[
                  styles.healthBox,
                  { backgroundColor: colors.background },
                ]}
              >
                <Heart size={20} color="#ec4899" />
                <Text style={[styles.healthLabel, { color: colors.textMuted }]}>
                  Alerjiler
                </Text>
                <Text
                  style={[styles.healthValue, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {selectedMemberDetail?.allergies || "Yok"}
                </Text>
              </View>
            </View>

            {isAdmin &&
              selectedMemberDetail?.id !== myProfile?.id &&
              selectedMemberDetail?.role !== "owner" && (
                <>
                  <TouchableOpacity
                    style={styles.roleBtn}
                    onPress={() => handleToggleRole(selectedMemberDetail!)}
                  >
                    <Shield size={20} color="#2563eb" />
                    <Text style={styles.roleBtnText}>
                      {selectedMemberDetail?.role === "admin"
                        ? "Yöneticiliği Kaldır"
                        : "Yönetici Yap"}
                    </Text>
                  </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeBtn}
                    onPress={() => handleRemove(selectedMemberDetail!)}
                >
                  <Trash2 size={20} color="#ef4444" />
                  <Text style={styles.removeBtnText}>Aileden Çıkar</Text>
                </TouchableOpacity>
                </>
              )}
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
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  subTitle: { fontSize: 14, fontWeight: "600", marginTop: 0 },
  addBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },

  // YENİ STİLLER (Header ve Finans Kartı)
  listHeader: { marginBottom: 10 },
  familyCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  familyTopRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  familyAvatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  familyAvatar: { width: "100%", height: "100%" },
  familyActionsRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { fontWeight: "700" },
  primarySmallBtn: {
    width: 110,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primarySmallBtnText: { color: "#fff", fontWeight: "800" },
  helperText: { fontSize: 12, marginTop: 6 },
  financeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderRadius: 24,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  financeContent: { flexDirection: "row", alignItems: "center" },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  financeTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  financeSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: 1,
  },

  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  memberInfo: { flex: 1, marginLeft: 15 },
  memberName: { fontSize: 17, fontWeight: "700" },
  roleTag: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  roleText: { fontSize: 12, fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
    flexGrow: 1,
  },
  modalContent: { padding: 25, borderRadius: 30 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  primaryBtn: {
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  detailModal: { padding: 30, borderRadius: 35, alignItems: "center" },
  closeDetail: { position: "absolute", top: 20, right: 20 },
  largeAvatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 15 },
  detailName: { fontSize: 22, fontWeight: "800" },
  detailEmail: { fontSize: 14, marginBottom: 25 },
  healthInfoRow: { flexDirection: "row", gap: 15, marginBottom: 30 },
  healthBox: { flex: 1, padding: 15, borderRadius: 20, alignItems: "center" },
  healthLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
    textTransform: "uppercase",
  },
  healthValue: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  roleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    marginBottom: 6,
  },
  roleBtnText: { color: "#2563eb", fontWeight: "bold" },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  removeBtnText: { color: "#ef4444", fontWeight: "bold" },
});
