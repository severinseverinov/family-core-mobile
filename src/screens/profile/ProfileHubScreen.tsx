import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Modal,
} from "react-native";
import {
  Lock,
  Settings,
  Users,
  ChevronRight,
  ShieldAlert,
  X,
  Share2,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg"; //
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

export default function ProfileHubScreen({ navigation }: any) {
  const { colors, themeMode, toggleTheme } = useTheme();
  const { profile } = useAuth();
  const [qrVisible, setQrVisible] = useState(false);

  // vCard formatında Acil Durum Bilgileri
  const vCardData = `BEGIN:VCARD
VERSION:3.0
FN:ACIL - ${profile?.full_name || "Kullanıcı"}
TEL;TYPE=CELL:${profile?.phone || ""}
NOTE:Kan Grubu: ${profile?.blood_type || "Bilinmiyor"}\\nAlerjiler: ${
    profile?.allergies || "Yok"
  }\\nKronik: ${profile?.chronic_diseases || "Yok"}
END:VCARD`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* ÜST PROFİL BÖLÜMÜ */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri:
                  profile?.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/png?seed=${profile?.id}`,
              }}
              style={[styles.mainAvatar, { borderColor: colors.primary }]}
            />
            {/* HIZLI QR BUTONU */}
            <TouchableOpacity
              style={[styles.qrShortcut, { backgroundColor: colors.primary }]}
              onPress={() => setQrVisible(true)}
            >
              <ShieldAlert size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.userName, { color: colors.text }]}>
            {profile?.full_name}
          </Text>
        </View>

        {/* HUB GRID (Kasa & Ayarlar) */}
        <View style={styles.hubGrid}>
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate("Vault")}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <Lock size={28} color={colors.primary} />
            </View>
            <Text style={[styles.hubTitle, { color: colors.text }]}>
              Aile Kasası
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate("Settings")}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#10b98120" }]}>
              <Settings size={28} color="#10b981" />
            </View>
            <Text style={[styles.hubTitle, { color: colors.text }]}>
              Ayarlar
            </Text>
          </TouchableOpacity>
        </View>

        {/* DİĞER LİSTE ÖĞELERİ */}
        <View style={[styles.listCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate("FamilyManagement")}
          >
            <Users size={20} color={colors.primary} />
            <Text style={[styles.listText, { color: colors.text }]}>
              Aile Üyelerini Yönet
            </Text>
            <ChevronRight size={18} color={colors.border} />
          </TouchableOpacity>
        </View>

        {/* ACİL DURUM QR MODAL */}
        <Modal visible={qrVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.qrModal, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Acil Durum Kartı
                </Text>
                <TouchableOpacity onPress={() => setQrVisible(false)}>
                  <X color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.qrContainer}>
                <QRCode
                  value={vCardData}
                  size={220}
                  backgroundColor="white"
                  color="black"
                />
              </View>

              <Text style={[styles.qrInfo, { color: colors.text }]}>
                {profile?.full_name}
              </Text>
              <Text style={[styles.qrDesc, { color: colors.textMuted }]}>
                Acil bir durumda bu kod taranarak kan grubunuza, alerjilerinize
                ve iletişim bilgilerinize ulaşılabilir.
              </Text>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  profileHeader: { alignItems: "center", marginVertical: 30 },
  avatarContainer: { position: "relative" },
  mainAvatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4 },
  qrShortcut: {
    position: "absolute",
    bottom: 0,
    right: 5,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  userName: { fontSize: 24, fontWeight: "900", marginTop: 15 },
  hubGrid: { flexDirection: "row", gap: 15, marginBottom: 20 },
  hubCard: { flex: 1, padding: 20, borderRadius: 24, alignItems: "center" },
  iconCircle: {
    width: 55,
    height: 55,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  hubTitle: { fontSize: 15, fontWeight: "bold" },
  listCard: { borderRadius: 20, overflow: "hidden" },
  listItem: { flexDirection: "row", alignItems: "center", padding: 18 },
  listText: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: "600" },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrModal: {
    width: "100%",
    borderRadius: 35,
    padding: 30,
    alignItems: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 25,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  qrContainer: { padding: 15, backgroundColor: "#fff", borderRadius: 20 },
  qrInfo: { fontSize: 18, fontWeight: "bold", marginTop: 20 },
  qrDesc: { textAlign: "center", marginTop: 10, fontSize: 14, lineHeight: 20 },
  shareBtn: {
    flexDirection: "row",
    marginTop: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    gap: 10,
    alignItems: "center",
  },
  shareBtnText: { color: "#fff", fontWeight: "bold" },
});
