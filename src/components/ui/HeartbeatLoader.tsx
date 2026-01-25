import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, Image } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";

export interface HeartbeatLoaderProps {
  size?: number;
  /** "full" = sayfa yükleme (padding, ortalı); "inline" = buton / küçük alan */
  variant?: "full" | "inline";
}

export default function HeartbeatLoader({
  size = 50,
  variant = "full",
}: HeartbeatLoaderProps) {
  const { themeMode } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

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

  const isInline = variant === "inline";
  const containerStyle = [
    styles.container,
    isInline ? styles.inline : styles.full,
  ];

  return (
    <View style={containerStyle}>
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
  },
  full: {
    padding: 16,
  },
  inline: {
    padding: 4,
  },
});
