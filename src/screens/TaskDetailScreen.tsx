import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import HeartbeatLoader from "../components/ui/HeartbeatLoader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  Info,
  ChevronLeft,
} from "lucide-react-native";
import { completeEvent, approveEvent, rejectEvent } from "../services/events";

export default function TaskDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { task, isAdmin } = route.params; // Dashboard'dan gelen veriler
  const [loading, setLoading] = useState(false);

  // 1. Görevi Tamamla (Çocuk İçin)
  const handleComplete = async () => {
    setLoading(true);
    const res = await completeEvent(task.id);
    setLoading(false);

    if (res.success) {
      Alert.alert(
        "Tebrikler!",
        "Görev tamamlandı ve ebeveyn onayına gönderildi."
      );
      navigation.goBack();
    } else {
      Alert.alert("Hata", res.error);
    }
  };

  // 2. Görevi Onayla (Ebeveyn İçin)
  const handleApprove = async () => {
    setLoading(true);
    const res = await approveEvent(task.id);
    setLoading(false);

    if (res.success) {
      Alert.alert("Onaylandı", "Puanlar başarıyla eklendi.");
      navigation.goBack();
    }
  };

  // 3. Görevi Reddet / Geri Al (Ebeveyn İçin)
  const handleReject = async () => {
    setLoading(true);
    const res = await rejectEvent(task.id);
    setLoading(false);

    if (res.success) {
      Alert.alert("Reddedildi", "Görev tekrar aktif hale getirildi.");
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Özel Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Görev Detayı</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        {/* Görev Bilgi Kartı */}
        <View style={styles.card}>
          <View style={styles.statusBadge}>
            {task.status === "completed" ? (
              <View style={[styles.badge, styles.successBadge]}>
                <CheckCircle size={14} color="#16a34a" />
                <Text style={styles.successText}>Tamamlandı</Text>
              </View>
            ) : task.status === "pending_approval" ? (
              <View style={[styles.badge, styles.warningBadge]}>
                <Clock size={14} color="#d97706" />
                <Text style={styles.warningText}>Onay Bekliyor</Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.infoBadge]}>
                <Info size={14} color="#2563eb" />
                <Text style={styles.infoText}>Yapılacak</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{task.title}</Text>
          {task.description && (
            <Text style={styles.description}>{task.description}</Text>
          )}

          <View style={styles.pointsRow}>
            <Trophy size={20} color="#6366f1" />
            <Text style={styles.pointsText}>
              {task.points || 0} Puan Kazanılacak
            </Text>
          </View>
        </View>

        {/* Aksiyon Butonları */}
        <View style={styles.footer}>
          {loading ? (
            <HeartbeatLoader size={48} variant="full" />
          ) : (
            <>
              {/* ÇOCUK AKSİYONU: Görev beklemedeyse */}
              {!isAdmin && task.status === "pending" && (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleComplete}
                >
                  <CheckCircle size={20} color="#fff" />
                  <Text style={styles.btnText}>Görevi Tamamladım</Text>
                </TouchableOpacity>
              )}

              {/* EBEVEYN AKSİYONU: Onay bekliyorsa */}
              {isAdmin && task.status === "pending_approval" && (
                <View style={styles.adminActions}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, styles.approveBtn]}
                    onPress={handleApprove}
                  >
                    <CheckCircle size={20} color="#fff" />
                    <Text style={styles.btnText}>Onayla ve Puan Ver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={handleReject}
                  >
                    <XCircle size={20} color="#ef4444" />
                    <Text style={styles.rejectBtnText}>Görevi Reddet</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  content: { flex: 1, padding: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  statusBadge: { marginBottom: 16 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  successBadge: { backgroundColor: "#f0fdf4" },
  warningBadge: { backgroundColor: "#fffbeb" },
  infoBadge: { backgroundColor: "#eff6ff" },
  successText: { color: "#16a34a", fontSize: 12, fontWeight: "700" },
  warningText: { color: "#d97706", fontSize: 12, fontWeight: "700" },
  infoText: { color: "#2563eb", fontSize: 12, fontWeight: "700" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#64748b",
    lineHeight: 24,
    marginBottom: 24,
  },
  pointsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 20,
  },
  pointsText: { fontSize: 18, fontWeight: "700", color: "#6366f1" },
  footer: { marginTop: "auto", marginBottom: 20 },
  primaryBtn: {
    backgroundColor: "#6366f1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 18,
    borderRadius: 16,
  },
  approveBtn: { backgroundColor: "#10b981" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  adminActions: { gap: 12 },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 18,
    borderWidth: 2,
    borderColor: "#ef4444",
    borderRadius: 16,
  },
  rejectBtnText: { color: "#ef4444", fontSize: 16, fontWeight: "bold" },
});
