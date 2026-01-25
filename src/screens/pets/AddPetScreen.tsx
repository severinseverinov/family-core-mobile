import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import HeartbeatLoader from "../../components/ui/HeartbeatLoader";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Camera, ChevronLeft, Save, PawPrint } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import ModernInput from "../../components/ui/ModernInput";
import SelectionGroup from "../../components/ui/SelectionGroup";
import { createPet } from "../../services/pets";

const { width } = Dimensions.get("window");

export default function AddPetScreen({ navigation }: any) {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | undefined>();

  // Form State'leri
  const [name, setName] = useState("");
  const [type, setType] = useState("Kedi");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("Dişi");
  const [birthDate, setBirthDate] = useState("");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!name)
      return Alert.alert(
        "Eksik Bilgi",
        "Lütfen evcil hayvanınızın adını girin."
      );

    setLoading(true);
    const res = await createPet({
      name,
      type,
      breed,
      gender,
      birth_date: birthDate.length === 10 ? birthDate : undefined,
      imageUri,
    });
    setLoading(false);

    if (res.error) Alert.alert("Hata", res.error);
    else {
      Alert.alert("Harika!", "Yeni dostumuz aileye katıldı.");
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.backBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ChevronLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Yeni Dost Ekle
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* FOTOĞRAF ALANI (MODERN) */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={pickImage}
              style={[
                styles.imagePicker,
                {
                  backgroundColor: colors.card,
                  borderColor: imageUri ? colors.primary : colors.border,
                  shadowColor: colors.primary,
                },
              ]}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.preview} />
              ) : (
                <View style={styles.placeholderContainer}>
                  <PawPrint
                    size={40}
                    color={colors.textMuted}
                    style={{ opacity: 0.5 }}
                  />
                  <Text style={[styles.photoText, { color: colors.textMuted }]}>
                    Fotoğraf Ekle
                  </Text>
                </View>
              )}

              {/* Kamera İkonu Rozeti */}
              <View
                style={[
                  styles.editBadge,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.background,
                  },
                ]}
              >
                <Camera size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          {/* FORM KARTI */}
          <View
            style={[
              styles.formCard,
              { backgroundColor: colors.card, shadowColor: "#000" },
            ]}
          >
            <ModernInput
              label="İsim"
              placeholder="Örn: Pamuk"
        value={name}
        onChangeText={setName}
      />

            <SelectionGroup
              label="TÜRÜ"
              options={[
                { label: "Kedi", value: "Kedi" },
                { label: "Köpek", value: "Köpek" },
                { label: "Kuş", value: "Kuş" },
                { label: "Diğer", value: "Diğer" },
              ]}
              selectedValue={type}
              onSelect={setType}
            />

            <View style={styles.rowInputs}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <ModernInput
                  label="Cinsi (Irkı)"
                  placeholder="Örn: Tekir"
                  value={breed}
                  onChangeText={setBreed}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ModernInput
                  label="Doğum Tarihi"
                  placeholder="YYYY-AA-GG"
                  value={birthDate}
                  onChangeText={setBirthDate}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>

            <SelectionGroup
              label="CİNSİYETİ"
              options={[
                { label: "Dişi", value: "Dişi" },
                { label: "Erkek", value: "Erkek" },
              ]}
              selectedValue={gender}
              onSelect={setGender}
            />
          </View>

          {/* Alt Boşluk */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* KAYDET BUTONU (ALTTA SABİT) */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
      <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 },
            ]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <HeartbeatLoader size={22} variant="inline" />
            ) : (
              <>
                <Save size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Kaydet</Text>
              </>
            )}
      </TouchableOpacity>
    </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },

  scrollContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },

  // Fotoğraf Alanı
  avatarSection: {
    alignItems: "center",
    marginBottom: 25,
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderStyle: "dashed", // Sadece boşken dashed olsun istersek dinamik yapabiliriz ama böyle de şık
    position: "relative",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  preview: {
    width: 114, // Border payı
    height: 114,
    borderRadius: 57,
  },
  placeholderContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  photoText: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 6,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },

  // Form Alanı
  formCard: {
    borderRadius: 24,
    padding: 20,
    width: "100%",
    alignSelf: "stretch",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    gap: 8,
  },
  rowInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  // Footer
  footer: {
    padding: 20,
    paddingBottom: 35,
    borderTopWidth: 1,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  saveBtn: {
    flexDirection: "row",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
