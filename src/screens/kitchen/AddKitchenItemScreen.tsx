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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card }]}
        placeholder="Ürün Adı"
        value={product_name}
        onChangeText={setProductName}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.card }]}
        placeholder="Miktar"
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.card }]}
        placeholder="Fiyat"
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
      />
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
        <Text style={styles.btnText}>Envantere Ekle</Text>
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
