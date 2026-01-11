import React from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Plus } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useDashboardData } from "../../hooks/useDashboardData";
import KitchenWidget from "../../components/widgets/KitchenWidget";

export default function KitchenScreen() {
  const { colors } = useTheme();
  const { data } = useDashboardData();
  const kitchen = data?.kitchen;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.text }]}>
              Mutfak & Stok
            </Text>
            <Text style={[styles.screenSub, { color: colors.textMuted }]}>
              Alışveriş listesi ve bütçe yönetimi
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Plus size={24} color="#fff" strokeWidth={3} />
          </TouchableOpacity>
        </View>
        <KitchenWidget
          initialBudget={kitchen?.budget || 0}
          initialSpent={kitchen?.spent || 0}
          hideHeader={true}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 24 },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  screenTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  screenSub: { fontSize: 14, marginTop: 4, fontWeight: "500" },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
});
