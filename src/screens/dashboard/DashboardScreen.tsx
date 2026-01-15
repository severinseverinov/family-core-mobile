import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Plus } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useDashboardData } from "../../hooks/useDashboardData";
import WeatherWidget from "../../components/widgets/WeatherWidget";
import CalendarWidget from "../../components/widgets/CalendarWidget";
import FamilyWidget from "../../components/widgets/FamilyWidget";
import TasksWidget from "../../components/widgets/TasksWidget";

export default function DashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { profile, user } = useAuth();
  const { data } = useDashboardData();
  const events = data?.events?.items || [];
  const family = data?.family?.family ?? null;
  const members = data?.members?.members || [];
  const userName = profile?.full_name || user?.email || "Üye";

  // TasksWidget için başlangıç verisi (Hata almamak için boş dizi ile başlatıyoruz)
  const [tasks, setTasks] = useState([]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
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
          <WeatherWidget />
        </View>

        {/* 2. TAKVİM WIDGET (GENİŞ) */}
        <View style={styles.fullWidthWidget}>
          <CalendarWidget events={events} />
        </View>

        {/* 4. GÜNLÜK GÖREVLER BÖLÜMÜ */}
        <View style={styles.tasksSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Günlük Görevler
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Tasks")}>
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

          {/* Görevler alanı Takvim gibi geniş ve kart yapısında */}
          <View
            style={[styles.tasksContainer, { backgroundColor: colors.card }]}
          >
            <TasksWidget
              initialItems={tasks}
              hideHeader={true}
              userRole="owner"
            />
          </View>
        </View>

        {/* Tab Bar altında kalmaması için boşluk */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* GÖREV / HATIRLATMA EKLEME BUTONU */}
      <View style={styles.fabWrapper}>
        <TouchableOpacity
          style={[styles.mainFab, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate("AddTask")}
        >
          <Plus size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingVertical: 10 },
  // Yanlardaki boşluğu 15'ten 8'e düşürerek genişliği artırdık
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
    paddingHorizontal: 10, // Başlıklar çok kenara yapışmasın diye iç boşluk
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  tasksContainer: {
    borderRadius: 28, // Daha yumuşak ve geniş görünüm için artırıldı
    padding: 8,
    minHeight: 160,
    width: "100%",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  fabWrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 35 : 25,
    right: 20,
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
