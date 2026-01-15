import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Modal,
  ActivityIndicator,
} from "react-native";
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
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import ModernInput from "../../components/ui/ModernInput";
import {
  getFamilyMembers,
  getFamilyDetails,
  createInvitation,
  removeMember,
  FamilyMember,
} from "../../services/family";

export default function FamilyManagementScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { profile: myProfile } = useAuth();

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [family, setFamily] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Davet & Modal State'leri
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(
    null
  );

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
    setLoading(false);
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
            setSelectedMember(null);
          } else Alert.alert("Hata", res.error);
        },
      },
    ]);
  };

  // HEADER KISMI (ListHeaderComponent olarak kullanılacak)
  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* YENİ EKLENEN FİNANS MERKEZİ BUTONU */}

      {/* Liste Başlığı */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
        AİLE ÜYELERİ ({members.length})
      </Text>
    </View>
  );

  const renderMember = ({ item }: { item: FamilyMember }) => (
    <TouchableOpacity
      style={[
        styles.memberCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() => setSelectedMember(item)}
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
      <ChevronRight size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  if (loading)
    return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            {family?.name || "Ailem"}
          </Text>
          <Text style={[styles.subTitle, { color: colors.textMuted }]}>
            Yönetim Paneli
          </Text>
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
      <Modal visible={isInviteModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>

      {/* ÜYE DETAY MODALI */}
      <Modal visible={!!selectedMember} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModal, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.closeDetail}
              onPress={() => setSelectedMember(null)}
            >
              <X color={colors.text} />
            </TouchableOpacity>

            <Image
              source={{
                uri:
                  selectedMember?.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/png?seed=${selectedMember?.id}`,
              }}
              style={styles.largeAvatar}
            />
            <Text style={[styles.detailName, { color: colors.text }]}>
              {selectedMember?.full_name}
            </Text>
            <Text style={[styles.detailEmail, { color: colors.textMuted }]}>
              {selectedMember?.email}
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
                  {selectedMember?.blood_type || "--"}
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
                  {selectedMember?.allergies || "Yok"}
                </Text>
              </View>
            </View>

            {isAdmin &&
              selectedMember?.id !== myProfile?.id &&
              selectedMember?.role !== "owner" && (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(selectedMember!)}
                >
                  <Trash2 size={20} color="#ef4444" />
                  <Text style={styles.removeBtnText}>Aileden Çıkar</Text>
                </TouchableOpacity>
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: 25,
  },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  subTitle: { fontSize: 14, fontWeight: "600", marginTop: 2 },
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
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  removeBtnText: { color: "#ef4444", fontWeight: "bold" },
});
