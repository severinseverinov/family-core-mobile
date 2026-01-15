import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  PanResponder,
  ActivityIndicator,
} from "react-native";
import {
  format,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  eachHourOfInterval,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
} from "date-fns";
import { tr } from "date-fns/locale";
import { Clock, Flag, Info, MapPin } from "lucide-react-native";
import * as Location from "expo-location";
import { useTheme } from "../../contexts/ThemeContext";
import { getPublicHolidays } from "../../services/events";

export default function CalendarWidget({
  events = [],
  countryCode, // Opsiyonel prop
}: {
  events: any[];
  countryCode?: string;
}) {
  const { colors, themeMode } = useTheme();
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly">(
    "weekly"
  );
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Varsayılan olarak NULL yapıyoruz, böylece "TR" yazısı peşinen çıkmaz.
  const [activeCountryCode, setActiveCountryCode] = useState<string | null>(
    countryCode || null
  );
  const [locationLabel, setLocationLabel] =
    useState<string>("Konum Alınıyor...");
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);

  // 1. KONUM TESPİTİ (FamilyWidget Mantığı)
  useEffect(() => {
    // Eğer prop olarak ülke kodu verilmişse direkt onu kullan, konum arama.
    if (countryCode) {
      setActiveCountryCode(countryCode);
      setLocationLabel(countryCode); // Label olarak da kodu göster
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        // İzin kontrolü
        let { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          if (isMounted) {
            setLocationLabel("Konum İzni Yok");
            // İzin yoksa varsayılan olarak TR'ye dönebiliriz veya boş bırakabiliriz.
            // İşlevsellik için TR'ye dönüyoruz ama kullanıcıya izin yok diyoruz.
            setActiveCountryCode("TR");
          }
          return;
        }

        // Konumu al
        let location = await Location.getCurrentPositionAsync({});

        // Adres çözümleme
        let geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (isMounted && geocode.length > 0) {
          const address = geocode[0];

          // ISO Ülke Kodu (Örn: 'DE', 'US', 'TR')
          if (address.isoCountryCode) {
            setActiveCountryCode(address.isoCountryCode.toUpperCase());
          }

          // Şehir + Ülke bilgisini FamilyWidget ile aynı formatta göster
          if (address.city && address.country) {
            setLocationLabel(`${address.city}, ${address.country}`);
          } else if (address.city) {
            setLocationLabel(address.city);
          } else if (address.country) {
            setLocationLabel(address.country);
          }
        }
      } catch (error) {
        console.error("Konum hatası:", error);
        if (isMounted) {
          setLocationLabel("Konum Bulunamadı");
          setActiveCountryCode("TR"); // Hata durumunda fallback
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [countryCode]);

  // 2. TATİLLERİ ÇEKME
  useEffect(() => {
    if (activeCountryCode) {
      setLoadingHolidays(true);
      getPublicHolidays(activeCountryCode)
        .then(data => {
          setHolidays(data);
        })
        .catch(err => console.log("Tatiller çekilemedi:", err))
        .finally(() => setLoadingHolidays(false));
    }
  }, [activeCountryCode]);

  // Seçili gün verilerini hesapla
  const activeDayData = useMemo(() => {
    const dayEvents = events.filter(e =>
      isSameDay(new Date(e.time), selectedDate)
    );
    // Holidays dizisi boşsa veya undefined ise hata vermesin
    const dayHoliday = (holidays || []).find(h =>
      isSameDay(new Date(h.date), selectedDate)
    );
    return { dayHoliday, dayEvents };
  }, [selectedDate, events, holidays]);

  const handleSwipe = (direction: "left" | "right") => {
    if (viewMode === "daily")
      setSelectedDate(prev =>
        direction === "left" ? addDays(prev, 1) : subDays(prev, 1)
      );
    else if (viewMode === "weekly")
      setSelectedDate(prev => {
        const next =
          direction === "left" ? addWeeks(prev, 1) : subWeeks(prev, 1);
        return startOfWeek(next, { weekStartsOn: 1 });
      });
    else if (viewMode === "monthly")
      setSelectedDate(prev => {
        const next =
          direction === "left" ? addMonths(prev, 1) : subMonths(prev, 1);
        return startOfMonth(next);
      });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_, g) => {
          if (g.dx < -50) handleSwipe("left");
          else if (g.dx > 50) handleSwipe("right");
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [viewMode]
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderRadius: themeMode === "colorful" ? 25 : 20,
        },
      ]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {viewMode === "daily"
              ? format(selectedDate, "d MMMM yyyy", { locale: tr })
              : format(selectedDate, "MMMM yyyy", { locale: tr })}
          </Text>

          <View style={{ gap: 2 }}>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {format(selectedDate, "EEEE", { locale: tr })}
            </Text>
          </View>
        </View>

        {/* GÖRÜNÜM MODU SEÇİCİ */}
        <View
          style={[styles.toggleRow, { backgroundColor: colors.background }]}
        >
          {["daily", "weekly", "monthly"].map((m: any) => (
            <TouchableOpacity
              key={m}
              onPress={() => setViewMode(m)}
              style={[
                styles.modeBtn,
                viewMode === m && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.modeText,
                  { color: viewMode === m ? "#fff" : colors.textMuted },
                ]}
              >
                {m === "daily" ? "Gün" : m === "weekly" ? "Hafta" : "Ay"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View {...panResponder.panHandlers} style={styles.swipeContent}>
        {/* IZGARA GÖRÜNÜMLERİ */}
        {viewMode !== "daily" && (
          <View
            style={
              viewMode === "monthly" ? styles.monthGrid : styles.weekHeader
            }
          >
            {eachDayOfInterval({
              start:
                viewMode === "monthly"
                  ? startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 })
                  : startOfWeek(selectedDate, { weekStartsOn: 1 }),
              end:
                viewMode === "monthly"
                  ? endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 })
                  : endOfWeek(selectedDate, { weekStartsOn: 1 }),
            }).map((day, i) => {
              const isSelected = isSameDay(day, selectedDate);
              const hasHoliday = (holidays || []).some(h =>
                isSameDay(new Date(h.date), day)
              );
              const hasEvent = events.some(e =>
                isSameDay(new Date(e.time), day)
              );

              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => setSelectedDate(day)}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? "#fff" : colors.text },
                    ]}
                  >
                    {format(day, "d")}
                  </Text>
                  <View style={styles.iconRow}>
                    {hasHoliday && (
                      <Flag
                        size={8}
                        color={isSelected ? "#fff" : colors.error}
                      />
                    )}
                    {hasEvent && (
                      <Clock
                        size={8}
                        color={isSelected ? "#fff" : colors.primary}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* GÜNLÜK SAATLİK ÇİZELGE */}
        {viewMode === "daily" && (
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {eachHourOfInterval({
              start: startOfDay(selectedDate),
              end: endOfDay(selectedDate),
            })
              .filter(h => h.getHours() >= 7 && h.getHours() <= 23)
              .map((hour, i) => {
                const hourEvents = activeDayData.dayEvents.filter(
                  e => new Date(e.time).getHours() === hour.getHours()
                );
                return (
                  <View
                    key={i}
                    style={[
                      styles.hourRow,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[styles.hourLabel, { color: colors.textMuted }]}
                    >
                      {format(hour, "HH:00")}
                    </Text>
                    <View style={styles.eventSlot}>
                      {hourEvents.map((ev, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.eventPill,
                            { backgroundColor: colors.background },
                          ]}
                        >
                          <Text
                            style={[
                              styles.eventPillText,
                              { color: colors.text },
                            ]}
                          >
                            {ev.title}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
          </ScrollView>
        )}
      </View>

      {/* DETAY PANELİ */}
      <View style={[styles.detailsArea, { borderTopColor: colors.border }]}>
        {loadingHolidays ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            {activeDayData.dayHoliday && (
              <View style={styles.detailItem}>
                <Flag size={14} color={colors.error} />
                <Text
                  style={[
                    styles.detailText,
                    { color: colors.error, fontWeight: "700" },
                  ]}
                >
                  {activeDayData.dayHoliday.name} (Resmi Tatil)
                </Text>
              </View>
            )}

            {activeDayData.dayEvents.length > 0
              ? activeDayData.dayEvents.map((ev, idx) => (
                  <View key={idx} style={styles.detailItem}>
                    <Info size={14} color={colors.primary} />
                    <View>
                      <Text
                        style={[
                          styles.detailText,
                          { color: colors.text, fontWeight: "600" },
                        ]}
                      >
                        {ev.title}
                      </Text>
                      {ev.description && (
                        <Text
                          style={[
                            styles.subDetailText,
                            { color: colors.textMuted },
                          ]}
                        >
                          {ev.description}
                        </Text>
                      )}
                      <Text
                        style={[styles.timeLabel, { color: colors.primary }]}
                      >
                        {format(new Date(ev.time), "HH:mm")}
                      </Text>
                    </View>
                  </View>
                ))
              : !activeDayData.dayHoliday && (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    Bu gün için kayıtlı bir etkinlik yok.
                  </Text>
                )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 0,
    padding: 16,
    width: "100%",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  headerSub: { fontSize: 11, fontWeight: "400" },
  toggleRow: { flexDirection: "row", borderRadius: 10, padding: 2 },
  modeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  modeText: { fontSize: 11, fontWeight: "bold" },
  swipeContent: { marginBottom: 10 },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.2%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  dayText: { fontSize: 13, fontWeight: "500" },
  iconRow: { flexDirection: "row", gap: 2, marginTop: 2 },
  weekHeader: { flexDirection: "row", justifyContent: "space-between" },
  hourRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1 },
  hourLabel: { width: 40, fontSize: 11 },
  eventSlot: { flex: 1, flexDirection: "row", gap: 5 },
  eventPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  eventPillText: { fontSize: 11 },
  detailsArea: { borderTopWidth: 1, paddingTop: 15, marginTop: 5, gap: 10 },
  detailItem: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  detailText: { fontSize: 13 },
  subDetailText: { fontSize: 11, marginTop: 2 },
  timeLabel: { fontSize: 10, fontWeight: "bold", marginTop: 2 },
  emptyText: {
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 5,
  },
});
