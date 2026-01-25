import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, Trash2, Save, ShoppingCart } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import ModernInput from "../../components/ui/ModernInput";
import {
  saveReceiptFinal,
  findMatchingShoppingItems,
  removeShoppingItemsByIds,
  getShoppingListItems,
} from "../../services/kitchen";

export default function ReceiptConfirmScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const [removeVisible, setRemoveVisible] = useState(false);
  const [removeItems, setRemoveItems] = useState<any[]>([]);
  const [removeSelected, setRemoveSelected] = useState<string[]>([]);
  const [removeMatched, setRemoveMatched] = useState<string[]>([]);
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
        const names = receipt.items.map((item: any) => item.name).filter(Boolean);
        const [listRes, matchRes] = await Promise.all([
          getShoppingListItems(),
          findMatchingShoppingItems(names),
        ]);
        const items = listRes?.items || [];
        const matches = matchRes?.matches || [];
        if (items.length > 0) {
          setRemoveItems(items);
          const matchedIds = matches.map((m: any) => m.id);
          setRemoveMatched(matchedIds);
          setRemoveSelected(matchedIds);
          setRemoveVisible(true);
          return;
        }
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

        <View style={styles.listHeader}>
        <Text style={[styles.listTitle, { color: colors.text }]}>
          Okunan Ürünler
        </Text>
          <Text style={[styles.listMeta, { color: colors.textMuted }]}>
            {receipt.items?.length || 0} ürün
          </Text>
        </View>

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

      <Modal visible={removeVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              İstek listesinden çıkar
            </Text>
            <Text style={[styles.modalHint, { color: colors.textMuted }]}>
              Listeden çıkarılacak ürünleri seç
            </Text>

            {removeItems.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                İstek listesi boş.
              </Text>
            ) : (
              <ScrollView style={styles.modalList}>
                <View style={styles.selectionActions}>
                  <TouchableOpacity
                    style={[styles.selectionActionBtn, { borderColor: colors.border }]}
                    onPress={() =>
                      setRemoveSelected(removeItems.map(item => item.id))
                    }
                  >
                    <Text
                      style={[styles.selectionActionText, { color: colors.text }]}
                    >
                      Hepsini seç
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.selectionActionBtn, { borderColor: colors.border }]}
                    onPress={() => setRemoveSelected(removeMatched)}
                  >
                    <Text
                      style={[styles.selectionActionText, { color: colors.text }]}
                    >
                      Eşleşenleri seç
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.selectionActionBtn, { borderColor: colors.border }]}
                    onPress={() => setRemoveSelected([])}
                  >
                    <Text
                      style={[styles.selectionActionText, { color: colors.text }]}
                    >
                      Seçimi temizle
                    </Text>
                  </TouchableOpacity>
                </View>
                {removeItems.map(item => {
                  const selected = removeSelected.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.selectionItem,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.background,
                        },
                      ]}
                      onPress={() =>
                        setRemoveSelected(prev =>
                          prev.includes(item.id)
                            ? prev.filter(val => val !== item.id)
                            : [...prev, item.id]
                        )
                      }
                    >
                      {selected ? (
                        <Check size={20} color={colors.primary} />
                      ) : (
                        <ShoppingCart size={20} color={colors.textMuted} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: "700" }}>
                          {item.product_name}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                          {item.quantity} {item.unit || "adet"}
                          {item.market_name ? ` • ${item.market_name}` : ""}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
                onPress={() => {
                  setRemoveVisible(false);
                  navigation.navigate("Kitchen");
                }}
              >
                <Text style={{ color: colors.text }}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  { backgroundColor: colors.primary },
                ]}
                onPress={async () => {
                  if (removeSelected.length === 0) {
                    Alert.alert("Bilgi", "Lütfen listeden ürün seçin.");
                    return;
                  }
                  await removeShoppingItemsByIds(removeSelected);
                  setRemoveVisible(false);
                  Alert.alert("Başarılı", "Seçili ürünler listeden çıkarıldı.");
                  navigation.navigate("Kitchen");
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Çıkar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 24 },
  card: { padding: 18, borderRadius: 22, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: "800", marginBottom: 15 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listTitle: { fontSize: 18, fontWeight: "800" },
  listMeta: { fontSize: 12, fontWeight: "700" },
  itemCard: { padding: 14, borderRadius: 20, marginBottom: 10 },
  row: { flexDirection: "row" },
  confirmBtn: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    marginBottom: 24,
  },
  confirmBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  emptyText: {
    textAlign: "center",
    padding: 20,
    fontSize: 14,
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalCard: {
    padding: 18,
    borderRadius: 24,
    width: "100%",
    maxWidth: 520,
    maxHeight: "82%",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  modalHint: { fontSize: 12, marginBottom: 12 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  modalBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalBtnPrimary: {
    borderWidth: 0,
  },
  modalList: { maxHeight: 320 },
  selectionItem: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  selectionActions: { flexDirection: "row", gap: 10, marginBottom: 10 },
  selectionActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 9,
    alignItems: "center",
  },
  selectionActionText: { fontSize: 12, fontWeight: "700" },
});
