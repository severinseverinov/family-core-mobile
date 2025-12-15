export type ThemeMode = 'light' | 'dark' | 'colorful';

export interface ThemeColors {
  // Background colors
  background: string;
  surface: string;
  card: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Accent colors
  accent: string;
  accentLight: string;
  
  // Interactive colors
  button: string;
  buttonText: string;
  buttonDisabled: string;
  link: string;
  
  // Border and divider
  border: string;
  divider: string;
  
  // Input
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  
  // Status colors
  error: string;
  success: string;
  warning: string;
  info: string;
}

export const themes: Record<ThemeMode, ThemeColors> = {
  light: {
    background: '#FFFFFF',
    surface: '#F8F9FA',
    card: '#FFFFFF',
    
    text: '#000000',
    textSecondary: '#333333',
    textMuted: '#666666',
    
    primary: '#007AFF',
    primaryLight: '#5AC8FA',
    primaryDark: '#0051D5',
    
    accent: '#34C759',
    accentLight: '#64DE83',
    
    button: '#007AFF',
    buttonText: '#FFFFFF',
    buttonDisabled: '#B0B0B0',
    link: '#007AFF',
    
    border: '#E0E0E0',
    divider: '#E5E5E7',
    
    inputBackground: '#FFFFFF',
    inputBorder: '#DDDDDD',
    inputText: '#000000',
    inputPlaceholder: '#8E8E93',
    
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    info: '#007AFF',
  },
  
  dark: {
    background: '#000000',
    surface: '#1C1C1E',
    card: '#2C2C2E',
    
    text: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textMuted: '#EBEBF599',
    
    primary: '#0A84FF',
    primaryLight: '#5AC8FA',
    primaryDark: '#0051D5',
    
    accent: '#32D74B',
    accentLight: '#64DE83',
    
    button: '#0A84FF',
    buttonText: '#FFFFFF',
    buttonDisabled: '#48484A',
    link: '#5AC8FA',
    
    border: '#38383A',
    divider: '#38383A',
    
    inputBackground: '#2C2C2E',
    inputBorder: '#38383A',
    inputText: '#FFFFFF',
    inputPlaceholder: '#8E8E93',
    
    error: '#FF453A',
    success: '#32D74B',
    warning: '#FF9F0A',
    info: '#0A84FF',
  },
  
  colorful: {
    background: '#FFF8F0',
    surface: '#FFF8F0',
    card: '#FFFFFF',
    
    text: '#2C1810',
    textSecondary: '#4A3728',
    textMuted: '#8B7355',
    
    primary: '#FF6B6B',
    primaryLight: '#FF8E8E',
    primaryDark: '#FF4757',
    
    accent: '#4ECDC4',
    accentLight: '#6EDDD6',
    
    button: '#FF6B6B',
    buttonText: '#FFFFFF',
    buttonDisabled: '#FFB3B3',
    link: '#4ECDC4',
    
    border: '#FFE5CC',
    divider: '#FFE5CC',
    
    inputBackground: '#FFFFFF',
    inputBorder: '#FFD4B8',
    inputText: '#2C1810',
    inputPlaceholder: '#C4A082',
    
    error: '#FF6B6B',
    success: '#51CF66',
    warning: '#FFD93D',
    info: '#4ECDC4',
  },
};

export const getTheme = (mode: ThemeMode): ThemeColors => {
  return themes[mode];
};

