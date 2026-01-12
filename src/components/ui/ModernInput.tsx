import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext"; //

interface ModernInputProps extends TextInputProps {
  label?: string;
}

export default function ModernInput({
  label,
  style,
  ...props
}: ModernInputProps) {
  const { colors, themeMode } = useTheme(); //
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      )}
      <TextInput
        {...props}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholderTextColor={colors.textMuted} //
        style={[
          styles.input,
          {
            backgroundColor: colors.card, //
            color: colors.text, //
            borderColor: isFocused ? colors.primary : colors.border, //
            borderRadius: themeMode === "colorful" ? 16 : 10, //
          },
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, width: "100%" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginLeft: 4 },
  input: {
    height: 52,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 16,
    // iOS için gölge (Shadow)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    // Android için gölge
    elevation: 2,
  },
});
