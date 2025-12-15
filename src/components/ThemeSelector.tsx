import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeMode } from '../utils/theme';

interface ThemeSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export default function ThemeSelector({ visible, onClose }: ThemeSelectorProps) {
  const { colors, themeMode, setThemeMode } = useTheme();

  const themes: { mode: ThemeMode; label: string; emoji: string }[] = [
    { mode: 'light', label: 'Light', emoji: '☀️' },
    { mode: 'dark', label: 'Dark', emoji: '🌙' },
    { mode: 'colorful', label: 'Colorful (Kids)', emoji: '🎨' },
  ];

  const handleSelectTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    onClose();
  };

  const styles = createStyles(colors, themeMode);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Choose Theme</Text>
          {themes.map((theme) => (
            <TouchableOpacity
              key={theme.mode}
              style={[
                styles.themeButton,
                themeMode === theme.mode && styles.themeButtonActive,
              ]}
              onPress={() => handleSelectTheme(theme.mode)}
            >
              <Text style={styles.emoji}>{theme.emoji}</Text>
              <Text
                style={[
                  styles.themeLabel,
                  themeMode === theme.mode && styles.themeLabelActive,
                ]}
              >
                {theme.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, themeMode: string) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: themeMode === 'colorful' ? 20 : 12,
    padding: 24,
    width: '80%',
    maxWidth: 300,
    ...(themeMode === 'colorful' && {
      borderWidth: 3,
      borderColor: colors.primary,
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: themeMode === 'colorful' ? 12 : 8,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  themeButtonActive: {
    backgroundColor: colors.primaryLight + '20',
    borderColor: colors.primary,
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  themeLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  themeLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 8,
    padding: 12,
    borderRadius: themeMode === 'colorful' ? 12 : 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});

