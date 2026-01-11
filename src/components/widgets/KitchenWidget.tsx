import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ShoppingBasket, Wallet } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface KitchenWidgetProps {
  hideHeader?: boolean;
  initialBudget: number;
  initialSpent: number;
}

export default function KitchenWidget({
  hideHeader = false,
  initialBudget,
  initialSpent,
}: KitchenWidgetProps) {
  const { colors, themeMode } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderRadius: themeMode === "colorful" ? 28 : 16,
        },
      ]}
    >
      {!hideHeader && (
        <View style={styles.header}>
          <View style={styles.row}>
            <ShoppingBasket size={20} color={colors.primary} />
            <Text style={styles.title}>Mutfak & Market</Text>
          </View>
          <TouchableOpacity>
            <Text style={{ color: colors.primary }}>Tümünü Gör</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.budgetBox}>
        <Wallet size={20} color={colors.success} />
        <View style={{ marginLeft: 12 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>
            Mutfak Bütçesi
          </Text>
          <Text style={{ fontWeight: "800", color: colors.text }}>
            {initialSpent} TL / {initialBudget} TL
          </Text>
        </View>
      </View>
      <View style={styles.listsRow}>
        <View style={styles.smallCard}>
          <Text style={styles.smallLabel}>AZALANLAR</Text>
          <Text style={styles.smallVal}>Her şey tam!</Text>
        </View>
        <View style={styles.smallCard}>
          <Text style={styles.smallLabel}>ALINACAKLAR</Text>
          <Text style={styles.smallVal}>Liste boş.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700" },
  budgetBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 12,
  },
  listsRow: { flexDirection: "row", gap: 10, marginTop: 15 },
  smallCard: {
    flex: 1,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 10,
  },
  smallLabel: { fontSize: 9, fontWeight: "bold", color: "#94a3b8" },
  smallVal: { fontSize: 11, color: "#64748b", marginTop: 4 },
});
