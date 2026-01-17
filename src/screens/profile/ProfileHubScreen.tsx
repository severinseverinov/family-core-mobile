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
  ShieldAlert,
  X,
  Landmark, // Finans ikonu
  ChevronRight,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

export default function ProfileHubScreen({ navigation }: any) {
  const { colors, themeMode } = useTheme();
  const isLight = themeMode === "light";
  const { profile } = useAuth();
  const [qrVisible, setQrVisible] = useState(false);

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
            <TouchableOpacity
              style={[
                styles.qrShortcut,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.background,
                },
              ]}
              onPress={() => setQrVisible(true)}
            >
              <ShieldAlert size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.userName, { color: colors.text }]}>
            {profile?.full_name}
          </Text>
        </View>

        {/* HUB GRID (Kasa, Ayarlar ve Finans) */}
        <View style={styles.hubGrid}>
          {/* AİLE KASASI */}
          <TouchableOpacity
            style={[
              styles.hubCard,
              isLight && styles.surfaceLift,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
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

          {/* AYARLAR */}
          <TouchableOpacity
            style={[
              styles.hubCard,
              isLight && styles.surfaceLift,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
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

        {/* YENİ: AİLE FİNANS MERKEZİ (Buraya Taşındı) */}
        <View
          style={[
            styles.listCard,
            isLight && styles.surfaceLift,
            { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 },
          ]}
        >
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate("FamilyFinance")}
          >
            <View
              style={[styles.iconCircleSmall, { backgroundColor: "#f59e0b20" }]}
            >
              <Landmark size={24} color="#f59e0b" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.listText, { color: colors.text }]}>
                Aile Finans Merkezi
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                Bütçe, Raporlar ve Kumbara
              </Text>
            </View>
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
  container: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 30 },
  profileHeader: { alignItems: "center", marginVertical: 20 },
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
  hubGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  hubCard: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 0,
  },
  iconCircle: {
    width: 55,
    height: 55,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  iconCircleSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  hubTitle: { fontSize: 15, fontWeight: "bold" },
  listCard: { borderRadius: 24, overflow: "hidden", borderWidth: 0 },
  listItem: { flexDirection: "row", alignItems: "center", padding: 18 },
  listText: { fontSize: 16, fontWeight: "700" },
  surfaceLift: {
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

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
});
