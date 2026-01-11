import React from "react";
import { ViewStyle, TextStyle } from "react-native";
import { Button, ButtonProps } from "react-native-paper";
import { useTheme } from "../../contexts/ThemeContext";

interface ModernButtonProps extends ButtonProps {
  variant?: "primary" | "secondary" | "outline";
}

export const ModernButton: React.FC<ModernButtonProps> = ({
  children,
  style,
  variant = "primary",
  mode,
  labelStyle,
  ...props
}) => {
  const { colors, themeMode } = useTheme();
  const isColorful = themeMode === "colorful";

  let buttonColor = colors.primary;
  let textColor = "#FFFFFF";
  let buttonMode = mode || "contained";

  if (variant === "secondary") {
    buttonColor = colors.secondary;
  } else if (variant === "outline") {
    buttonMode = "outlined";
    textColor = colors.primary;
  }

  const dynamicStyle: ViewStyle = {
    borderRadius: isColorful ? 25 : 15, // Hap şeklinde butonlar
    paddingVertical: isColorful ? 8 : 6, // Daha büyük tıklama alanı
    borderWidth: isColorful && variant !== "outline" ? 2 : 0, // Çizgi film efekti
    borderColor: "rgba(0,0,0,0.1)",
    ...style,
  };

  const dynamicLabelStyle: TextStyle = {
    fontSize: isColorful ? 18 : 16, // Daha büyük yazılar
    fontWeight: "bold",
    letterSpacing: 0.5,
    ...labelStyle,
  };

  return (
    <Button
      mode={buttonMode}
      buttonColor={variant !== "outline" ? buttonColor : undefined}
      textColor={variant === "outline" ? textColor : undefined}
      style={dynamicStyle}
      labelStyle={dynamicLabelStyle}
      {...props}
    >
      {children}
    </Button>
  );
};
