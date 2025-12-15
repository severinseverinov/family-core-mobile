import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, getTheme, ThemeColors } from '../utils/theme';

const THEME_STORAGE_KEY = '@familycore_theme';

export function useTheme() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [colors, setColors] = useState<ThemeColors>(getTheme('light'));
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setColors(getTheme(themeMode));
      saveTheme(themeMode);
    }
  }, [themeMode, isLoaded]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'colorful')) {
        const mode = savedTheme as ThemeMode;
        setThemeModeState(mode);
        setColors(getTheme(mode));
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveTheme = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  return {
    themeMode,
    colors,
    setThemeMode,
  };
}

