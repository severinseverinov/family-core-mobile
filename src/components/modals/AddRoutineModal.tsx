import React, { useMemo, useState } from "react";
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
import { Calendar, Clock, X } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import ModernInput from "../ui/ModernInput";
import SelectionGroup from "../ui/SelectionGroup";
import { addDailyRoutine } from "../../services/routines";

type AddRoutineModalProps = {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const DAYS = [
  { label: "Pzt", value: "Mon" },
  { label: "Sal", value: "Tue" },
  { label: "Çar", value: "Wed" },
  { label: "Per", value: "Thu" },
  { label: "Cum", value: "Fri" },
  { label: "Cmt", value: "Sat" },
  { label: "Paz", value: "Sun" },
];

export default function AddRoutineModal({
  visible,
  onClose,
  onSaved,
}: AddRoutineModalProps) {
  const { colors } = useTheme();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"routine" | "work" | "school">("routine");
  const [recurrenceType, setRecurrenceType] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const [shiftType, setShiftType] = useState<"morning" | "evening" | "night">(
    "morning",
  );
  const [visibilityScope, setVisibilityScope] = useState<
    "family" | "spouse"
  >("family");
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [dayOfMonths, setDayOfMonths] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const dayLabel = useMemo(() => {
    if (recurrenceType === "daily") return "Günlük";
    if (recurrenceType === "weekly") return "Haftalık";
    return "Aylık";
  }, [recurrenceType]);

  const toggleDay = (value: string) => {
    setDaysOfWeek(prev =>
      prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value],
    );
  };

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert("Hata", "Başlık zorunludur.");
    if (recurrenceType === "weekly" && daysOfWeek.length === 0) {
      return Alert.alert("Hata", "Haftalık için gün seçin.");
    }
    if (recurrenceType === "monthly") {
      const parsed = dayOfMonths
        .split(",")
        .map(v => Number(v.trim()))
        .filter(v => Number.isFinite(v));
      const valid = parsed.filter(v => v >= 1 && v <= 31);
      if (valid.length === 0) {
        return Alert.alert("Hata", "Aylık için 1-31 arası günleri girin.");
      }
    }

    setSaving(true);
    const res = await addDailyRoutine({
      title: title.trim(),
      kind,
      shiftType,
      visibilityScope,
      recurrenceType,
      daysOfWeek: recurrenceType === "weekly" ? daysOfWeek : [],
      dayOfMonths:
        recurrenceType === "monthly"
          ? dayOfMonths
              .split(",")
              .map(v => Number(v.trim()))
              .filter(v => Number.isFinite(v))
              .filter(v => v >= 1 && v <= 31)
          : [],
      startDate: startDate || null,
      endDate: endDate || null,
      startTime: startTime || null,
      endTime: endTime || null,
      notes: notes || null,
    });
    setSaving(false);

    if (res.success) {
      onSaved?.();
      onClose();
    } else {
      Alert.alert("Hata", res.error || "Rutin eklenemedi.");
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
                  Rutin / Program
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Günlük, haftalık veya aylık planla
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
                placeholder="Örn: Sabah çalışma, Okul programı"
              />

              <SelectionGroup
                label="Tür"
                options={[
                  { label: "Rutin", value: "routine" },
                  { label: "Çalışma", value: "work" },
                  { label: "Okul", value: "school" },
                ]}
                selectedValue={kind}
                onSelect={setKind as any}
              />

              <SelectionGroup
                label="Tekrar"
                options={[
                  { label: "Günlük", value: "daily" },
                  { label: "Haftalık", value: "weekly" },
                  { label: "Aylık", value: "monthly" },
                ]}
                selectedValue={recurrenceType}
                onSelect={setRecurrenceType as any}
              />

              <SelectionGroup
                label="Nöbet Tipi"
                options={[
                  { label: "Sabah", value: "morning" },
                  { label: "Akşam", value: "evening" },
                  { label: "Gece", value: "night" },
                ]}
                selectedValue={shiftType}
                onSelect={setShiftType as any}
              />

              <SelectionGroup
                label="Görünürlük"
                options={[
                  { label: "Aile", value: "family" },
                  { label: "Eşe özel", value: "spouse" },
                ]}
                selectedValue={visibilityScope}
                onSelect={setVisibilityScope as any}
              />

              {recurrenceType === "weekly" && (
                <View style={styles.daysWrap}>
                  <Text style={[styles.daysLabel, { color: colors.textMuted }]}>
                    Gün Seç
                  </Text>
                  <View style={styles.daysRow}>
                    {DAYS.map(day => {
                      const active = daysOfWeek.includes(day.value);
                      return (
                        <TouchableOpacity
                          key={day.value}
                          onPress={() => toggleDay(day.value)}
                          style={[
                            styles.dayChip,
                            {
                              backgroundColor: active ? colors.primary : colors.card,
                              borderColor: active ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayChipText,
                              { color: active ? "#fff" : colors.text },
                            ]}
                          >
                            {day.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {recurrenceType === "monthly" && (
                <ModernInput
                  label="Ayın günleri (1-31)"
                  value={dayOfMonths}
                  onChangeText={setDayOfMonths}
                  placeholder="Örn: 1, 5, 12, 24"
                />
              )}

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <ModernInput
                    label="Başlangıç tarihi"
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ModernInput
                    label="Bitiş tarihi (ops.)"
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <ModernInput
                    label="Başlangıç saati"
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="HH:MM"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ModernInput
                    label="Bitiş saati"
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="HH:MM"
                  />
                </View>
              </View>

              <ModernInput
                label="Notlar"
                value={notes}
                onChangeText={setNotes}
                placeholder="Opsiyonel"
                multiline
              />
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
  row: {
    flexDirection: "row",
    gap: 10,
  },
  daysWrap: {
    marginBottom: 16,
  },
  daysLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
  },
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  actionBtnPrimary: {
    borderWidth: 0,
  },
  actionBtnText: { fontWeight: "700" },
  actionBtnTextPrimary: { fontWeight: "700", color: "#fff" },
});
