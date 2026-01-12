import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { addVaultItem } from "../../services/vault";

export default function AddVaultItemScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [visibility, setVisibility] = useState("parents");

  const handleSave = async () => {
    // addVaultItem(itemData: { title, category, type, visibility, value?, file?, assignedTo? })
    const res = await addVaultItem({
      title,
      category: "password",
      type: "text",
      visibility,
      value,
    });

    if (res.success) navigation.goBack();
    else Alert.alert("Hata", res.error);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card }]}
        placeholder="Başlık (örn: Wi-Fi Şifresi)"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.card }]}
        placeholder="Gizli Veri"
        value={value}
        onChangeText={setValue}
        secureTextEntry
      />
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
        <Text style={styles.btnText}>Güvenli Kaydet</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: { padding: 12, borderRadius: 8, marginBottom: 15 },
  btn: { padding: 15, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "bold" },
});
