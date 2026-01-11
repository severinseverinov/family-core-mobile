import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ShoppingBag,
  Star,
  Lock,
  CheckCircle2,
  Gift,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRewards, redeemReward } from "../../services/gamification";
import { useAuth } from "../../contexts/AuthContext";

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const userPoints = profile?.current_points || 0;

  // 1. Ödülleri Getir
  const { data, isLoading } = useQuery({
    queryKey: ["rewards"],
    queryFn: getRewards,
  });

  // 2. Ödül Satın Alma İşlemi (Mutation)
  const mutation = useMutation({
    mutationFn: ({
      id,
      cost,
      title,
    }: {
      id: string;
      cost: number;
      title: string;
    }) => redeemReward(id, cost, title),
    onSuccess: res => {
      if (res.success) {
        Alert.alert("Harika!", "Ödül başarıyla alındı. Keyfini çıkar!");
        // Puanlar değiştiği için profili ve liderlik tablosunu yenile
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      } else {
        Alert.alert("Hata", res.error || "İşlem başarısız.");
      }
    },
  });

  const rewards = data?.rewards || [];

  const renderReward = ({ item }: { item: any }) => {
    const canAfford = userPoints >= item.cost;

    return (
      <View style={[styles.card, !canAfford && styles.disabledCard]}>
        <View style={styles.iconContainer}>
          <Text style={styles.rewardIcon}>{item.icon || "🎁"}</Text>
        </View>

        <View style={styles.rewardDetails}>
          <Text style={styles.rewardTitle}>{item.title}</Text>
          <View style={styles.costRow}>
            <Star size={16} color="#f59e0b" fill="#f59e0b" />
            <Text style={styles.costText}>{item.cost} Puan</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.buyBtn, !canAfford && styles.lockBtn]}
          onPress={() => {
            if (canAfford) {
              Alert.alert(
                "Emin misin?",
                `${item.title} ödülünü ${item.cost} puan karşılığında almak istiyor musun?`,
                [
                  { text: "Vazgeç", style: "cancel" },
                  {
                    text: "Satın Al",
                    onPress: () =>
                      mutation.mutate({
                        id: item.id,
                        cost: item.cost,
                        title: item.title,
                      }),
                  },
                ]
              );
            }
          }}
          disabled={mutation.isPending || !canAfford}
        >
          {canAfford ? (
            <ShoppingBag size={20} color="#fff" />
          ) : (
            <Lock size={20} color="#94a3b8" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading)
    return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Üst Bilgi Paneli */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Mevcut Puanın</Text>
          <View style={styles.userPointsRow}>
            <Star size={24} color="#f59e0b" fill="#f59e0b" />
            <Text style={styles.userPointsText}>{userPoints}</Text>
          </View>
        </View>
        <Gift size={40} color="#fff" opacity={0.5} />
      </View>

      <View style={styles.marketContainer}>
        <Text style={styles.marketTitle}>Ödül Marketi</Text>
        <FlatList
          data={rewards}
          keyExtractor={item => item.id}
          renderItem={renderReward}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CheckCircle2 size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>Henüz ödül eklenmemiş.</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#6366f1" },
  header: {
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerSubtitle: { color: "#e2e8f0", fontSize: 14, fontWeight: "600" },
  userPointsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  userPointsText: { color: "#fff", fontSize: 32, fontWeight: "900" },
  marketContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  marketTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  disabledCard: { opacity: 0.8 },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  rewardIcon: { fontSize: 30 },
  rewardDetails: { flex: 1, marginLeft: 16 },
  rewardTitle: { fontSize: 16, fontWeight: "bold", color: "#334155" },
  costRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  costText: { fontSize: 14, color: "#f59e0b", fontWeight: "700" },
  buyBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
  lockBtn: { backgroundColor: "#f1f5f9" },
  emptyContainer: { alignItems: "center", marginTop: 50 },
  emptyText: { color: "#94a3b8", marginTop: 12, fontSize: 16 },
});
