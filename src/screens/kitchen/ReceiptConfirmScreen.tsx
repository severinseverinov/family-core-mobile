import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from "react-native";
import { Check, Trash2, Save, ShoppingCart } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import ModernInput from "../../components/ui/ModernInput";
import { saveReceiptFinal } from "../../services/kitchen";

export default function ReceiptConfirmScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  // AI'dan gelen veriyi state'e alıyoruz
  const [receipt, setReceipt] = useState(
    route.params?.data
      ? {
          shop_name: route.params.data.shop_name || "",
          items: route.params.data.items || [],
          total_amount: route.params.data.total_amount || 0,
        }
      : { shop_name: "", items: [], total_amount: 0 }
  );

  const handleSave = async () => {
    if (receipt.items.length === 0) {
      return Alert.alert("Hata", "Onaylanacak ürün bulunamadı.");
    }

    try {
      const res = await saveReceiptFinal(receipt);
      if (res?.success) {
        Alert.alert(
          "Başarılı",
          "Ürünler envantere eklendi ve harcama kaydedildi."
        );
        navigation.navigate("Kitchen");
      }
    } catch (error) {
      Alert.alert("Hata", "Kaydedilirken bir sorun oluştu.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            MARKET BİLGİSİ
          </Text>
          <ModernInput
            label="Market Adı"
            value={receipt.shop_name}
            onChangeText={t => setReceipt({ ...receipt, shop_name: t })}
          />
        </View>

        <Text style={[styles.listTitle, { color: colors.text }]}>
          Okunan Ürünler
        </Text>

        {receipt.items && receipt.items.length > 0 ? (
          receipt.items.map((item: any, index: number) => (
            <View
              key={index}
              style={[styles.itemCard, { backgroundColor: colors.card }]}
            >
              <ModernInput
                label="Ürün Adı"
                value={item.name}
                onChangeText={t => {
                  let newItems = [...receipt.items];
                  newItems[index].name = t;
                  setReceipt({ ...receipt, items: newItems });
                }}
              />
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <ModernInput
                    label="Adet"
                    value={String(item.quantity)}
                    keyboardType="numeric"
                    onChangeText={t => {
                      let newItems = [...receipt.items];
                      newItems[index].quantity = parseFloat(t) || 0;
                      setReceipt({ ...receipt, items: newItems });
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ModernInput
                    label="Birim Fiyat"
                    value={String(item.unit_price)}
                    keyboardType="numeric"
                    onChangeText={t => {
                      let newItems = [...receipt.items];
                      newItems[index].unit_price = parseFloat(t) || 0;
                      setReceipt({ ...receipt, items: newItems });
                    }}
                  />
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Ürün bulunamadı
          </Text>
        )}

        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Save size={20} color="#fff" />
          <Text style={styles.confirmBtnText}>Envantere ve Finansa İşle</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  card: { padding: 20, borderRadius: 25, marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: "800", marginBottom: 15 },
  listTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 15,
    marginLeft: 5,
  },
  itemCard: { padding: 15, borderRadius: 22, marginBottom: 12 },
  row: { flexDirection: "row" },
  confirmBtn: {
    flexDirection: "row",
    padding: 18,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    marginBottom: 50,
  },
  confirmBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  emptyText: {
    textAlign: "center",
    padding: 20,
    fontSize: 14,
    fontStyle: "italic",
  },
});
