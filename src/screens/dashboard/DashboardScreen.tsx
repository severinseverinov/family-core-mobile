// src/screens/dashboard/DashboardScreen.tsx

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

export default function DashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { profile, user } = useAuth();
  const { data } = useDashboardData();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [taskModalVisible, setTaskModalVisible] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  // Verileri güvenli bir şekilde alalım
  const events = data?.events?.items || [];
  const family = data?.family?.family ?? null;
  const members = data?.members?.members || [];
  const userName = profile?.full_name || user?.email || "Üye";

  // DÜZELTME: Tasks verisi artık doğrudan gelen veriden filtreleniyor
  const tasks = events.filter((item: any) => item.type === "task") || [];

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
        },
      ]}
    >
      <StatusBar animated translucent backgroundColor={colors.background} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
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
            <WeatherWidget selectedDate={selectedDate} />
          </View>

          {/* 2. TAKVİM WIDGET (GENİŞ) */}
          <View style={styles.fullWidthWidget}>
            <CalendarWidget
              events={events}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </View>

          {/* 4. GÜNLÜK GÖREVLER BÖLÜMÜ */}
          <View style={styles.tasksSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Günlük Görevler
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("MainTabs", {
                    screen: "Home",
                    params: { screen: "Tasks" },
                  })
                }
              >
                {/* Not: Navigasyon yapınıza göre burası TaskScreen'e gitmeli, genellikle Stack içinde tanımlı olmalı */}
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

            {/* Görevler alanı */}
            <View
              style={[styles.tasksContainer, { backgroundColor: colors.card }]}
            >
              <TasksWidget
                initialItems={tasks}
                hideHeader={true}
                userRole={profile?.role || "member"}
              />
            </View>
          </View>

          <View style={{ height: 100 }} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingVertical: 10 },
  fullWidthWidget: {
    marginBottom: 18,
    paddingHorizontal: 8,
    width: "100%",
  },
  tasksSection: {
    marginTop: 5,
    paddingHorizontal: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  tasksContainer: {
    borderRadius: 28,
    padding: 8,
    minHeight: 160,
    width: "100%",
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
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
