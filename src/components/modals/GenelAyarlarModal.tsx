import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { X, Droplet, Settings, ChevronRight } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { getPreferences, updatePreferences } from "../../services/settings";
import { setupWaterRemindersForFamily } from "../../services/waterReminder";
import SelectionGroup from "../ui/SelectionGroup";

type GenelAyarlarModalProps = {
  visible: boolean;
  onClose: () => void;
  navigation: any;
};

export default function GenelAyarlarModal({
  visible,
  onClose,
  navigation,
}: GenelAyarlarModalProps) {
  const { colors, themeMode, setThemeMode } = useTheme();
  const [waterReminderEnabled, setWaterReminderEnabled] = useState(false);
  const [savingWaterReminder, setSavingWaterReminder] = useState(false);

  useEffect(() => {
    if (visible) {
      (async () => {
        const prefs = await getPreferences();
        if (prefs && "water_reminder_enabled" in prefs) {
          setWaterReminderEnabled(Boolean(prefs.water_reminder_enabled));
        }
      })();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Ayarlar</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ maxHeight: "80%" }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                Tema
              </Text>
              <SelectionGroup
                label="Görünüm Modu"
                options={[
                  { label: "Aydınlık", value: "light" },
                  { label: "Karanlık", value: "dark" },
                  { label: "Renkli", value: "colorful" },
                ]}
                selectedValue={themeMode}
                onSelect={(val: string) =>
                  setThemeMode(val as "light" | "dark" | "colorful")
                }
              />
            </View>

            <View
              style={[
                styles.itemContainer,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: waterReminderEnabled
                          ? "#3b82f620"
                          : colors.border + "40",
                      },
                    ]}
                  >
                    <Droplet
                      size={20}
                      color={waterReminderEnabled ? "#3b82f6" : colors.textMuted}
                    />
                  </View>
                  <View style={styles.itemText}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>
                      Su İçme Hatırlatıcısı
                    </Text>
                    <Text
                      style={[styles.itemDesc, { color: colors.textMuted }]}
                    >
                      Günlük su içme hatırlatıcıları
                    </Text>
                  </View>
                </View>
                <View style={styles.switchWrap}>
                  {savingWaterReminder ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                      style={{ marginRight: 8 }}
                    />
                  ) : null}
                  <Switch
                    value={waterReminderEnabled}
                    onValueChange={async (value) => {
                      setWaterReminderEnabled(value);
                      setSavingWaterReminder(true);
                      try {
                        const result =
                          await setupWaterRemindersForFamily(value);
                        if (!result.success && value) {
                          Alert.alert(
                            "Uyarı",
                            result.error ||
                              "Su içme hatırlatıcısı ayarlanamadı."
                          );
                          setWaterReminderEnabled(false);
                          return;
                        }
                        await updatePreferences({
                          waterReminderEnabled: value,
                        });
                        Alert.alert(
                          "Başarılı",
                          value
                            ? "Su içme hatırlatıcısı aktif edildi."
                            : "Su içme hatırlatıcısı kapatıldı."
                        );
                      } catch (e: any) {
                        Alert.alert(
                          "Hata",
                          e?.message ||
                            "Su içme hatırlatıcısı ayarlanamadı."
                        );
                        setWaterReminderEnabled(!value);
                      } finally {
                        setSavingWaterReminder(false);
                      }
                    }}
                    disabled={savingWaterReminder}
                    trackColor={{
                      false: colors.border,
                      true: colors.primary,
                    }}
                    thumbColor="#fff"
                    ios_backgroundColor={colors.border}
                  />
                </View>
              </View>
            </View>

            <View
              style={[
                styles.itemContainer,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  marginTop: 12,
                },
              ]}
            >
              <View style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: colors.primary + "20" },
                    ]}
                  >
                    <Settings size={20} color={colors.primary} />
                  </View>
                  <View style={styles.itemText}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>
                      Ekran yerleşimi ve tüm ayarlar
                    </Text>
                    <Text
                      style={[styles.itemDesc, { color: colors.textMuted }]}
                    >
                      Dil, para birimi, tema ve diğer tercihler
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    navigation.navigate("Settings");
                  }}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <ChevronRight size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "800" },
  section: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  itemContainer: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemText: { flex: 1 },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  itemDesc: { fontSize: 12, lineHeight: 16 },
  switchWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
