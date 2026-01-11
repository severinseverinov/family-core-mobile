import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext"; // Temanızı kullanıyoruz
import { createFamily, getUserFamilyProfile } from "../../services/family";
import { supabase } from "../../services/supabase";

export default function JoinScreen() {
  const { colors } = useTheme();
  const [familyName, setFamilyName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateFamily = async () => {
    if (!familyName) {
      Alert.alert("Hata", "Lütfen bir aile ismi giriniz.");
      return;
    }

    setLoading(true);
    const { error } = await createFamily(familyName);

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
