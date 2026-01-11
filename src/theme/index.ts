import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";
import { Theme } from "../types/theme";

const fontConfig = {
  fontFamily: "System", // Şimdilik sistem fontu, ama yuvarlak hatlı bir font harika olurdu.
};

// Ortak Renkler (Marka renkleriniz)
const brandColors = {
  primary: "#4A90E2", // Daha sıcak, yumuşak bir mavi (Logonuza göre burayı güncelleyin)
  secondary: "#FF9F43", // Vurgular için sıcak bir turuncu/mercan rengi
  tertiary: "#54D8C3", // Tamamlayıcı yumuşak yeşil (Örn: başarı mesajları)
  error: "#FF6B6B", // Yumuşak kırmızı
};

export const lightTheme: Theme = {
  ...MD3LightTheme,
  myColors: {
    primary: brandColors.primary,
    secondary: brandColors.secondary,
    background: "#F8F9FA", // Göz yormayan kırık beyaz arka plan
    card: "#FFFFFF", // Kartlar bembeyaz
    text: "#2D3436", // Tam siyah değil, yumuşak koyu gri
    textMuted: "#636E72",
    border: "#E8EEF3",
    error: brandColors.error,
    success: brandColors.tertiary,
    warning: brandColors.secondary,
  },
  // Paper bileşenleri için renkleri override ediyoruz
  colors: {
    ...MD3LightTheme.colors,
    primary: brandColors.primary,
    secondary: brandColors.secondary,
    background: "#F8F9FA",
    surface: "#FFFFFF", // Kart yüzeyleri
    error: brandColors.error,
    onPrimary: "#FFFFFF", // Primary üzerindeki yazı rengi
  },
  roundness: 4, // Paper bileşenleri için varsayılan yuvarlaklık (biz daha fazlasını kullanacağız)
};

export const darkTheme: Theme = {
  ...MD3DarkTheme,
  myColors: {
    primary: "#5DA3EC", // Karanlık modda biraz daha açık mavi
    secondary: brandColors.secondary,
    background: "#121212",
    card: "#1E1E1E",
    text: "#FFFFFF",
    textMuted: "#B2BEC3",
    border: "#2D3436",
    error: "#FF8585",
    success: brandColors.tertiary,
    warning: brandColors.secondary,
  },
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#5DA3EC",
    background: "#121212",
    surface: "#1E1E1E",
  },
  roundness: 4,
};
export const colorfulTheme: Theme = {
  ...MD3LightTheme,
  myColors: {
    primary: "#FF6B6B", // Canlı Mercan Kırmızısı
    secondary: "#4ECDC4", // Canlı Turkuaz
    background: "#FFF9C4", // Açık Sarı (Neşeli arka plan)
    card: "#FFFFFF",
    text: "#2D3436",
    textMuted: "#636E72",
    border: "#FF9F43", // Turuncu kenarlıklar
    error: "#FF0000",
    success: "#55E6C1",
    warning: "#FDCB6E",
  },
  colors: {
    ...MD3LightTheme.colors,
    primary: "#FF6B6B",
    secondary: "#4ECDC4",
    background: "#FFF9C4",
    surface: "#FFFFFF",
  },
  roundness: 25, // Çok daha yuvarlak köşeler
};
