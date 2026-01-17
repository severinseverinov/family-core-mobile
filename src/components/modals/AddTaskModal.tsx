import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Bell, CheckCircle2, X } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import ModernInput from "../ui/ModernInput";
import { createEvent } from "../../services/events";

type AddTaskModalProps = {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export default function AddTaskModal({
  visible,
  onClose,
  onSaved,
}: AddTaskModalProps) {
  const { colors } = useTheme();
  const [type, setType] = useState<"event" | "task">("event");
  const [title, setTitle] = useState("");
  const [privacy, setPrivacy] = useState<"family" | "member" | "parents">(
    "family"
  );
  const [points, setPoints] = useState("0");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title) return Alert.alert("Hata", "Başlık zorunludur.");
    setSaving(true);
    const res = await createEvent(
      title,
      new Date().toISOString(),
      undefined,
      type
    );
    setSaving(false);
    if (res.success) {
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
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.modalOverlay}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Hatırlatma / Görev
                </Text>
                <Text
                  style={[styles.modalSubtitle, { color: colors.textMuted }]}
                >
                  Ailen için planla
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <X color={colors.text} size={22} />
              </TouchableOpacity>
            </View>

            <View style={[styles.tabRow, { borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setType("event")}
                style={[
                  styles.tab,
                  type === "event" && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: type === "event" ? "#fff" : colors.text },
                  ]}
                >
                  Hatırlatma
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setType("task")}
                style={[
                  styles.tab,
                  type === "task" && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: type === "task" ? "#fff" : colors.text },
                  ]}
                >
                  Görev
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formHeader}>
                <View
                  style={[styles.iconCircle, { backgroundColor: "#e2e8f0" }]}
                >
                  {type === "event" ? (
                    <Bell size={18} color={colors.primary} />
                  ) : (
                    <CheckCircle2 size={18} color={colors.primary} />
                  )}
                </View>
                <Text style={[styles.formTitle, { color: colors.text }]}>
                  {type === "event" ? "Hatırlatma Bilgisi" : "Görev Bilgisi"}
                </Text>
              </View>

              <ModernInput
                label="Başlık"
                value={title}
                onChangeText={setTitle}
                placeholder={
                  type === "event" ? "Örn: Diş Randevusu" : "Örn: Odanı Topla"
                }
              />

              {type === "task" ? (
                <View style={styles.card}>
                  <ModernInput
                    label="Puan Değeri"
                    value={points}
                    onChangeText={setPoints}
                    keyboardType="numeric"
                  />
                  <View style={styles.switchRow}>
                    <Text style={{ color: colors.text }}>
                      Ebeveyn Onayı Gereksin
                    </Text>
                    <Switch
                      value={requiresApproval}
                      onValueChange={setRequiresApproval}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.card}>
                  <Text style={{ color: colors.text, marginBottom: 10 }}>
                    Görünürlük
                  </Text>
                  <View style={styles.privacyRow}>
                    {["family", "parents", "member"].map((p: any) => (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setPrivacy(p)}
                        style={[
                          styles.pBtn,
                          privacy === p && {
                            borderColor: colors.primary,
                            borderWidth: 2,
                          },
                        ]}
                      >
                        <Text style={{ color: colors.text }}>
                          {p === "member" ? "Kişisel" : p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.border }]}
                onPress={onClose}
                disabled={saving}
              >
                <Text style={[styles.actionBtnText, { color: colors.text }]}>
                  Vazgeç
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.actionBtnPrimary,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.actionBtnTextPrimary}>
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </Text>
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
    flexGrow: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  modalSubtitle: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  tabRow: {
    flexDirection: "row",
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  tab: { flex: 1, padding: 12, alignItems: "center" },
  tabText: { fontWeight: "700" },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  formTitle: { fontSize: 15, fontWeight: "700" },
  card: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  privacyRow: { flexDirection: "row", gap: 10 },
  pBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 12 },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnPrimary: { borderWidth: 0 },
  actionBtnText: { fontWeight: "700" },
  actionBtnTextPrimary: { color: "#fff", fontWeight: "700" },
});
