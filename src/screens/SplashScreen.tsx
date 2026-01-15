import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const { colors, themeMode } = useTheme();

  // Animasyon Değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current; // Yazı için hafif aşağıdan yukarı kayma efekti

  useEffect(() => {
    // Logo ve Yazı Yavaşça Belirsin
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    // 2.8 saniye sonra kararak kapanma ve ana ekrana geçiş
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  // Temaya Göre Logo Seçimi
  const getLogo = () => {
    switch (themeMode) {
      case "dark":
        return require("../../assets/splash-dark.png");
      case "colorful":
        return require("../../assets/splash-colorful.png");
      default:
        return require("../../assets/splash-light.png");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          alignItems: "center",
        }}
      >
        {/* LOGO */}
        <Image source={getLogo()} style={styles.logo} resizeMode="contain" />

        {/* LOGO ALTI YAZI */}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.brandText,
              {
                color: themeMode === "colorful" ? colors.primary : colors.text,
              },
            ]}
          >
            FAMILY CORE
          </Text>
          <View
            style={[
              styles.underline,
              { backgroundColor: colors.primary, opacity: 0.6 },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: Dimensions.get("window").width * 0.55,
    height: Dimensions.get("window").width * 0.55,
  },
  textContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  brandText: {
    fontSize: 28,
    fontWeight: "900", // Çok kalın ve tok bir font
    letterSpacing: 4, // Harf aralarını açarak daha modern bir hava katıyoruz
    textAlign: "center",
    ...Platform.select({
      ios: { fontFamily: "AvenirNext-Heavy" }, // iOS için özel kalın font
      android: { fontFamily: "sans-serif-condensed" },
    }),
  },
  underline: {
    height: 3,
    width: 40,
    marginTop: 8,
    borderRadius: 2,
  },
});
