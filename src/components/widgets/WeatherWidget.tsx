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
  CloudOff,
} from "lucide-react-native";
import { fetchWeather } from "../../services/weather";
import { useTheme } from "../../contexts/ThemeContext"; //
import { addDays, isSameDay, startOfDay } from "date-fns";

type WeatherWidgetProps = {
  selectedDate?: Date;
};

export default function WeatherWidget({ selectedDate }: WeatherWidgetProps) {
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

  const current = data?.current;
  const selected = selectedDate
    ? startOfDay(selectedDate)
    : startOfDay(new Date());
  const today = startOfDay(new Date());
  const maxDate = startOfDay(addDays(today, 7));
  const isInRange = selected >= today && selected <= maxDate;

  const hourlyItems = React.useMemo(() => {
    if (!isInRange) return [];
    const list = data?.hourly?.list || [];
    const expanded: any[] = [];
    for (let i = 0; i < list.length; i++) {
      const base = list[i];
      const baseDate = new Date(base.dt_txt);
      for (let h = 0; h < 3; h++) {
        const hourDate = new Date(baseDate);
        hourDate.setHours(baseDate.getHours() + h);
        expanded.push({
          ...base,
          __date: hourDate,
          dt_txt: hourDate.toISOString().replace("T", " ").slice(0, 16),
        });
      }
    }
    const now = new Date();
    return expanded.filter(item => {
      const itemDate = item.__date as Date;
      if (!isSameDay(itemDate, selected)) return false;
      if (isSameDay(selected, now)) {
        return itemDate.getTime() >= now.getTime();
      }
      return true;
    });
  }, [data?.hourly?.list, isInRange, selected]);

  const summaryItem = isSameDay(selected, today)
    ? current
    : hourlyItems[0] || null;
  const summaryTemp = summaryItem?.main?.temp;
  const summaryMain =
    summaryItem?.weather?.[0]?.main || current?.weather?.[0]?.main;
  const summaryLabel = isSameDay(selected, today)
    ? "Bugün"
    : selected.toLocaleDateString("tr-TR", { weekday: "short" });

  if (isLoading) return <ActivityIndicator color={colors.primary} />; //
  const hasWeatherData = Boolean(current && data?.hourly);

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
        {hasWeatherData && summaryMain ? (
          getWeatherIcon(summaryMain, 32)
        ) : (
          <CloudOff size={32} color={colors.textMuted} />
        )}
        <Text style={[styles.currentTemp, { color: colors.text }]}>
          {typeof summaryTemp === "number" ? Math.round(summaryTemp) : "--"}°
        </Text>
        <Text style={[styles.conditionText, { color: colors.textMuted }]}>
          {summaryLabel}
        </Text>
      </View>

      {/* SAĞ: SAATLİK TAHMİN (KAYDIRMALI) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hourlyList}
      >
        {!hasWeatherData || hourlyItems.length === 0 ? (
          <View style={styles.emptyHourly}>
            <CloudOff size={18} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Bu gün için saatlik hava durumu yok.
            </Text>
          </View>
        ) : (
          hourlyItems.map((item: any, index: number) => (
            <View key={index} style={styles.hourlyItem}>
              <Text style={[styles.hourText, { color: colors.textMuted }]}>
                {item.dt_txt.split(" ")[1].substring(0, 5)}
              </Text>
              {getWeatherIcon(item.weather[0].main, 20)}
              <Text style={[styles.hourTemp, { color: colors.text }]}>
                {Math.round(item.main.temp)}°
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 16,
    width: "100%",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
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
  emptyHourly: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    minHeight: 60,
    gap: 6,
  },
  emptyText: { fontSize: 12, textAlign: "center" },
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
