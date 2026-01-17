import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { X, Lock, ImageIcon, FileIcon, UploadCloud } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { addVaultItem } from "../../services/vault";

type AddVaultItemModalProps = {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export default function AddVaultItemModal({
  visible,
  onClose,
  onSaved,
}: AddVaultItemModalProps) {
  const { colors, themeMode } = useTheme();
  const isLight = themeMode === "light";
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [visibility, setVisibility] = useState("parents");
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name?: string;
    mimeType?: string;
    size?: number;
  } | null>(null);

  const resetForm = () => {
    setTitle("");
    setValue("");
    setSelectedFile(null);
  };

  const handleClose = () => {
    if (!saving) resetForm();
    onClose();
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Hata", "Galeri izni gerekli.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.fileName || `image-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        size: asset.fileSize,
      });
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.length) {
      const file = result.assets[0];
      setSelectedFile({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType || "application/octet-stream",
        size: file.size,
      });
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Hata", "Başlık gerekli.");
      return;
    }
    if (!selectedFile && !value.trim()) {
      Alert.alert("Hata", "Gizli veri veya dosya gerekli.");
      return;
    }
    const isFile = Boolean(selectedFile);
    const filePayload = selectedFile
      ? {
          uri: selectedFile.uri,
          name: selectedFile.name,
          mimeType: selectedFile.mimeType,
        }
      : undefined;
    setSaving(true);
    const res = await addVaultItem({
      title: title.trim(),
      category: "password",
      type: isFile ? "file" : "text",
      visibility,
      value: isFile ? undefined : value.trim(),
      file: isFile ? filePayload : undefined,
    });
    setSaving(false);

    if (res.success) {
      resetForm();
      onSaved?.();
      onClose();
    } else {
      Alert.alert("Hata", res.error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.modalOverlay}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.modalCard,
              isLight && styles.surfaceLift,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.headerLeft}>
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <Lock size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Güvenli Kayıt Ekle
                  </Text>
                  <Text
                    style={[styles.modalSubtitle, { color: colors.textMuted }]}
                  >
                    Aile kasasına şifreli veri ekleyin
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose}>
                <X color={colors.text} size={22} />
              </TouchableOpacity>
            </View>

            <View style={styles.formCard}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                BAŞLIK
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Örn: Wi‑Fi Şifresi"
                  placeholderTextColor={colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                GİZLİ VERİ
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Parola / PIN / Not"
                  placeholderTextColor={colors.textMuted}
                  value={value}
                  onChangeText={setValue}
                  secureTextEntry
                />
              </View>

              <View style={styles.dividerRow}>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: colors.border },
                  ]}
                />
                <Text style={[styles.dividerText, { color: colors.textMuted }]}>
                  veya dosya ekle
                </Text>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: colors.border },
                  ]}
                />
              </View>
              <View style={styles.fileRow}>
                <TouchableOpacity
                  style={[
                    styles.fileButton,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={pickImage}
                >
                  <ImageIcon size={16} color={colors.textMuted} />
                  <Text style={[styles.fileButtonText, { color: colors.text }]}>
                    Resim Seç
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.fileButton,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={pickFile}
                >
                  <UploadCloud size={16} color={colors.textMuted} />
                  <Text style={[styles.fileButtonText, { color: colors.text }]}>
                    Dosya Seç
                  </Text>
                </TouchableOpacity>
              </View>
              {selectedFile ? (
                <View
                  style={[
                    styles.filePreview,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {selectedFile.mimeType?.startsWith("image/") ? (
                    <Image
                      source={{ uri: selectedFile.uri }}
                      style={styles.thumb}
                    />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <FileIcon size={18} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.fileMeta}>
                    <Text style={[styles.fileName, { color: colors.text }]}>
                      {selectedFile.name || "Dosya"}
                    </Text>
                    <Text style={[styles.fileSub, { color: colors.textMuted }]}>
                      {selectedFile.mimeType || "Dosya"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedFile(null)}>
                    <X size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.border }]}
                onPress={handleClose}
              >
                <Text style={[styles.actionText, { color: colors.text }]}>
                  Vazgeç
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.actionBtnPrimary,
                  {
                    backgroundColor: colors.primary,
                    opacity: saving ? 0.7 : 1,
                  },
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionTextPrimary}>Güvenli Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 0,
    alignItems: "stretch",
    flexGrow: 1,
  },
  modalCard: {
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    width: "100%",
    alignSelf: "stretch",
    marginHorizontal: 0,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  modalSubtitle: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  formCard: {
    borderRadius: 20,
    padding: 12,
    gap: 10,
    width: "100%",
    alignSelf: "stretch",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  inputWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
    width: "100%",
  },
  input: {
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },
  dividerText: { fontSize: 11, fontWeight: "600" },
  fileRow: { flexDirection: "row", gap: 10 },
  fileButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  fileButtonText: { fontWeight: "700", fontSize: 12 },
  filePreview: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  thumb: { width: 44, height: 44, borderRadius: 10 },
  thumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fileMeta: { flex: 1 },
  fileName: { fontSize: 13, fontWeight: "700" },
  fileSub: { fontSize: 11, marginTop: 2 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnPrimary: { borderWidth: 0 },
  actionText: { fontWeight: "700" },
  actionTextPrimary: { color: "#fff", fontWeight: "700" },
  surfaceLift: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
});
