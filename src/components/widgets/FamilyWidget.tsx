import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  Dimensions,
} from "react-native";
import * as Location from "expo-location";
import { MapPin, Quote } from "lucide-react-native";

interface FamilyWidgetProps {
  familyData: any;
  members: any[];
  userName: string;
  userAvatarUrl?: string;
}

const { width } = Dimensions.get("window");
const PLACEHOLDER_FAMILY_BG = require("../../../assets/icon.png");

export default function FamilyWidget({
  familyData,
  members,
  userName,
  userAvatarUrl,
}: FamilyWidgetProps) {
  const [locationName, setLocationName] = useState("Yükleniyor...");

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationName("Konum İzni Yok");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const address = geocode[0];
        setLocationName(`${address.city}, ${address.country}`);
      }
    })();
  }, []);

  const backgroundSource = familyData?.image_url
    ? { uri: familyData.image_url }
    : PLACEHOLDER_FAMILY_BG;

  return (
    <View style={styles.containerShadow}>
      <ImageBackground
        source={backgroundSource}
        style={styles.background}
        imageStyle={styles.backgroundImageStyle}
      >
        <View style={styles.overlay}>
          {/* 1. SATIR: Aile İsmi */}
          <View style={styles.headerRow}>
            <Text style={styles.familyName}>
              {familyData?.name || "Serbest Ailesi"}
            </Text>
          </View>

          {/* 2. SATIR: Kullanıcı ve Konum */}
          <View style={styles.userSection}>
            <View style={styles.avatarWrapper}>
              <Image
                source={
                  userAvatarUrl
                    ? { uri: userAvatarUrl }
                    : { uri: "https://via.placeholder.com/100" }
                }
                style={styles.mainAvatar}
              />
            </View>
            <View style={styles.userTextWrapper}>
              <Text style={styles.greetingText}>Hoş geldin, {userName} 👋</Text>
              <View style={styles.locationContainer}>
                <MapPin size={12} color="#f59e0b" />
                <Text style={styles.locationLabel}>{locationName}</Text>
              </View>
            </View>
          </View>

          {/* 3. SATIR: Motto (Altına ekstra boşluk eklendi) */}
          <View style={styles.mottoContainer}>
            <Quote size={12} color="#cbd5e1" style={styles.quoteIcon} />
            <Text style={styles.mottoText}>
              "Sebze ağırlıklı bir öğünle bedeninizi ödüllendirin."
            </Text>
          </View>

          {/* 4. SATIR: Üyeler ve Puanlar (Çizgi ve üst boşluk optimize edildi) */}
          <View style={styles.footerRow}>
            {members.slice(0, 4).map(member => (
              <View key={member.id} style={styles.memberBox}>
                <View style={styles.memberAvatarCircle}>
                  <Image
                    source={
                      member.avatar_url
                        ? { uri: member.avatar_url }
                        : { uri: "https://via.placeholder.com/50" }
                    }
                    style={styles.memberThumb}
                  />
                </View>
                <View style={styles.pointsTag}>
                  {/* Üye puanları gamification servisinden gelen veriye dayanır */}
                  <Text style={styles.pointsValue}>
                    {member.current_points || 0} P
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  containerShadow: {
    margin: 0,
    borderRadius: 32,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    backgroundColor: "#0f172a",
    width: "100%",
  },
  background: {
    width: "100%",
    height: 300,
    borderRadius: 32,
    overflow: "hidden",
  },
  backgroundImageStyle: { opacity: 0.55 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    padding: 24,
    justifyContent: "space-between",
  },

  headerRow: { alignItems: "center" },
  familyName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  userSection: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  avatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
    padding: 3,
  },
  mainAvatar: { width: "100%", height: "100%", borderRadius: 30 },
  userTextWrapper: { marginLeft: 16 },
  greetingText: { fontSize: 16, fontWeight: "500", color: "#ffffff" },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  locationLabel: {
    fontSize: 13,
    color: "#f59e0b",
    marginLeft: 5,
    fontWeight: "500",
  },

  // Motto: Altındaki çizgi ile arasına 'marginBottom' eklendi
  mottoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 14,
    borderRadius: 16,
    marginBottom: 20, // Çizgi ile motto arasındaki mesafe
  },
  quoteIcon: { marginTop: 2, marginRight: 8 },
  mottoText: {
    fontSize: 13,
    color: "#e2e8f0",
    fontStyle: "italic",
    flex: 1,
    lineHeight: 18,
  },

  // Alt Satır: Çizgi (borderTop) ve iç boşluk (paddingTop)
  footerRow: {
    flexDirection: "row",
    gap: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  memberBox: { alignItems: "center" },
  memberAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#f59e0b",
    padding: 2,
  },
  memberThumb: { width: "100%", height: "100%", borderRadius: 21 },
  pointsTag: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: -10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  pointsValue: { fontSize: 9, color: "#ffffff", fontWeight: "800" },
});
