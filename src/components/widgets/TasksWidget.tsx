import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface TasksWidgetProps {
  initialItems: any[];
  hideHeader?: boolean;
}

export default function TasksWidget({
  initialItems,
  hideHeader = false,
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
        initialItems.map((item: any) => (
          <View
            key={item.id}
            style={[styles.item, { borderBottomColor: colors.border }]}
          >
            <Text style={{ color: colors.text }}>{item.title}</Text>
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
  empty: { textAlign: "center", padding: 20 },
});
