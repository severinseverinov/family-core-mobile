// src/screens/dashboard/DashboardScreen.tsx

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useDashboardData } from "../../hooks/useDashboardData";
import WeatherWidget from "../../components/widgets/WeatherWidget";
import CalendarWidget from "../../components/widgets/CalendarWidget";
import FamilyWidget from "../../components/widgets/FamilyWidget";
import TasksWidget from "../../components/widgets/TasksWidget";
import AddTaskModal from "../../components/modals/AddTaskModal";
import AddRoutineModal from "../../components/modals/AddRoutineModal";
import AddTodoModal from "../../components/modals/AddTodoModal";
import { approveTodoItem, deleteTodoItem, toggleTodoComplete } from "../../services/todos";

export default function DashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { profile, user } = useAuth();
  const { data } = useDashboardData();
  const queryClient = useQueryClient();
  const [taskModalVisible, setTaskModalVisible] = React.useState(false);
  const [routineModalVisible, setRoutineModalVisible] = React.useState(false);
  const [todoModalVisible, setTodoModalVisible] = React.useState(false);
  const [editingTodo, setEditingTodo] = React.useState<any | null>(null);
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [routineFilter, setRoutineFilter] = React.useState<
    "all" | "spouse"
  >("all");

  // Verileri güvenli bir şekilde alalım
  const events = data?.events?.items || [];
  const family = data?.family?.family ?? null;
  const members = data?.members?.members || [];
  const routines = data?.routines?.items || [];
  const todos = data?.todos?.items || [];
  const userName = profile?.full_name || user?.email || "Üye";

  // DÜZELTME: Tasks verisi artık doğrudan gelen veriden filtreleniyor
  const tasks = events.filter((item: any) => item.type === "task") || [];
  const pendingTasks = tasks.filter((t: any) => !t.is_completed);
  const filteredRoutines =
    routineFilter === "spouse"
      ? routines.filter((r: any) => r.visibility_scope === "spouse")
      : routines;
  const sortedRoutines = [...filteredRoutines].sort((a: any, b: any) =>
    String(a.start_time || "").localeCompare(String(b.start_time || "")),
  );
  const visibleTodos = todos.filter(
    t => t.status !== "pending_approval" || t.profile_id === user?.id,
  );
  const todoPreview = visibleTodos.slice(0, 4);

  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return "";
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    if (dateStr === todayStr) return "Bugün";
    if (dateStr === tomorrowStr) return "Yarın";
    return dateStr;
  };

  const handleApproveTodo = async (todoId: string) => {
    const res = await approveTodoItem(todoId);
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  };

  const handleToggleTodo = async (todoId: string, next: boolean) => {
    const res = await toggleTodoComplete(todoId, next);
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    const res = await deleteTodoItem(todoId);
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  };

  const formatRoutineSchedule = (item: any) => {
    const recurrence = (item.recurrence_type || "daily").toUpperCase();
    if (item.recurrence_type === "weekly" && item.days_of_week?.length) {
      return `${recurrence} • ${item.days_of_week.join(", ")}`;
    }
    if (item.recurrence_type === "monthly" && item.day_of_months?.length) {
      return `${recurrence} • ${item.day_of_months.join(", ")}`;
    }
    return recurrence;
  };

  const shiftLabel = (t?: string) => {
    if (t === "evening") return "Akşam";
    if (t === "night") return "Gece";
    return "Sabah";
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar animated translucent backgroundColor={colors.background} />

      <View style={styles.contentWrapper}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 3. AİLE ÜYELERİ WIDGET */}
          <View style={styles.fullWidthWidget}>
            <FamilyWidget
              familyData={family}
              members={members}
              userName={userName}
              userAvatarUrl={profile?.avatar_url}
            />
          </View>
          {/* 1. HAVA DURUMU WIDGET */}
          <View style={styles.fullWidthWidget}>
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <WeatherWidget selectedDate={selectedDate} />
            </View>
          </View>

          {/* 2. TAKVİM WIDGET (GENİŞ) */}
          <View style={styles.fullWidthWidget}>
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <CalendarWidget
                events={events}
                routines={routines}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            </View>
          </View>

          {/* 4. GÜNLÜK GÖREVLER BÖLÜMÜ */}
          <View style={styles.tasksSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.titleRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Günlük Görevler
                </Text>
                <Text style={[styles.sectionMeta, { color: colors.textMuted }]}>
                  {pendingTasks.length} bekliyor
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("MainTabs", {
                    screen: "Home",
                    params: { screen: "Tasks" },
                  })
                }
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  Tümünü Gör
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.sectionCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <TasksWidget
                initialItems={tasks}
                hideHeader={true}
                userRole={profile?.role || "member"}
                onAdd={() => setTaskModalVisible(true)}
                emptyActionLabel="Görev Ekle"
              />
            </View>
          </View>

          {/* 3. TO DO LIST */}
          <View style={styles.simpleSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                To Do List
              </Text>
              <TouchableOpacity onPress={() => setTodoModalVisible(true)}>
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  Hatırlat
                </Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {todoPreview.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Henüz yapılacak bir iş yok.
                </Text>
              ) : (
                todoPreview.map((item: any) => (
                  <View
                    key={item.id}
                    style={[
                      styles.simpleItem,
                      { borderBottomColor: colors.border + "40" },
                    ]}
                  >
                    <View style={styles.todoRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemTitle, { color: colors.text }]}>
                          {item.title}
                        </Text>
                        {item.due_date ? (
                          <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                            {formatDateLabel(item.due_date)}
                          </Text>
                        ) : null}
                        {item.status === "pending_approval" ? (
                          <Text style={[styles.itemMeta, { color: "#f59e0b" }]}>
                            Onay bekliyor
                          </Text>
                        ) : null}
                      </View>
                      {item.status !== "pending_approval" ? (
                        <TouchableOpacity
                          onPress={() => handleToggleTodo(item.id, !item.is_completed)}
                          style={[
                            styles.todoCheckBtn,
                            {
                              borderColor: item.is_completed
                                ? "#22c55e"
                                : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.todoCheckText,
                              {
                                color: item.is_completed ? "#22c55e" : colors.textMuted,
                              },
                            ]}
                          >
                            {item.is_completed ? "✓" : "○"}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {item.status === "pending_approval" &&
                      item.profile_id === user?.id ? (
                        <TouchableOpacity
                          onPress={() => handleApproveTodo(item.id)}
                          style={[
                            styles.todoApproveBtn,
                            { borderColor: colors.primary },
                          ]}
                        >
                          <Text
                            style={[
                              styles.todoApproveText,
                              { color: colors.primary },
                            ]}
                          >
                            Onayla
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {item.created_by === user?.id ? (
                        <View style={styles.todoActionRow}>
                          <TouchableOpacity
                            onPress={() => {
                              setEditingTodo(item);
                              setTodoModalVisible(true);
                            }}
                            style={styles.todoActionBtn}
                          >
                            <Text style={[styles.todoActionText, { color: colors.primary }]}>
                              Düzenle
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteTodo(item.id)}
                            style={styles.todoActionBtn}
                          >
                            <Text style={[styles.todoActionText, { color: "#ef4444" }]}>
                              Sil
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* 4. GÜNLÜK RUTİNLER / PROGRAM */}
          <View style={styles.simpleSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Günlük Rutinler / Program
              </Text>
              <TouchableOpacity onPress={() => setRoutineModalVisible(true)}>
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  Hatırlat
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filterRow}>
              {[
                { label: "Tümü", value: "all" },
                { label: "Eşe özel", value: "spouse" },
              ].map(opt => {
                const active = routineFilter === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setRoutineFilter(opt.value as any)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? colors.primary : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: active ? "#fff" : colors.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {sortedRoutines.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Henüz bir rutin eklenmedi.
                </Text>
              ) : (
                sortedRoutines.slice(0, 3).map((item: any) => (
                  <View
                    key={item.id}
                    style={[
                      styles.simpleItem,
                      { borderBottomColor: colors.border + "40" },
                    ]}
                  >
                    <Text style={[styles.itemTitle, { color: colors.text }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                      {(item.kind || "routine").toUpperCase()} •{" "}
                      {formatRoutineSchedule(item)} • {shiftLabel(item.shift_type)}
                      {item.start_time ? ` • ${item.start_time}` : ""}
                      {item.end_time ? ` - ${item.end_time}` : ""}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>

        </ScrollView>
      </View>

      {/* GÖREV / HATIRLATMA EKLEME BUTONU */}
      <View style={styles.fabWrapper}>
        <TouchableOpacity
          style={[styles.mainFab, { backgroundColor: colors.primary }]}
          onPress={() => setTaskModalVisible(true)}
        >
          <Plus size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <AddTaskModal
        visible={taskModalVisible}
        onClose={() => setTaskModalVisible(false)}
        onSaved={() =>
          queryClient.invalidateQueries({ queryKey: ["dashboard"] })
        }
      />
      <AddRoutineModal
        visible={routineModalVisible}
        onClose={() => setRoutineModalVisible(false)}
        onSaved={() =>
          queryClient.invalidateQueries({ queryKey: ["dashboard"] })
        }
      />
      <AddTodoModal
        visible={todoModalVisible}
        onClose={() => {
          setTodoModalVisible(false);
          setEditingTodo(null);
        }}
        onSaved={() =>
          queryClient.invalidateQueries({ queryKey: ["dashboard"] })
        }
        initialTodo={editingTodo}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  contentWrapper: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 40,
  },
  fullWidthWidget: {
    marginBottom: 16,
    paddingHorizontal: 0,
    width: "100%",
  },
  sectionCard: {
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    width: "100%",
  },
  tasksSection: {
    marginTop: 0,
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  simpleSection: {
    marginTop: 0,
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 6,
    paddingHorizontal: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: "600",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  simpleContainer: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 110,
    width: "100%",
  },
  simpleItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  itemMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  todoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  todoCheckBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  todoCheckText: {
    fontSize: 14,
    fontWeight: "800",
  },
  todoApproveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  todoApproveText: {
    fontSize: 12,
    fontWeight: "700",
  },
  todoActionRow: {
    flexDirection: "row",
    gap: 6,
    marginLeft: 4,
  },
  todoActionBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  todoActionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyText: { textAlign: "center", padding: 18, fontSize: 13 },
  tasksContainer: {
    borderRadius: 28,
    padding: 12,
    minHeight: 160,
    width: "100%",
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  fabWrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 98 : 88,
    right: 12,
  },
  mainFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
});
