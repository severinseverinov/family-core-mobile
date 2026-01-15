import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, Image } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface HeartbeatLoaderProps {
  size?: number;
}

export default function HeartbeatLoader({ size = 50 }: HeartbeatLoaderProps) {
  const { themeMode } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Kalp atışı (nabız) animasyonu
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15, // Hafif büyüme (tasarımı bozmamak için %15 yeterli)
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1, // Eski boyuta dönüş
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Temaya göre assets/icons klasöründen ilgili PNG'yi seçiyoruz
  const getIconSource = () => {
    switch (themeMode) {
      case "dark":
        return require("../../../assets/icons/dark.png");
      case "colorful":
        return require("../../../assets/icons/colour.png");
      default:
        return require("../../../assets/icons/light.png");
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Image
          source={getIconSource()}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
});
