import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
} from "react-native";
import {
  Lock,
  Settings,
  Users,
  ChevronRight,
  ShieldCheck,
  Palette,
  Languages,
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useDashboardData } from "../../hooks/useDashboardData";

export default function ProfileHubScreen({ navigation }: any) {
  const { colors, themeMode, toggleTheme } = useTheme();
  const { profile } = useAuth();
  const { data } = useDashboardData();

  // Avatar Seçim Mantığı
  const getAvatarUri = () => {
    if (profile?.avatar_url) return profile.avatar_url;
    const gender = profile?.gender || "other";
    if (gender === "female")
      return "https://api.dicebear.com/7.x/avataaars/png?seed=Aneka&gender=female";
    if (gender === "male")
      return "https://api.dicebear.com/7.x/avataaars/png?seed=Felix&gender=male";
    return "https://api.dicebear.com/7.x/avataaars/png?seed=Coco";
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* ÜST PROFİL BÖLÜMÜ */}
        <View style={styles.profileHeader}>
          <Image
            source={{ uri: getAvatarUri() }}
            style={[styles.mainAvatar, { borderColor: colors.primary }]}
          />
          <Text style={[styles.userName, { color: colors.text }]}>
            {profile?.full_name || "Kullanıcı"}
          </Text>
          <Text style={[styles.userSub, { color: colors.textMuted }]}>
            {profile?.role === "owner" ? "Aile Reisi" : "Aile Üyesi"}
          </Text>
        </View>

        {/* İKİYE BÖLÜNMÜŞ ANA PANEL (Hub Yapısı) */}
        <View style={styles.hubGrid}>
          {/* Sol: Kasa Bölümü */}
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
            <Text style={[styles.hubDesc, { color: colors.textMuted }]}>
              Şifreler & Belgeler
            </Text>
          </TouchableOpacity>

          {/* Sağ: Ayarlar Bölümü */}
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
            <Text style={[styles.hubDesc, { color: colors.textMuted }]}>
              Dil, Tema & Para
            </Text>
          </TouchableOpacity>
        </View>

        {/* ALT BÖLÜM: HIZLI AYARLAR VE AİLE */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            HIZLI ERİŞİM
          </Text>
          <View style={[styles.listCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.listItem} onPress={toggleTheme}>
              <Palette size={20} color={colors.primary} />
              <Text style={[styles.listText, { color: colors.text }]}>
                Temayı Değiştir ({themeMode})
              </Text>
              <ChevronRight size={18} color={colors.border} />
            </TouchableOpacity>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <TouchableOpacity style={styles.listItem}>
              <Users size={20} color={colors.primary} />
              <Text style={[styles.listText, { color: colors.text }]}>
                Aile Üyelerini Yönet
              </Text>
              <ChevronRight size={18} color={colors.border} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  profileHeader: { alignItems: "center", marginVertical: 30 },
  mainAvatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4 },
  userName: { fontSize: 24, fontWeight: "900", marginTop: 15 },
  userSub: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  hubGrid: { flexDirection: "row", gap: 15, marginBottom: 30 },
  hubCard: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    alignItems: "center",
    elevation: 2,
    shadowOpacity: 0.05,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  hubTitle: { fontSize: 16, fontWeight: "bold" },
  hubDesc: { fontSize: 12, marginTop: 4 },
  section: { marginTop: 10 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 10,
    marginBottom: 8,
  },
  listCard: { borderRadius: 20, overflow: "hidden" },
  listItem: { flexDirection: "row", alignItems: "center", padding: 16 },
  listText: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: "600" },
  divider: { height: 1, width: "100%", opacity: 0.5 },
});
