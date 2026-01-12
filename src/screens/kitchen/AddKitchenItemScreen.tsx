import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { addInventoryItem } from "../../services/kitchen";

export default function AddKitchenItemScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("0");

  const handleSave = async () => {
    const res = await addInventoryItem({
      product_name: productName,
      quantity,
      price,
      category: "Genel",
      unit: "adet",
    });
    if (res.success) navigation.goBack();
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Ürün Adı"
        value={productName}
        onChangeText={setProductName}
      />
      <TextInput
        placeholder="Miktar"
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
      />
      <TouchableOpacity
        onPress={handleSave}
        style={{ backgroundColor: colors.primary }}
      >
        <Text>Stoka Ekle</Text>
      </TouchableOpacity>
    </View>
  );
}
