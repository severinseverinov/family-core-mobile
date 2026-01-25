import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Package } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import ModernInput from "../../components/ui/ModernInput";
import { addInventoryItem } from "../../services/kitchen";

export default function AddKitchenItemScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [product_name, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("0");

  const handleSave = async () => {
    // addInventoryItem(itemData: { product_name, quantity, price, category?, unit? })
    const res = await addInventoryItem({ product_name, quantity, price });

    if (res.success) navigation.goBack();
    else Alert.alert("Hata", res.error);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card }]}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Ürün Ekle
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Stok yönetimi • Mutfak
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.formCard, { backgroundColor: colors.card }]}>
            <View style={styles.formHeader}>
              <View style={[styles.iconCircle, { backgroundColor: "#e2e8f0" }]}>
                <Package size={20} color={colors.primary} />
              </View>
              <Text style={[styles.formTitle, { color: colors.text }]}>
                Yeni ürün bilgileri
              </Text>
            </View>

            <ModernInput
              label="Ürün adı"
              placeholder="Örn: Domates"
              value={product_name}
        onChangeText={setProductName}
      />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <ModernInput
                  label="Miktar"
                  placeholder="1"
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
      />
              </View>
              <View style={{ flex: 1 }}>
                <ModernInput
                  label="Fiyat"
                  placeholder="0"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
      <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
            <Text style={styles.saveBtnText}>Stoka Ekle</Text>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerSubtitle: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  container: { padding: 20, paddingBottom: 30 },
  formCard: {
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  formTitle: { fontSize: 15, fontWeight: "700" },
  row: { flexDirection: "row", gap: 12 },
  footer: {
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: "row",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
