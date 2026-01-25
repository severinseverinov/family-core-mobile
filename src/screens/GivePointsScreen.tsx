import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import HeartbeatLoader from "../components/ui/HeartbeatLoader";
import { getLeaderboard, givePoints } from "../services/gamification"; // Dosya yolunu kontrol edin

const GivePointsScreen = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { users } = await getLeaderboard();
      // Sadece 'member' rolündeki çocukları filtreleyebilirsiniz
      setMembers(users || []);
    } catch (error) {
      Alert.alert("Hata", "Üyeler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleGivePoints = async () => {
    if (!selectedUserId || !amount || !reason) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }

    const result = await givePoints(selectedUserId, parseInt(amount), reason);

    if (result.success) {
      Alert.alert("Başarılı", `${amount} puan verildi!`);
      setAmount("");
      setReason("");
      fetchMembers(); // Listeyi güncelle
    } else {
      Alert.alert("Hata", result.error || "İşlem başarısız.");
    }
  };

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <HeartbeatLoader size={56} variant="full" />
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Puan Ver</Text>

      <Text style={styles.label}>Üye Seçin:</Text>
      <FlatList
        data={members}
        horizontal
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.memberCard,
              selectedUserId === item.id && styles.selectedCard,
            ]}
            onPress={() => setSelectedUserId(item.id)}
          >
            <Text>{item.full_name}</Text>
            <Text style={{ fontSize: 10 }}>{item.current_points} P</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.inputGroup}>
        <TextInput
          placeholder="Puan Miktarı (Örn: 50)"
          style={styles.input}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          placeholder="Verilme Sebebi (Örn: Ödev yapıldı)"
          style={styles.input}
          value={reason}
          onChangeText={setReason}
        />
        <TouchableOpacity style={styles.button} onPress={handleGivePoints}>
          <Text style={styles.buttonText}>Puanı Gönder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  label: { fontSize: 16, marginBottom: 10 },
  memberCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 10,
    borderRadius: 10,
    height: 70,
  },
  selectedCard: { borderColor: "#007AFF", backgroundColor: "#E3F2FD" },
  inputGroup: { marginTop: 30 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
});

export default GivePointsScreen;
