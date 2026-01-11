import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Trophy, Medal, Star, Crown } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { getLeaderboard } from "../../services/gamification";

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();

  // TanStack Query ile veriyi çekiyoruz
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: getLeaderboard,
  });

  const users = data?.users || [];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  // İlk 3 kişiyi ve geri kalanları ayırıyoruz
  const topThree = users.slice(0, 3);
  const others = users.slice(3);

  const renderMember = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.memberItem}>
      <Text style={styles.rankText}>{index + 4}</Text>
      <Image
        source={
          item.avatar_url
            ? { uri: item.avatar_url }
            : require("../../../assets/icon.png") // Yerel placeholder görseliniz
        }
        style={styles.smallAvatar}
      />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.full_name}</Text>
        <Text style={styles.memberRole}>
          {item.role === "admin" || item.role === "owner" ? "Ebeveyn" : "Çocuk"}
        </Text>
      </View>
      <Text style={styles.memberPoints}>{item.current_points} P</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Trophy size={32} color="#f59e0b" fill="#f59e0b" />
        <Text style={styles.headerTitle}>Aile Sıralaması</Text>
      </View>

      <FlatList
        data={others}
        keyExtractor={item => item.id}
        renderItem={renderMember}
        ListHeaderComponent={
          <View style={styles.podiumContainer}>
            {/* 2. Sıra */}
            {topThree[1] && (
              <View style={[styles.podiumItem, styles.silverPodium]}>
                <Medal size={24} color="#94a3b8" />
                <Image
                  source={{ uri: topThree[1].avatar_url }}
                  style={styles.avatar}
                />
                <Text style={styles.podiumName} numberOfLines={1}>
                  {topThree[1].full_name}
                </Text>
                <Text style={styles.podiumPoints}>
                  {topThree[1].current_points} P
                </Text>
              </View>
            )}

            {/* 1. Sıra (Şampiyon) */}
            {topThree[0] && (
              <View style={[styles.podiumItem, styles.goldPodium]}>
                <Crown size={32} color="#f59e0b" style={styles.crownIcon} />
                <Image
                  source={{ uri: topThree[0].avatar_url }}
                  style={[styles.avatar, styles.goldAvatar]}
                />
                <Text style={styles.podiumName} numberOfLines={1}>
                  {topThree[0].full_name}
                </Text>
                <Text style={[styles.podiumPoints, styles.goldPointsText]}>
                  {topThree[0].current_points} P
                </Text>
              </View>
            )}

            {/* 3. Sıra */}
            {topThree[2] && (
              <View style={[styles.podiumItem, styles.bronzePodium]}>
                <Star size={24} color="#d97706" />
                <Image
                  source={{ uri: topThree[2].avatar_url }}
                  style={styles.avatar}
                />
                <Text style={styles.podiumName} numberOfLines={1}>
                  {topThree[2].full_name}
                </Text>
                <Text style={styles.podiumPoints}>
                  {topThree[2].current_points} P
                </Text>
              </View>
            )}
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#6366f1" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { alignItems: "center", marginVertical: 20 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 8,
  },
  podiumContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: 250,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  podiumItem: {
    alignItems: "center",
    width: "30%",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 10,
  },
  goldPodium: {
    height: 200,
    backgroundColor: "rgba(255,255,255,0.3)",
    zIndex: 2,
    marginHorizontal: 5,
  },
  silverPodium: { height: 160 },
  bronzePodium: { height: 140 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#fff",
    marginVertical: 8,
  },
  goldAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderColor: "#f59e0b",
  },
  crownIcon: { position: "absolute", top: -25 },
  podiumName: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  podiumPoints: { color: "#e2e8f0", fontSize: 12, fontWeight: "600" },
  goldPointsText: { color: "#fef3c7", fontSize: 14 },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 15,
    borderRadius: 16,
    elevation: 2,
  },
  rankText: { fontSize: 16, fontWeight: "bold", color: "#64748b", width: 30 },
  smallAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  memberRole: { fontSize: 12, color: "#64748b" },
  memberPoints: { fontSize: 16, fontWeight: "bold", color: "#6366f1" },
});
