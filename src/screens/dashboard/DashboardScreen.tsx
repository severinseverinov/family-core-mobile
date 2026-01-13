import React from "react";
import {
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  View,
  Text,
  StyleSheet,
} from "react-native";
// 1. Hook'u import ediyoruz
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useAuth } from "../../contexts/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../contexts/ThemeContext";
import FamilyWidget from "../../components/widgets/FamilyWidget";
import CalendarWidget from "../../components/widgets/CalendarWidget";
import TasksWidget from "../../components/widgets/TasksWidget"; // Görevler artık burada
import WeatherWidget from "../../components/widgets/WeatherWidget";

export default function DashboardScreen() {
  // 2. Cihazın güvenli alan değerlerini (üst, alt, sağ, sol) alıyoruz
  const insets = useSafeAreaInsets();

  const { data, isLoading, refetch, isRefetching } = useDashboardData();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  // Hooks her zaman conditional return'lerden önce çağrılmalı
  useFocusEffect(
    React.useCallback(() => {
      refetch(); // Ekran her odağa geldiğinde veriyi tazele
    }, [refetch])
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const events = data?.events?.items || [];
  const family = data?.family?.family ?? null;
  const members = data?.members?.members || [];
  const userRole = profile?.role || "member";
  const taskItems = events.filter((item: any) => item.type === "task");

  return (
    <View
      style={[
        styles.container,
        // 3. Sadece üst kısımdaki çentik/kamera boşluğunu uyguluyoruz
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <FamilyWidget
          familyData={family}
          members={members}
          userName={profile?.full_name || user?.email || "User"}
          userAvatarUrl={profile?.avatar_url}
        />
        <WeatherWidget />
        <CalendarWidget events={events} />
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Günlük Görevler
            </Text>
          </View>
          <TasksWidget
            initialItems={taskItems.slice(0, 5)}
            hideHeader={true}
            userRole={userRole}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  section: { paddingHorizontal: 20, marginTop: 25 },
  sectionHeader: { marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
});
