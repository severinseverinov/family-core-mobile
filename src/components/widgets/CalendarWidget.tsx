import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  PanResponder,
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
import { Cake, Star, Clock, Flag, Info } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { getPublicHolidays } from "../../services/events";

export default function CalendarWidget({
  events = [],
  countryCode = "DE",
}: {
  events: any[];
  countryCode?: string;
}) {
  const { colors, themeMode } = useTheme();
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly">(
    "weekly"
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [holidays, setHolidays] = useState<any[]>([]);

  useEffect(() => {
    getPublicHolidays(countryCode).then(setHolidays);
  }, [countryCode]);

  // Seçili güne ait tüm verileri (etkinlik + tatil) filtrele
  const activeDayData = useMemo(() => {
    const dayEvents = events.filter(e =>
      isSameDay(new Date(e.time), selectedDate)
    );
    const dayHoliday = holidays.find(h =>
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
      setSelectedDate(prev =>
        direction === "left" ? addWeeks(prev, 1) : subWeeks(prev, 1)
      );
    else if (viewMode === "monthly")
      setSelectedDate(prev =>
        direction === "left" ? addMonths(prev, 1) : subMonths(prev, 1)
      );
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) handleSwipe("left");
        else if (g.dx > 50) handleSwipe("right");
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

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
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {format(selectedDate, "EEEE", { locale: tr })}
          </Text>
        </View>
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
        {/* IZGARA GÖRÜNÜMLERİ (Aylık/Haftalık) */}
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
              const hasHoliday = holidays.some(h =>
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

      {/* GÜNLÜK ÖZET PANELİ (Seçili günün detayları burada yazar) */}
      <View style={[styles.detailsArea, { borderTopColor: colors.border }]}>
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
                  <Text style={[styles.timeLabel, { color: colors.primary }]}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { margin: 12, padding: 16 },
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
  // Detay Paneli Stilleri
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
