import React from "react";
import {
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  View,
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
});
