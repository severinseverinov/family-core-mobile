import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Plus, ListFilter, Calendar } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useDashboardData } from "../../hooks/useDashboardData";
import TasksWidget from "../../components/widgets/TasksWidget";

export default function TaskScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { data } = useDashboardData();
  const [filter, setFilter] = useState<"today" | "upcoming">("today");

  const tasks =
    data?.events?.items?.filter((i: any) => i.type === "task") || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Görevler</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            {filter === "today" ? "Bugünkü İşlerin" : "Yaklaşan Görevler"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate("AddTask")}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => setFilter("today")}
          style={[
            styles.filterBtn,
            filter === "today" && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 3,
            },
          ]}
        >
          <Text
            style={{
              color: filter === "today" ? colors.primary : colors.textMuted,
              fontWeight: "bold",
            }}
          >
            Bugün
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter("upcoming")}
          style={[
            styles.filterBtn,
            filter === "upcoming" && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 3,
            },
          ]}
        >
          <Text
            style={{
              color: filter === "upcoming" ? colors.primary : colors.textMuted,
              fontWeight: "bold",
            }}
          >
            Yaklaşan
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <TasksWidget
          initialItems={tasks}
          hideHeader={true}
          userRole={profile?.role || "member"}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 24,
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "900" },
  sub: { fontSize: 14, marginTop: 4 },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  filterBtn: { paddingVertical: 12, marginRight: 24 },
});
