import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Modal,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import {
  Lock,
  Wifi,
  Key,
  FileText,
  Eye,
  EyeOff,
  Trash2,
  X,
  ShieldCheck,
  ImageIcon,
  FileIcon,
  Plus,
  ChevronLeft,
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { getVaultItems, revealSecret, getFileUrl } from "../../services/vault";
import AddVaultItemModal from "../../components/modals/AddVaultItemModal";
import QRCode from "react-native-qrcode-svg";

export default function VaultScreen() {
  const { colors, themeMode } = useTheme();
  const isLight = themeMode === "light";
  const navigation = useNavigation<any>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [secretValue, setSecretValue] = useState("");
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [addVaultVisible, setAddVaultVisible] = useState(false);

  useEffect(() => {
    loadVault();
  }, []);

  const loadVault = async () => {
    const res = await getVaultItems();
    if (res.items) setItems(res.items);
  };

  const handlePreview = async (item: any) => {
    if (item.type === "file" && item.file_path) {
      const res = await getFileUrl(item.file_path);
      if (res.url) {
        setPreviewData({
          url: res.url,
          type: item.mime_type,
          title: item.title,
        });
        setIsPreviewOpen(true);
      }
    }
  };

  const handleReveal = async (id: string) => {
    if (revealedId === id) {
      setRevealedId(null);
      setSecretValue("");
      return;
    }
    const res = await revealSecret(id);
    if (res.secret) {
      setSecretValue(res.secret);
      setRevealedId(id);
    }
  };

  const getVaultIcon = (item: any) => {
    if (item.type === "file") {
      if (item.mime_type?.startsWith("image/")) {
        return <ImageIcon size={22} color={colors.primary} />;
      }
      return <FileIcon size={22} color={colors.primary} />;
    }
    const title = (item.title || "").toLowerCase();
    if (title.includes("wifi") || title.includes("wi-fi")) {
      return <Wifi size={22} color={colors.primary} />;
    }
    if (title.includes("şifre") || title.includes("password")) {
      return <Key size={22} color={colors.primary} />;
    }
    return <Lock size={22} color={colors.primary} />;
  };

    return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.screenHeader}>
        <View style={styles.headerRow}>
        <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { borderColor: colors.border }]}
        >
            <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
          <View>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Kasa</Text>
            <Text style={[styles.screenSub, { color: colors.textMuted }]}>
              Şifreli ve güvenli aile verileri
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={items}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              isLight && styles.surfaceLift,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.cardMain}>
              <TouchableOpacity
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: colors.primary + "12",
                    borderColor: colors.primary + "30",
                  },
                ]}
                onPress={() => item.type === "file" && handlePreview(item)}
              >
                {getVaultIcon(item)}
              </TouchableOpacity>
              <View style={styles.details}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {item.title}
                </Text>
                {item.type === "file" ? (
                  <TouchableOpacity
                    onPress={() => handlePreview(item)}
                    style={[
                      styles.linkPill,
                      { backgroundColor: colors.primary + "18" },
                    ]}
                  >
                    <Eye size={14} color={colors.primary} />
                    <Text style={[styles.linkText, { color: colors.primary }]}>
                      Görüntüle
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.secret, { color: colors.textMuted }]}>
                    {revealedId === item.id ? secretValue : "••••••••••••"}
                </Text>
                )}
              </View>
              {item.type === "text" && (
                <TouchableOpacity onPress={() => handleReveal(item.id)}>
                  <Eye size={22} color={colors.primary} />
                </TouchableOpacity>
            )}
            </View>
          </View>
        )}
      />
      <TouchableOpacity
        style={[styles.floatingAddButton, { backgroundColor: colors.primary }]}
        onPress={() => setAddVaultVisible(true)}
      >
        <Plus size={24} color="#fff" strokeWidth={3} />
      </TouchableOpacity>

      <AddVaultItemModal
        visible={addVaultVisible}
        onClose={() => setAddVaultVisible(false)}
        onSaved={() => loadVault()}
      />

      {/* Preview Modal */}
      <Modal visible={isPreviewOpen} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsPreviewOpen(false)}>
              <X size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {previewData?.title}
            </Text>
            <View style={{ width: 28 }} />
    </View>
          {previewData?.type?.startsWith("image/") ? (
            <Image
              source={{ uri: previewData.url }}
              style={{ flex: 1 }}
              resizeMode="contain"
            />
          ) : (
            <WebView
              source={{
                uri:
                  Platform.OS === "android"
                    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
                        previewData?.url || ""
                      )}`
                    : previewData?.url || "",
              }}
              style={{ flex: 1 }}
              startInLoadingState
              originWhitelist={["*"]}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenHeader: { paddingHorizontal: 20, paddingVertical: 15 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  screenTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  screenSub: { fontSize: 14, marginTop: 0, fontWeight: "500" },
  card: {
    padding: 16,
    marginBottom: 15,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardMain: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 55,
    height: 55,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  details: { flex: 1, marginLeft: 15 },
  title: { fontSize: 17, fontWeight: "700" },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
  },
  linkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  secret: { fontSize: 14, marginTop: 4, fontFamily: "monospace" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    alignItems: "center",
  },
  floatingAddButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4A90E2", // brandColors.primary
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  surfaceLift: {
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});
