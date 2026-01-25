import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { X, CheckCircle2 } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import ModernInput from "../ui/ModernInput";
import { supabase } from "../../services/supabase";
import { addTodoItem, updateTodoItem } from "../../services/todos";

type AddTodoModalProps = {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialTodo?: { id: string; title: string; due_date?: string | null } | null;
};

export default function AddTodoModal({
  visible,
  onClose,
  onSaved,
  initialTodo,
}: AddTodoModalProps) {
  const { colors } = useTheme();
  const { profile, user } = useAuth();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    const loadMembers = async () => {
      const familyId = profile?.family_id;
      if (!familyId || !user?.id) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("family_id", familyId);
      if (!mounted) return;
      setMembers(data || []);
      setAssignees(prev => (prev.length ? prev : [user.id]));
    };
    loadMembers();
    return () => {
      mounted = false;
    };
  }, [visible, profile?.family_id, user?.id]);

  useEffect(() => {
    if (!visible) return;
    if (initialTodo) {
      setTitle(initialTodo.title || "");
      setDueDate(initialTodo.due_date || "");
    } else {
      setTitle("");
      setDueDate("");
    }
  }, [visible, initialTodo]);

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert("Hata", "Başlık zorunludur.");
    if (!initialTodo && assignees.length === 0)
      return Alert.alert("Hata", "En az bir kişi seçmelisiniz.");
    setSaving(true);
    const res = initialTodo
      ? await updateTodoItem(initialTodo.id, {
          title: title.trim(),
          dueDate: dueDate || null,
        })
      : await addTodoItem({
          title: title.trim(),
          dueDate: dueDate || null,
          assigneeIds: assignees,
        });
    setSaving(false);
    if (res.success) {
      onSaved?.();
      onClose();
      setTitle("");
      setDueDate("");
    } else {
      Alert.alert("Hata", res.error || "To Do eklenemedi.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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
                  {initialTodo ? "To Do Düzenle" : "To Do Ekle"}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  {initialTodo ? "Başlık ve tarih güncelle" : "Kişisel yapılacak listesi"}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <X color={colors.text} size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <ModernInput
                label="Başlık"
                value={title}
                onChangeText={setTitle}
                placeholder="Örn: Ders notlarını çıkar"
              />
              <ModernInput
                label="Tarih (opsiyonel)"
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
              />
              {!initialTodo && (
                <View style={styles.assignWrap}>
                  <Text style={[styles.assignLabel, { color: colors.textMuted }]}>
                    Kime eklensin?
                  </Text>
                  <View style={styles.assignRow}>
                    {members.map(m => {
                      const selected = assignees.includes(m.id);
                      const label = m.id === user?.id ? "Ben" : m.full_name || "Üye";
                      return (
                        <TouchableOpacity
                          key={m.id}
                          onPress={() =>
                            setAssignees(prev =>
                              selected
                                ? prev.filter(id => id !== m.id)
                                : [...prev, m.id],
                            )
                          }
                          style={[
                            styles.assignChip,
                            {
                              backgroundColor: selected ? colors.primary : colors.card,
                              borderColor: selected ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.assignChipText,
                              { color: selected ? "#fff" : colors.text },
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={[styles.assignHint, { color: colors.textMuted }]}>
                    Ebeveyn seçilirse onay gerektirir.
                  </Text>
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
                <CheckCircle2 size={18} color="#fff" />
                <Text style={styles.actionBtnTextPrimary}>
                  {saving ? "Kaydediliyor..." : initialTodo ? "Güncelle" : "Kaydet"}
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
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  assignWrap: {
    marginTop: 6,
    marginBottom: 4,
  },
  assignLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
  },
  assignRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  assignChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  assignChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  assignHint: {
    marginTop: 6,
    fontSize: 11,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnPrimary: {
    borderWidth: 0,
  },
  actionBtnText: { fontWeight: "700" },
  actionBtnTextPrimary: { fontWeight: "700", color: "#fff" },
});
