import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { PawPrint, Heart, ChevronRight } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface PetWidgetProps {
  pets: any[];
  hideHeader?: boolean;
}

export default function PetWidget({
  pets,
  hideHeader = false,
}: PetWidgetProps) {
  const { colors, themeMode } = useTheme();

  return (
    <View>
      {!hideHeader && (
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>
            Evcil Hayvanlar
          </Text>
          <TouchableOpacity>
            <Text style={{ color: colors.primary }}>Yönet</Text>
          </TouchableOpacity>
        </View>
      )}
      {pets.map((pet: any) => (
        <TouchableOpacity
          key={pet.id}
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: themeMode === "colorful" ? 28 : 16,
            },
          ]}
        >
          <View style={styles.cardMain}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: pet.avatar_url }} style={styles.petImage} />
              <View style={styles.heartBadge}>
                <Heart size={10} color="#ef4444" fill="#ef4444" />
              </View>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]}>
                {pet.name}
              </Text>
              <Text style={[styles.breed, { color: colors.textMuted }]}>
                {pet.breed}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.border} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: "700" },
  card: { padding: 16, marginBottom: 12, elevation: 3 },
  cardMain: { flexDirection: "row", alignItems: "center" },
  avatarContainer: { width: 60, height: 60, position: "relative" },
  petImage: { width: "100%", height: "100%", borderRadius: 30 },
  heartBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 4,
    borderRadius: 10,
  },
  info: { flex: 1, marginLeft: 16 },
  name: { fontSize: 18, fontWeight: "800" },
  breed: { fontSize: 13, marginTop: 2 },
});
