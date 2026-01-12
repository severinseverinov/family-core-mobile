import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { createPet } from "../../services/pets";

export default function AddPetScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const handleAddPet = async () => {
    const res = await createPet({
      name,
      type,
      imageUri: imageUri || undefined,
    });
    if (res.data && !res.error) {
      navigation.goBack();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>
      <Text style={{ color: colors.text }}>Dostumuzun Adı</Text>
      <TextInput
        style={{ backgroundColor: colors.card, padding: 10, borderRadius: 8 }}
        value={name}
        onChangeText={setName}
      />
      {/* Diğer alanlar ve resim seçici... */}
      <TouchableOpacity
        onPress={handleAddPet}
        style={{
          backgroundColor: colors.primary,
          padding: 15,
          borderRadius: 10,
          marginTop: 20,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center" }}>
          Dostumuzu Ekle
        </Text>
      </TouchableOpacity>
    </View>
  );
}
