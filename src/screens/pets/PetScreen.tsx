import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  RefreshControl,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import HeartbeatLoader from "../../components/ui/HeartbeatLoader";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import QRCode from "react-native-qrcode-svg"; // QR KOD KÜTÜPHANESİ
import {
  CheckCircle,
  Clock,
  Camera,
  X,
  AlertCircle,
  Plus,
  Activity,
  Ruler,
  Syringe,
  Calendar,
  ChevronRight,
  Edit2,
  Save,
  Phone,
  MapPin,
  QrCode,
  Info,
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import ModernInput from "../../components/ui/ModernInput";
import SelectionGroup from "../../components/ui/SelectionGroup";
// Servisler
import {
  getPets,
  getRoutinesWithStatus,
  addRoutine,
  completeRoutine,
  reviewRoutine,
  getPetHealthDetails,
  addPetHealthLog,
  addPetVaccination,
  updatePet, // YENİ EKLENDİ
} from "../../services/pets";
import { getFamilyMembers } from "../../services/family";

const { width } = Dimensions.get("window");

export default function PetScreen({ navigation }: any) {
  const { colors, themeMode } = useTheme();
  const isLight = themeMode === "light";
  const { profile } = useAuth();
  const isParent = ["owner", "admin"].includes(profile?.role || "");

  // --- DATA STATES ---
  const [pets, setPets] = useState<any[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- UI STATES ---
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

  // --- MODAL STATES ---
  const [addRoutineVisible, setAddRoutineVisible] = useState(false);
  const [healthModalVisible, setHealthModalVisible] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [addHealthLogVisible, setAddHealthLogVisible] = useState(false);
  const [petProfileVisible, setPetProfileVisible] = useState(false); // YENİ: Profil Modalı

  // --- FORM & TEMP STATES ---
  const [uploading, setUploading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);

  // Pet Düzenleme State'leri
  const [editPetData, setEditPetData] = useState<any>({});
  const [profileTab, setProfileTab] = useState<"info" | "qr">("info");

  // Yeni Rutin Formu vb. (Önceki kodlarla aynı)
  const [newRoutine, setNewRoutine] = useState({
    title: "",
    points: "10",
    recurrence: "daily",
    time: "09:00",
    assignees: [] as string[],
  });
  const [healthDetails, setHealthDetails] = useState<{
    vaccines: any[];
    logs: any[];
  }>({ vaccines: [], logs: [] });
  const [newHealthLog, setNewHealthLog] = useState({
    type: "vaccine",
    title: "",
    date: "",
    value: "",
    description: "",
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    if (selectedPetId && healthModalVisible) {
      loadHealthData(selectedPetId);
    }
  }, [selectedPetId, healthModalVisible]);

  const loadData = async () => {
    setLoading(true);
    const [petsRes, routinesRes, membersRes] = await Promise.all([
      getPets(),
      getRoutinesWithStatus(),
      getFamilyMembers(),
    ]);

    const petsData = petsRes.data || [];
    setPets(petsData);
    setRoutines(routinesRes.data || []);
    setFamilyMembers(membersRes.members || []);

    if (petsData.length > 0 && !selectedPetId) {
      setSelectedPetId(petsData[0].id);
    }

    const pending =
      routinesRes.data?.filter((r: any) => r.log?.status === "pending") || [];
    setPendingReviews(pending);

    setLoading(false);
    setRefreshing(false);
  };

  const loadHealthData = async (petId: string) => {
    const res = await getPetHealthDetails(petId);
    setHealthDetails(res);
  };

  // --- PET PROFIL & GÜNCELLEME ---
  const handlePetClick = (pet: any) => {
    // Eğer zaten seçiliyse detayı aç, değilse seç
    if (selectedPetId === pet.id) {
      setEditPetData({ ...pet });
      setProfileTab("info");
      setPetProfileVisible(true);
    } else {
      setSelectedPetId(pet.id);
    }
  };

  const handleUpdatePet = async () => {
    setUploading(true);
    const res = await updatePet(editPetData.id, {
      name: editPetData.name,
      breed: editPetData.breed,
      gender: editPetData.gender,
      birth_date: editPetData.birth_date,
      type: editPetData.type,
    });
    setUploading(false);

    if (res.success) {
      Alert.alert("Başarılı", "Bilgiler güncellendi.");
      loadData(); // Listeyi yenile
      // Modalı kapatmıyoruz, kullanıcı görsün diye
    } else {
      Alert.alert("Hata", res.error);
    }
  };

  // --- ACTIONS (Routine, Health, Photo logic - Önceki kodlarla aynı) ---
  const handleCreateRoutine = async () => {
    if (!newRoutine.title || !selectedPetId)
      return Alert.alert("Eksik", "Görev adı gerekli.");
    if (!/^\d{2}:\d{2}$/.test(newRoutine.time)) {
      Alert.alert("Hata", "Saat formatı HH:MM olmalı.");
      return;
    }
    setUploading(true);
    const res = await addRoutine(
      selectedPetId,
      newRoutine.title,
      Number(newRoutine.points),
      newRoutine.recurrence,
      newRoutine.assignees,
      newRoutine.time
    );
    setUploading(false);
    if (res.success) {
      setAddRoutineVisible(false);
      loadData();
      Alert.alert("Başarılı", "Rutin eklendi.");
    } else Alert.alert("Hata", res.error);
  };

  const handleAddHealthRecord = async () => {
    if (!newHealthLog.title) return Alert.alert("Hata", "Başlık gerekli.");
    setUploading(true);
    let res;
    if (newHealthLog.type === "vaccine") {
      const today = new Date().toISOString().slice(0, 10);
      res = await addPetVaccination(
        selectedPetId!,
        newHealthLog.title,
        today,
        newHealthLog.date || undefined
      );
    } else {
      res = await addPetHealthLog(
        selectedPetId!,
        newHealthLog.type,
        newHealthLog.title,
        newHealthLog.value,
        newHealthLog.description
      );
    }
    setUploading(false);
    if (res.success) {
      setAddHealthLogVisible(false);
      setNewHealthLog({
        type: "vaccine",
        title: "",
        date: "",
        value: "",
        description: "",
      });
      if (selectedPetId) loadHealthData(selectedPetId);
      Alert.alert("Kaydedildi", "Sağlık kaydı eklendi.");
    } else Alert.alert("Hata", res.error);
  };

  const handleTaskPress = async (routine: any) => {
    setSelectedItem(routine);
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) {
      setCapturedImage(result.assets[0].uri);
      setPhotoModalVisible(true);
    }
  };

  const submitProof = async () => {
    setUploading(true);
    const res = await completeRoutine(selectedItem.id, capturedImage!);
    setUploading(false);
    setPhotoModalVisible(false);
    if (res.success) {
      Alert.alert("Gönderildi", "Onay bekliyor.");
      loadData();
    }
  };

  const handleReviewPress = (item: any) => {
    if (!isParent) return;
    setSelectedItem(item);
    setReviewModalVisible(true);
  };
  const submitReview = async (status: "approved" | "rejected") => {
    setUploading(true);
    const res = await reviewRoutine(
      selectedItem.log.id,
      status,
      selectedItem.points,
      selectedItem.log.user_id
    );
    setUploading(false);
    setReviewModalVisible(false);
    if (res.success) loadData();
    else Alert.alert("Hata", "İşlem yapılamadı.");
  };

  // --- QR DATA GENERATOR ---
  const getQrData = () => {
    // vCard formatında QR oluşturuyoruz. Telefon kamerası okuyunca direkt rehbere ekler veya arar.
    const ownerPhone = profile?.phone || "Numara Yok";
    return `BEGIN:VCARD
VERSION:3.0
FN:Kayıp Pet - ${editPetData.name}
TEL;TYPE=CELL:${ownerPhone}
NOTE:Ben kayboldum! Sahibim: ${profile?.full_name}. Lütfen arayın.
END:VCARD`;
  };

  // --- RENDERERS ---
  const filteredRoutines = routines.filter(r => r.pet_id === selectedPetId);
  const selectedPet = pets.find(p => p.id === selectedPetId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER & STORIES */}
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <View style={styles.textHeader}>
              <Text style={[styles.mainTitle, { color: colors.text }]}>
                Evcil Dostlarımız
              </Text>
              <Text style={[styles.subTitle, { color: colors.textMuted }]}>
                Bakım ve Sağlık Rutinleri
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesContainer}
          >
            {pets.map(pet => {
              const isSelected = pet.id === selectedPetId;
              return (
                <TouchableOpacity
                  key={pet.id}
                  onPress={() => handlePetClick(pet)}
                  style={styles.storyItem}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.storyRing,
                      isSelected
                        ? { borderColor: colors.primary, borderWidth: 2.5 }
                        : { borderColor: "transparent", borderWidth: 2.5 },
                    ]}
                  >
                    <Image
                      source={
                        pet.image_url
                          ? { uri: pet.image_url }
                          : require("../../../assets/icon.png")
                      }
                      style={styles.storyImage}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.storyName,
                      {
                        color: isSelected ? colors.primary : colors.text,
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}
                  >
                    {pet.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {isParent && (
              <TouchableOpacity
                style={styles.storyItem}
                onPress={() => navigation.navigate("AddPet")}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.addStoryRing, { borderColor: colors.border }]}
                >
                  <Plus color={colors.textMuted} size={24} />
                </View>
                <Text style={[styles.storyName, { color: colors.textMuted }]}>
                  Yeni Ekle
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* SEÇİLİ PET BİLGİ KARTI */}
        {selectedPet && (
          <View
            style={[
              styles.petInfoCard,
              isLight && styles.surfaceLift,
              { backgroundColor: colors.card, shadowColor: "#000" },
            ]}
          >
            <View style={styles.petInfoText}>
              <Text style={[styles.petInfoName, { color: colors.text }]}>
                {selectedPet.name}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                {selectedPet.breed || "Melez"} • {selectedPet.gender || ""} •{" "}
                {selectedPet.type}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.healthBtn, { backgroundColor: "#fee2e2" }]}
              onPress={() => setHealthModalVisible(true)}
            >
              <Activity color="#ef4444" size={18} />
              <Text style={styles.healthBtnText}>Sağlık Kartı</Text>
              <ChevronRight color="#ef4444" size={14} />
            </TouchableOpacity>
          </View>
        )}

        {/* ONAY BEKLEYENLER */}
        {isParent && pendingReviews.length > 0 && (
          <View style={styles.alertSection}>
            <View style={styles.alertHeader}>
              <AlertCircle color="#c2410c" size={20} />
              <Text style={styles.alertTitle}>
                Onay Bekleyenler ({pendingReviews.length})
              </Text>
            </View>
    <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 10 }}
            >
              {pendingReviews.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.pendingCard, { backgroundColor: colors.card }]}
                  onPress={() => handleReviewPress(item)}
                >
                  <Text style={[styles.pendingText, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.primary }}>
                    İncele
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* RUTİN LİSTESİ */}
        <View style={styles.listHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {selectedPet ? `${selectedPet.name} • Günlük Rutinler` : "Günlük Rutinler"}
          </Text>
          {isParent && selectedPetId && (
            <TouchableOpacity onPress={() => setAddRoutineVisible(true)}>
              <Text style={{ color: colors.primary, fontWeight: "bold" }}>
                + Rutin Ekle
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {filteredRoutines.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock
              size={40}
              color={colors.textMuted}
              style={{ opacity: 0.5 }}
            />
            <Text style={{ color: colors.textMuted, marginTop: 10 }}>
              Bugün için planlanmış rutin yok.
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredRoutines.map(item => {
              const isDone = item.log?.status === "approved";
              const isPending = item.log?.status === "pending";
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.taskCard,
                    isLight && styles.surfaceLift,
                    { backgroundColor: colors.card, opacity: isDone ? 0.6 : 1 },
                  ]}
                  onPress={() => !isDone && !isPending && handleTaskPress(item)}
                  disabled={isDone || isPending}
                >
                  <View style={styles.taskLeft}>
                    <View
                      style={[
                        styles.taskIconBg,
                        {
                          backgroundColor: isDone
                            ? "#dcfce7"
                            : colors.background,
                        },
                      ]}
    >
                      {isDone ? (
                        <CheckCircle size={20} color="#10b981" />
                      ) : (
                        <Clock size={20} color={colors.textMuted} />
                      )}
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text
                        style={[
                          styles.taskTitle,
                          {
                            color: colors.text,
                            textDecorationLine: isDone
                              ? "line-through"
                              : "none",
                          },
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                        {item.points} Puan •{" "}
                        {item.recurrence_type === "weekly"
                          ? "Haftalık"
                          : "Günlük"}
                      </Text>
                    </View>
                  </View>
                  {!isDone && !isPending && (
                    <View
                      style={[styles.cameraBtn, { borderColor: colors.border }]}
                    >
                      <Camera color={colors.textMuted} size={18} />
                    </View>
                  )}
                  {isPending && (
                    <Text
                      style={{
                        fontSize: 10,
                        color: "#f59e0b",
                        fontWeight: "bold",
                      }}
                    >
                      Onay Bekliyor
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* --- YENİ: PET PROFİL & DİJİTAL KÜNYE MODALI --- */}
        <Modal
          visible={petProfileVisible}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View
            style={[styles.fullModal, { backgroundColor: colors.background }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitleBig, { color: colors.text }]}>
                Pet Profili
              </Text>
              <TouchableOpacity onPress={() => setPetProfileVisible(false)}>
                <X color={colors.text} size={28} />
              </TouchableOpacity>
            </View>

            {/* Sekmeler */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  profileTab === "info" && {
                    backgroundColor: colors.card,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setProfileTab("info")}
              >
                <Info
                  size={18}
                  color={
                    profileTab === "info" ? colors.primary : colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        profileTab === "info"
                          ? colors.primary
                          : colors.textMuted,
                    },
                  ]}
                >
                  Bilgiler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  profileTab === "qr" && {
                    backgroundColor: colors.card,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setProfileTab("qr")}
              >
                <QrCode
                  size={18}
                  color={
                    profileTab === "qr" ? colors.primary : colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        profileTab === "qr" ? colors.primary : colors.textMuted,
                    },
                  ]}
                >
                  Dijital Künye
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {profileTab === "info" ? (
                /* BİLGİ DÜZENLEME FORMU */
                <View style={{ gap: 15 }}>
                  <View style={{ alignItems: "center", marginBottom: 20 }}>
                    <Image
                      source={
                        editPetData.image_url
                          ? { uri: editPetData.image_url }
                          : require("../../../assets/icon.png")
                      }
                      style={{ width: 100, height: 100, borderRadius: 50 }}
                    />
                  </View>
                  <ModernInput
                    label="İsim"
                    value={editPetData.name}
                    onChangeText={t =>
                      setEditPetData({ ...editPetData, name: t })
                    }
                  />
                  <ModernInput
                    label="Cinsi (Irkı)"
                    value={editPetData.breed}
                    onChangeText={t =>
                      setEditPetData({ ...editPetData, breed: t })
                    }
                  />
                  <ModernInput
                    label="Doğum Tarihi"
                    value={editPetData.birth_date}
                    onChangeText={t =>
                      setEditPetData({ ...editPetData, birth_date: t })
                    }
                    placeholder="YYYY-AA-GG"
                  />
                  <SelectionGroup
                    label="CİNSİYET"
                    options={[
                      { label: "Dişi", value: "Dişi" },
                      { label: "Erkek", value: "Erkek" },
                    ]}
                    selectedValue={editPetData.gender}
                    onSelect={v =>
                      setEditPetData({ ...editPetData, gender: v })
                    }
                  />

                  {isParent && (
                    <TouchableOpacity
                      style={[
                        styles.saveBtn,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={handleUpdatePet}
                    >
                      {uploading ? (
                        <HeartbeatLoader size={22} variant="inline" />
                      ) : (
                        <>
                          <Save size={20} color="#fff" />
                          <Text style={styles.saveBtnText}>
                            Değişiklikleri Kaydet
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                /* DİJİTAL KÜNYE (QR) */
                <View
                  style={[
                    styles.qrCard,
                    isLight && styles.surfaceLift,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <View style={styles.qrHeader}>
                    <AlertCircle color="#ef4444" size={24} />
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        color: "#ef4444",
                        marginLeft: 10,
                      }}
                    >
                      Kayıp Durumunda
                    </Text>
                  </View>
                  <Text
                    style={{
                      textAlign: "center",
                      color: colors.textMuted,
                      marginBottom: 20,
                    }}
                  >
                    Bu kodu taratan kişi doğrudan ebeveyne ulaşabilir.
                  </Text>

                  <View
                    style={{
                      alignItems: "center",
                      padding: 20,
                      backgroundColor: "#fff",
                      borderRadius: 20,
                    }}
                  >
                    <QRCode value={getQrData()} size={200} />
                  </View>

                  <View
                    style={{
                      marginTop: 30,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                    }}
                  >
                    <Phone color={colors.primary} />
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      {profile?.phone || "Numara Yok"}
                    </Text>
                  </View>
                  <Text
                    style={{
                      textAlign: "center",
                      color: colors.textMuted,
                      marginTop: 5,
                    }}
                  >
                    Ebeveyn İletişim Numarası
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* --- DİĞER MODALLAR (AYNI) --- */}
        <Modal visible={healthModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContentLarge,
                { backgroundColor: colors.card },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitleBig, { color: colors.text }]}>
                  Sağlık Geçmişi
                </Text>
                <TouchableOpacity onPress={() => setHealthModalVisible(false)}>
                  <X color={colors.text} size={28} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20 }}>
              <View style={styles.healthSection}>
                <View style={styles.hSectionHeader}>
                  <Text style={[styles.hSectionTitle, { color: colors.text }]}>
                    💉 Aşı Takvimi
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setNewHealthLog(p => ({ ...p, type: "vaccine" }));
                      setAddHealthLogVisible(true);
                    }}
                  >
                    <Plus color={colors.primary} size={20} />
                  </TouchableOpacity>
                </View>
                {healthDetails.vaccines.length === 0 && (
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    Kayıt yok.
                  </Text>
                )}
                {healthDetails.vaccines.map((v, i) => (
                  <View
                    key={i}
                    style={[
                      styles.healthItem,
                      isLight && styles.surfaceLift,
                      { backgroundColor: colors.card },
                    ]}
                  >
                    <View>
                      <Text style={{ fontWeight: "bold", color: colors.text }}>
                        {v.name}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                        {v.date_administered}
                      </Text>
                    </View>
                    {v.next_due_date && (
                      <View style={styles.dueDateBadge}>
                        <Text
                          style={{
                            color: "#ef4444",
                            fontSize: 10,
                            fontWeight: "bold",
                          }}
                        >
                          Sonraki: {v.next_due_date}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
              <View style={styles.healthSection}>
                <View style={styles.hSectionHeader}>
                  <Text style={[styles.hSectionTitle, { color: colors.text }]}>
                    🏥 Operasyon & İlaç
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setNewHealthLog(p => ({ ...p, type: "surgery" }));
                      setAddHealthLogVisible(true);
                    }}
                  >
                    <Plus color={colors.primary} size={20} />
                  </TouchableOpacity>
                </View>
                {healthDetails.logs
                  .filter((l: any) => l.type !== "measurement")
                  .map((l: any, i: number) => (
                    <View
                      key={i}
                      style={[
                        styles.healthItem,
                        isLight && styles.surfaceLift,
                        { backgroundColor: colors.card },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ fontWeight: "bold", color: colors.text }}
                        >
                          {l.title}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                          {l.description || l.value}
                        </Text>
                      </View>
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                        {l.date?.slice(0, 10)}
                      </Text>
                    </View>
                  ))}
              </View>
              <View style={styles.healthSection}>
                <View style={styles.hSectionHeader}>
                  <Text style={[styles.hSectionTitle, { color: colors.text }]}>
                    ⚖️ Boy & Kilo
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setNewHealthLog(p => ({ ...p, type: "measurement" }));
                      setAddHealthLogVisible(true);
                    }}
                  >
                    <Plus color={colors.primary} size={20} />
                  </TouchableOpacity>
                </View>
                {healthDetails.logs.filter((l: any) => l.type === "measurement")
                  .length === 0 && (
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    Kayıt yok.
                  </Text>
                )}
                {healthDetails.logs
                  .filter((l: any) => l.type === "measurement")
                  .map((l: any, i: number) => (
                    <View
                      key={i}
                      style={[
                        styles.healthItem,
                        isLight && styles.surfaceLift,
                        { backgroundColor: colors.card },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "bold", color: colors.text }}>
                          {l.title}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                          {l.value || l.description}
                        </Text>
                      </View>
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                        {l.date?.slice(0, 10)}
                      </Text>
                    </View>
                  ))}
              </View>
              </ScrollView>
              <Modal
                visible={addHealthLogVisible}
                transparent
                animationType="fade"
              >
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
              >
                <ScrollView
                  contentContainerStyle={styles.modalOverlay}
                  keyboardShouldPersistTaps="handled"
                >
                  <View
                    style={[
                      styles.modalContent,
                      { backgroundColor: colors.card },
                    ]}
                  >
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Kayıt Ekle
                  </Text>
                  <SelectionGroup
                    label="TÜR"
                    options={[
                      { label: "Aşı", value: "vaccine" },
                      { label: "Ameliyat/İlaç", value: "surgery" },
                      { label: "Ölçüm", value: "measurement" },
                    ]}
                    selectedValue={newHealthLog.type}
                    onSelect={v => setNewHealthLog(p => ({ ...p, type: v }))}
                  />
                  <ModernInput
                    label="Başlık / İsim"
                    value={newHealthLog.title}
                    onChangeText={t =>
                      setNewHealthLog(p => ({ ...p, title: t }))
                    }
                  />
                  {newHealthLog.type === "vaccine" && (
                    <ModernInput
                      label="Sonraki Tarih"
                      value={newHealthLog.date}
                      onChangeText={t =>
                        setNewHealthLog(p => ({ ...p, date: t }))
                      }
                      placeholder="YYYY-AA-GG"
                    />
                  )}
                  {newHealthLog.type !== "vaccine" && (
                    <ModernInput
                      label="Değer / Açıklama"
                      value={newHealthLog.value}
                      onChangeText={t =>
                        setNewHealthLog(p => ({ ...p, value: t }))
                      }
                    />
                  )}
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[
                        styles.modalBtn,
                        { backgroundColor: colors.border },
                      ]}
                      onPress={() => setAddHealthLogVisible(false)}
                    >
                      <Text style={{ color: colors.text }}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modalBtn,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={handleAddHealthRecord}
                    >
                      {uploading ? (
                        <HeartbeatLoader size={22} variant="inline" />
                      ) : (
                        <Text style={{ color: "#fff", fontWeight: "bold" }}>
                          Kaydet
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
              </Modal>
            </View>
          </View>
        </Modal>

        {/* FOTO & REVIEW MODALS (Aynı) */}
        <Modal visible={addRoutineVisible} transparent animationType="fade">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.modalOverlay}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={[styles.modalContent, { backgroundColor: colors.card }]}
              >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedPet ? `${selectedPet.name} • Rutin Ekle` : "Rutin Ekle"}
              </Text>
              <ModernInput
                label="Görev Adı"
                value={newRoutine.title}
                onChangeText={t => setNewRoutine(p => ({ ...p, title: t }))}
              />
              <ModernInput
                label="Puan"
                value={newRoutine.points}
                onChangeText={t => setNewRoutine(p => ({ ...p, points: t }))}
                keyboardType="numeric"
              />
              <ModernInput
                label="Saat (HH:MM)"
                value={newRoutine.time}
                onChangeText={t => setNewRoutine(p => ({ ...p, time: t }))}
                placeholder="09:00"
              />
              <SelectionGroup
                label="TEKRAR"
                options={[
                  { label: "Günlük", value: "daily" },
                  { label: "Haftalık", value: "weekly" },
                  { label: "Aylık", value: "monthly" },
                ]}
                selectedValue={newRoutine.recurrence}
                onSelect={v => setNewRoutine(p => ({ ...p, recurrence: v }))}
              />
              {familyMembers.length > 0 && (
                <View style={{ marginTop: 6 }}>
                  <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                    KİME ATANACAK?
                  </Text>
                  <View style={styles.assigneeRow}>
                    {familyMembers.map(member => {
                      const isActive = newRoutine.assignees.includes(member.id);
                      return (
                        <TouchableOpacity
                          key={member.id}
                          style={[
                            styles.assigneeChip,
                            isActive && {
                              backgroundColor: colors.primary,
                              borderColor: colors.primary,
                            },
                          ]}
                          onPress={() =>
                            setNewRoutine(p => ({
                              ...p,
                              assignees: isActive
                                ? p.assignees.filter(id => id !== member.id)
                                : [...p.assignees, member.id],
                            }))
                          }
                        >
                          <Text
                            style={[
                              styles.assigneeText,
                              { color: isActive ? "#fff" : colors.text },
                            ]}
                          >
                            {member.full_name || member.email}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.border }]}
                  onPress={() => setAddRoutineVisible(false)}
                >
                  <Text style={{ color: colors.text }}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreateRoutine}
                >
                  {uploading ? (
                    <HeartbeatLoader size={22} variant="inline" />
                  ) : (
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>
                      Oluştur
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
        <Modal visible={photoModalVisible} transparent>
          <View style={styles.modalOverlay}>
            <View
              style={[styles.modalContent, { backgroundColor: colors.card }]}
            >
              <Text style={{ color: colors.text, marginBottom: 20 }}>
                Fotoğraf Gönderiliyor...
              </Text>
              <HeartbeatLoader size={48} variant="full" />
            </View>
          </View>
        </Modal>
        <Modal visible={reviewModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View
              style={[styles.modalContent, { backgroundColor: colors.card }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Değerlendirme
              </Text>
              {selectedItem?.log?.photo_url && (
                <Image
                  source={{ uri: selectedItem.log.photo_url }}
                  style={{
                    width: "100%",
                    height: 250,
                    borderRadius: 12,
                    marginBottom: 15,
                  }}
      />
              )}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#fee2e2" }]}
                  onPress={() => submitReview("rejected")}
                >
                  <Text style={{ color: "#ef4444", fontWeight: "bold" }}>
                    Reddet
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#dcfce7" }]}
                  onPress={() => submitReview("approved")}
                >
                  <Text style={{ color: "#10b981", fontWeight: "bold" }}>
                    Onayla
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 100 },
  headerContainer: { paddingVertical: 10, paddingBottom: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  textHeader: { flex: 1, paddingHorizontal: 0 },
  mainTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  subTitle: { fontSize: 14, fontWeight: "500" },
  storiesContainer: { paddingHorizontal: 20, gap: 15 },
  storyItem: { alignItems: "center", width: 72 },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    padding: 3,
    marginBottom: 6,
  },
  addStoryRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginBottom: 6,
  },
  storyImage: {
    width: "100%",
    height: "100%",
    borderRadius: 34,
    backgroundColor: "#eee",
  },
  storyName: { fontSize: 11, fontWeight: "500", textAlign: "center" },

  petInfoCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  petInfoText: { flex: 1 },
  petInfoName: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
  healthBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  healthBtnText: {
    color: "#ef4444",
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 6,
    marginRight: 2,
  },

  alertSection: {
    marginHorizontal: 20,
    padding: 15,
    backgroundColor: "#fff7ed",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ffedd5",
    marginBottom: 20,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: { color: "#c2410c", fontWeight: "700", fontSize: 14 },
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 10,
    marginRight: 10,
    minWidth: 120,
  },
  pendingText: { fontSize: 13, fontWeight: "600" },

  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  listContainer: { paddingHorizontal: 20, gap: 12 },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 18,
  },
  taskLeft: { flexDirection: "row", alignItems: "center" },
  taskIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  taskTitle: { fontSize: 15, fontWeight: "700" },
  cameraBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: { alignItems: "center", marginTop: 20, opacity: 0.7 },

  // MODALS
  fullModal: {
    flex: 1,
    marginTop: 40,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 25,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  modalTitleBig: { fontSize: 22, fontWeight: "900" },
  closeModalBtn: { padding: 5 },
  healthSection: { marginBottom: 30 },
  hSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  hSectionTitle: { fontSize: 16, fontWeight: "800" },
  healthItem: {
    padding: 15,
    borderRadius: 16,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  measureCard: {
    width: 100,
    height: 90,
    borderRadius: 20,
    padding: 15,
    justifyContent: "center",
    marginRight: 10,
  },
  dueDateBadge: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
    flexGrow: 1,
  },
  modalContent: { width: "100%", borderRadius: 24, padding: 25 },
  modalContentLarge: {
    width: "100%",
    borderRadius: 24,
    padding: 10,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 20 },
  modalButtons: { flexDirection: "row", gap: 15, marginTop: 15 },
  modalBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  assigneeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  assigneeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  assigneeText: { fontSize: 12, fontWeight: "600" },

  // YENİ STİLLER
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 10,
  },
  tabBtn: {
    flexDirection: "row",
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  tabText: { fontWeight: "700" },
  qrCard: {
    padding: 20,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 10,
  },
  qrHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  saveBtn: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  surfaceLift: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});
