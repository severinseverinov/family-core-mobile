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
  onAdd?: () => void;
  emptyActionLabel?: string;
}

export default function TasksWidget({
  initialItems = [], // Varsayılan değer undefined hatasını engeller
  hideHeader = false,
  userRole = "member",
  onAdd,
  emptyActionLabel = "Görev Ekle",
}: TasksWidgetProps) {
  const { colors, themeMode } = useTheme();

  // Hata Önleyici: initialItems undefined ise boş dizi olarak ele al
  const safeItems = initialItems || [];

  return (
    <View
      style={[
        styles.container,
        {
          // Dashboard'daki genişleme için arka plan DashboardScreen'de yönetiliyor
          borderRadius: themeMode === "colorful" ? 28 : 16,
        },
      ]}
    >
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Görevler</Text>
          <TouchableOpacity>
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              + Puan Ver
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {safeItems.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            Henüz bir görev bulunmuyor.
          </Text>
          {onAdd ? (
            <TouchableOpacity onPress={onAdd} style={styles.emptyBtn}>
              <Text style={[styles.emptyBtnText, { color: colors.primary }]}>
                {emptyActionLabel}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        safeItems.map(item => (
          <View
            key={item.id}
            style={[
              styles.taskCard,
              { borderBottomColor: colors.border + "40" },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}
              >
                {item.title}
              </Text>
              {item.is_completed && (
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textMuted,
                    marginTop: 2,
                  }}
                >
                  Yapan: {item.completed_by || "Bilinmiyor"}
                </Text>
              )}
            </View>

            <View style={styles.actionRow}>
              {item.status === "pending_approval" ? (
                userRole === "admin" || userRole === "owner" ? (
                  <View style={{ flexDirection: "row", gap: 15 }}>
                    <TouchableOpacity onPress={() => approveEvent(item.id)}>
                      <CheckCircle size={24} color="#10b981" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => rejectEvent(item.id)}>
                      <RotateCcw size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text
                    style={{
                      color: "#f59e0b",
                      fontSize: 11,
                      fontWeight: "600",
                    }}
                  >
                    Onay Bekliyor
                  </Text>
                )
              ) : item.is_completed ? (
                <CheckCircle size={22} color="#10b981" />
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
  container: { padding: 10, width: "100%" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: { fontSize: 16, fontWeight: "800" },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  actionRow: {
    marginLeft: 12,
  },
  emptyWrap: { alignItems: "center", paddingVertical: 18 },
  empty: { textAlign: "center", paddingHorizontal: 16, fontSize: 14 },
  emptyBtn: { marginTop: 8 },
  emptyBtnText: { fontWeight: "700", fontSize: 13 },
});
