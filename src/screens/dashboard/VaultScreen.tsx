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
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { getVaultItems, revealSecret, getFileUrl } from "../../services/vault";
import QRCode from "react-native-qrcode-svg";

export default function VaultScreen() {
  const { colors } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [secretValue, setSecretValue] = useState("");
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.screenHeader}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Kasa</Text>
        <Text style={[styles.screenSub, { color: colors.textMuted }]}>
          Şifreli ve güvenli aile verileri
        </Text>
      </View>

      <FlatList
        data={items}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.cardMain}>
              <TouchableOpacity
                style={styles.iconBox}
                onPress={() => item.type === "file" && handlePreview(item)}
              >
                {/* İkon belirleme mantığı */}
              </TouchableOpacity>
              <View style={styles.details}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {item.title}
                </Text>
                {item.type === "file" ? (
                  <TouchableOpacity onPress={() => handlePreview(item)}>
                    <Text style={[styles.linkText, { color: colors.primary }]}>
                      Dosyayı Görüntüle
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
  screenHeader: { padding: 24, paddingBottom: 10 },
  screenTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  screenSub: { fontSize: 14, marginTop: 4, fontWeight: "500" },
  card: {
    padding: 16,
    marginBottom: 15,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#4A90E2",
  },
  cardMain: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 55,
    height: 55,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  details: { flex: 1, marginLeft: 15 },
  title: { fontSize: 17, fontWeight: "700" },
  linkText: {
    fontSize: 15,
    fontWeight: "bold",
    textDecorationLine: "underline",
    marginTop: 5,
  },
  secret: { fontSize: 14, marginTop: 4, fontFamily: "monospace" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    alignItems: "center",
  },
});
