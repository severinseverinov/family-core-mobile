import React from "react";
import { ViewStyle } from "react-native";
import { Card, CardProps } from "react-native-paper";
import { useTheme } from "../../contexts/ThemeContext";

interface ModernCardProps extends CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noShadow?: boolean;
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  style,
  noShadow,
  ...props
}) => {
  const { colors, isDark, themeMode } = useTheme();

  // Çocuk modu aktif mi?
  const isColorful = themeMode === "colorful";

  const cardStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: isColorful ? 30 : 20, // Çocuk modunda ekstra yuvarlak
    padding: 15,
    marginBottom: 15,
    // Çocuk modunda kalın ve renkli kenarlıklar
    borderWidth: isColorful ? 3 : isDark ? 1 : 0,
    borderColor: isColorful ? colors.border : colors.border,

    // Gölgeler
    ...(!isDark &&
      !noShadow && {
        shadowColor: isColorful ? colors.primary : "#000", // Renkli gölge!
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isColorful ? 0.3 : 0.1,
        shadowRadius: isColorful ? 0 : 12, // Sert gölge (cartoon effect)
        elevation: 5,
      }),
    ...style,
  };

  return (
    <Card style={cardStyle} mode={isDark ? "outlined" : "elevated"} {...props}>
      {children}
    </Card>
  );
};
