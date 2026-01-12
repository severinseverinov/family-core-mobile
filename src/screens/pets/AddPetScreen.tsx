import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../contexts/ThemeContext";
import { createPet } from "../../services/pets";

export default function AddPetScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    // createPet(petData: { name, type, color?, gender?, imageUri? })
    const res = await createPet({ name, type, imageUri });

    if (res.error) Alert.alert("Hata", res.error);
    else navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        ) : (
          <Text>Fotoğraf Ekle</Text>
        )}
      </TouchableOpacity>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card }]}
        placeholder="İsim"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.card }]}
        placeholder="Tür (Kedi, Köpek vb.)"
        value={type}
        onChangeText={setType}
      />
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
        <Text style={styles.btnText}>Dostumuzu Kaydet</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: { padding: 12, borderRadius: 8, marginBottom: 15 },
  imagePicker: {
    height: 150,
    width: 150,
    borderRadius: 75,
    alignSelf: "center",
    marginBottom: 20,
    justifyContent: "center",
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 1,
  },
  preview: { width: 150, height: 150, borderRadius: 75 },
  btn: { padding: 15, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "bold" },
});
