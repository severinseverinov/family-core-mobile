import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import ModernInput from "../../components/ui/ModernInput";
import { createEvent } from "../../services/events";

export default function AddTaskScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [type, setType] = useState<"event" | "task">("event");
  const [title, setTitle] = useState("");
  const [privacy, setPrivacy] = useState<"family" | "member" | "parents">(
    "family"
  );
  const [points, setPoints] = useState("0");
  const [requiresApproval, setRequiresApproval] = useState(false);

  const handleSave = async () => {
    if (!title) return Alert.alert("Hata", "Başlık zorunludur.");

    // events.ts -> createEvent(title, start_date, end_date, type)
    const res = await createEvent(
      title,
      new Date().toISOString(),
      undefined,
      type
    );

    if (res.success) navigation.goBack();
    else Alert.alert("Hata", res.error);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.tabRow}>
        <TouchableOpacity
          onPress={() => setType("event")}
          style={[
            styles.tab,
            type === "event" && { backgroundColor: colors.primary },
          ]}
        >
          <Text style={{ color: type === "event" ? "#fff" : colors.text }}>
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
          <Text style={{ color: type === "task" ? "#fff" : colors.text }}>
            Görev
          </Text>
        </TouchableOpacity>
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
            <Text style={{ color: colors.text }}>Ebeveyn Onayı Gereksin</Text>
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

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
        <Text style={styles.saveBtnText}>Kaydet</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  tabRow: {
    flexDirection: "row",
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  tab: { flex: 1, padding: 12, alignItems: "center" },
  card: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: "rgba(0,0,0,0.02)",
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
  saveBtn: { padding: 16, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "bold" },
});
