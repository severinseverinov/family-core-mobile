import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext"; // Temanızı kullanıyoruz
import { createFamily, getUserFamilyProfile } from "../../services/family";
import { supabase } from "../../services/supabase";
import * as ImagePicker from "expo-image-picker";

export default function JoinScreen() {
  const { colors } = useTheme();
  const [familyName, setFamilyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [autoAvatar, setAutoAvatar] = useState(true);

  const getInitials = (name: string) => {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return "FC";
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
    return (first + last).toUpperCase() || "FC";
  };

  const handlePickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Hata", "Galeri izni gerekli.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
      setAutoAvatar(false);
    }
  };

  const handleUseAutoAvatar = () => {
    setAvatarUri(null);
    setAutoAvatar(true);
  };

  const handleCreateFamily = async () => {
    if (!familyName) {
      Alert.alert("Hata", "Lütfen bir aile ismi giriniz.");
      return;
    }

    setLoading(true);
    const { error } = await createFamily(familyName, {
      avatarUri,
      autoAvatar,
    });

    if (error) {
      Alert.alert("Hata", error);
      setLoading(false);
    } else {
      // Başarılı! AppNavigator zaten auth state değişimini dinliyor olabilir,
      // ama family_id değişikliğini tetiklemek gerekebilir.
      // En garantisi sayfayı yenilemek veya auth listener'ı tetiklemektir.
      Alert.alert("Başarılı", "Aileniz oluşturuldu!", [
        {
          text: "Tamam",
          onPress: () => {
            // Basit bir trick: Session'ı yenileyerek AppNavigator'ın tekrar kontrol etmesini sağlarız
            supabase.auth.refreshSession();
          },
        },
      ]);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Aile Kurulumu</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Devam etmek için bir aile oluşturun veya size gönderilen davetiyeyi
        kullanın.
      </Text>

      <View style={styles.form}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatarPreview, { borderColor: colors.border }]}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitials, { color: colors.text }]}>
                {getInitials(familyName)}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.text }]}>
              Aile Avatarı
            </Text>
            <View style={styles.avatarButtons}>
              <TouchableOpacity
                style={[styles.smallButton, { borderColor: colors.border }]}
                onPress={handlePickAvatar}
              >
                <Text style={{ color: colors.text }}>Resim Seç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallButton, { borderColor: colors.border }]}
                onPress={handleUseAutoAvatar}
              >
                <Text style={{ color: colors.text }}>Otomatik</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
              Avatarlar Supabase Storage `family-avatars` içinde tutulur.
            </Text>
          </View>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Aile İsmi</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBackground,
              color: colors.inputText,
              borderColor: colors.inputBorder,
            },
          ]}
          placeholder="Örn: Yılmaz Ailesi"
          placeholderTextColor={colors.inputPlaceholder}
          value={familyName}
          onChangeText={setFamilyName}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleCreateFamily}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Aile Oluştur</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text
          style={{
            color: colors.textMuted,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          Bir davetiyeniz mi var?
        </Text>
        <Text
          style={{ color: colors.textMuted, textAlign: "center", fontSize: 12 }}
        >
          Web üzerinden size gelen e-postadaki linke tıklayarak veya QR kodu
          taratarak katılabilirsiniz. (Bu özellik yakında eklenecek)
        </Text>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={{ color: colors.error }}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
  },
  form: {
    marginBottom: 30,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  avatarPreview: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitials: { fontSize: 18, fontWeight: "800" },
  avatarButtons: { flexDirection: "row", gap: 10, marginTop: 8 },
  smallButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
  },
  logoutButton: {
    marginTop: 30,
    padding: 10,
  },
});
