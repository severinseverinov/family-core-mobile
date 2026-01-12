import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { createEvent } from "../../services/events";

export default function AddTaskScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date());
  const [type, setType] = useState("event"); //

  const handleSave = async () => {
    const res = await createEvent(title, date.toISOString(), undefined, type);
    if (res.success) navigation.goBack();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.label, { color: colors.text }]}>Görev Başlığı</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            color: colors.text,
            borderColor: colors.border,
          },
        ]}
        value={title}
        onChangeText={setTitle}
        placeholder="Örn: Market alışverişi"
      />
      {/* Tarih ve Saat Seçici Buraya Gelecek */}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
        <Text style={styles.btnText}>Kaydet</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  saveBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
