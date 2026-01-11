import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Provider as PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
  MD3Theme,
} from "react-native-paper";
import { ThemeMode, getTheme, ThemeColors } from "../utils/theme";

const THEME_STORAGE_KEY = "@familycore_theme";

interface ThemeContextType {
  themeMode: ThemeMode;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");
  const [colors, setColors] = useState<ThemeColors>(getTheme("light"));
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const newColors = getTheme(themeMode);
      setColors(newColors);
      saveTheme(themeMode);
    }
  }, [themeMode, isLoaded]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (
        savedTheme &&
        (savedTheme === "light" ||
          savedTheme === "dark" ||
          savedTheme === "colorful")
      ) {
        const mode = savedTheme as ThemeMode;
        setThemeModeState(mode);
        setColors(getTheme(mode));
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveTheme = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  // Sizin renklerinizi React Native Paper temasına dönüştüren adaptör
  const getPaperTheme = (): MD3Theme => {
    const baseTheme = themeMode === "dark" ? MD3DarkTheme : MD3LightTheme;

    return {
      ...baseTheme,
      // Yuvarlak köşeler için (Çocuk modunda daha yuvarlak)
      roundness: themeMode === "colorful" ? 4 : 2,
      colors: {
        ...baseTheme.colors,
        primary: colors.primary,
        onPrimary: "#FFFFFF", // Buton üzerindeki yazı rengi
        secondary: colors.accent,
        background: colors.background,
        surface: colors.card,
        error: colors.error,
        // Diğer renk eşleştirmeleri...
      },
    };
  };

  return (
    <ThemeContext.Provider
      value={{ themeMode, colors, setThemeMode, isLoaded }}
    >
      <PaperProvider theme={getPaperTheme()}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
