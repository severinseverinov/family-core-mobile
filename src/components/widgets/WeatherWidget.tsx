import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Snowflake,
} from "lucide-react-native";
import { fetchWeather } from "../../services/weather";
import { useTheme } from "../../contexts/ThemeContext"; //

export default function WeatherWidget() {
  const { colors, themeMode } = useTheme(); //

  const { data, isLoading } = useQuery({
    queryKey: ["weather"],
    queryFn: async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      let location = await Location.getCurrentPositionAsync({});
      return fetchWeather(location.coords.latitude, location.coords.longitude);
    },
    staleTime: 1000 * 60 * 30,
  });

  const getWeatherIcon = (main: string, size: number = 24) => {
    switch (main) {
      case "Clear":
        return <Sun size={size} color="#f59e0b" />;
      case "Rain":
        return <CloudRain size={size} color="#3b82f6" />;
      case "Thunderstorm":
        return <CloudLightning size={size} color="#6366f1" />;
      case "Snow":
        return <Snowflake size={size} color="#0ea5e9" />;
      default:
        return <Cloud size={size} color="#94a3b8" />;
    }
  };

  if (isLoading) return <ActivityIndicator color={colors.primary} />; //
  if (!data?.current || !data?.hourly) return null;

  const current = data.current;
  const hourlyItems = data.hourly.list.slice(0, 8); // Önümüzdeki 24 saati gösterir (3'er saatlik 8 öğe)

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card, //
          borderRadius: themeMode === "colorful" ? 25 : 20, //
        },
      ]}
    >
      {/* SOL: ANLIK DURUM (SABİT) */}
      <View
        style={[styles.currentSection, { borderRightColor: colors.border }]}
      >
        {getWeatherIcon(current.weather[0].main, 32)}
        <Text style={[styles.currentTemp, { color: colors.text }]}>
          {Math.round(current.main.temp)}°
        </Text>
        <Text style={[styles.conditionText, { color: colors.textMuted }]}>
          Şimdi
        </Text>
      </View>

      {/* SAĞ: SAATLİK TAHMİN (KAYDIRMALI) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hourlyList}
      >
        {hourlyItems.map((item: any, index: number) => (
          <View key={index} style={styles.hourlyItem}>
            <Text style={[styles.hourText, { color: colors.textMuted }]}>
              {item.dt_txt.split(" ")[1].substring(0, 5)}
            </Text>
            {getWeatherIcon(item.weather[0].main, 20)}
            <Text style={[styles.hourTemp, { color: colors.text }]}>
              {Math.round(item.main.temp)}°
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    alignItems: "center",
  },
  currentSection: {
    alignItems: "center",
    paddingRight: 15,
    borderRightWidth: 1,
    minWidth: 80,
  },
  currentTemp: {
    fontSize: 24,
    fontWeight: "300", // İnce font
    marginVertical: 4,
  },
  conditionText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  hourlyList: {
    paddingLeft: 15,
    gap: 20, // Saatler arası boşluk
  },
  hourlyItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 45,
  },
  hourText: {
    fontSize: 10,
    fontWeight: "500",
    marginBottom: 6,
  },
  hourTemp: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 6,
  },
});
