import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { addVaultItem } from "../../services/vault";

export default function AddVaultItemScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [visibility, setVisibility] = useState("parents"); //

  const handleAdd = async () => {
    const res = await addVaultItem({
      title,
      category: "password",
      type: "text",
      visibility,
      value,
    });
    if (res.success) navigation.goBack();
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput placeholder="Başlık" value={title} onChangeText={setTitle} />
      <TextInput
        placeholder="Şifre/Veri"
        value={value}
        onChangeText={setValue}
        secureTextEntry
      />
      {/* Görünürlük Seçici (Parents, Family, Member) */}
      <TouchableOpacity
        onPress={handleAdd}
        style={{ backgroundColor: colors.primary }}
      >
        <Text>Şifrele ve Kaydet</Text>
      </TouchableOpacity>
    </View>
  );
}
