import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { CheckCircle, RotateCcw, Clock } from "lucide-react-native";
import {
  approveEvent,
  rejectEvent,
  completeEvent,
} from "../../services/events";

interface TasksWidgetProps {
  initialItems: any[];
  hideHeader?: boolean;
  userRole?: string;
}

export default function TasksWidget({
  initialItems,
  hideHeader = false,
  userRole = "member",
}: TasksWidgetProps) {
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
          <Text style={[styles.title, { color: colors.text }]}>Görevler</Text>
          <TouchableOpacity>
            <Text style={{ color: colors.primary }}>+ Puan Ver</Text>
          </TouchableOpacity>
        </View>
      )}
      {initialItems.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          Henüz bir görev bulunmuyor.
        </Text>
      ) : (
        initialItems.map(item => (
          <View key={item.id} style={styles.taskCard}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                {item.title}
              </Text>
              {item.is_completed && (
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Yapan: {item.completed_by}
                </Text>
              )}
            </View>

            <View style={styles.actionRow}>
              {item.status === "pending_approval" ? ( //
                userRole === "admin" || userRole === "owner" ? (
                  <View style={{ flexDirection: "row", gap: 15 }}>
                    <TouchableOpacity onPress={() => approveEvent(item.id)}>
                      <CheckCircle size={24} color={colors.success} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => rejectEvent(item.id)}>
                      <RotateCcw size={24} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={{ color: colors.warning, fontSize: 11 }}>
                    Onay Bekliyor
                  </Text>
                )
              ) : item.is_completed ? (
                <CheckCircle size={22} color={colors.success} />
              ) : (
                <TouchableOpacity onPress={() => completeEvent(item.id)}>
                  <Clock size={22} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  title: { fontSize: 16, fontWeight: "700" },
  item: { paddingVertical: 12, borderBottomWidth: 1 },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  actionRow: {
    marginLeft: 12,
  },
  empty: { textAlign: "center", padding: 20 },
});
