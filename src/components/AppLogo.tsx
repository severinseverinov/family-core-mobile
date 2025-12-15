import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface AppLogoProps {
  size?: number;
  style?: ViewStyle;
}

export default function AppLogo({ size = 120, style }: AppLogoProps) {
  let colors, themeMode;
  
  try {
    const theme = useTheme();
    colors = theme.colors;
    themeMode = theme.themeMode;
  } catch {
    // Fallback colors if theme context is not available
    colors = {
      primary: '#007AFF',
      accent: '#34C759',
      error: '#FF6B6B',
      warning: '#FFD93D',
      background: '#FFFFFF',
    };
    themeMode = 'light';
  }
  
  const styles = createStyles(size, colors, themeMode);

  return (
    <View style={[styles.container, style]}>
      {/* Outer heart circle */}
      <View style={styles.outerCircle}>
        {/* Family silhouette */}
        <View style={styles.familyContainer}>
          {/* Parent figures */}
          <View style={styles.parentLeft}>
            <View style={styles.head} />
            <View style={styles.body} />
          </View>
          
          {/* Heart in center */}
          <View style={styles.heartContainer}>
            <View style={styles.heart}>
              <View style={styles.heartLeft} />
              <View style={styles.heartRight} />
            </View>
          </View>
          
          {/* Parent figures */}
          <View style={styles.parentRight}>
            <View style={styles.head} />
            <View style={styles.body} />
          </View>
          
          {/* Child figure (smaller) */}
          <View style={styles.child}>
            <View style={styles.childHead} />
            <View style={styles.childBody} />
          </View>
        </View>
      </View>
      
      {/* Happy elements - small stars around */}
      <View style={styles.starContainer}>
        <View style={[styles.star, styles.star1]} />
        <View style={[styles.star, styles.star2]} />
        <View style={[styles.star, styles.star3]} />
      </View>
    </View>
  );
}

const createStyles = (size: number, colors: any, themeMode: string) => StyleSheet.create({
  container: {
    width: size,
    height: size,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerCircle: {
    width: size * 0.9,
    height: size * 0.9,
    borderRadius: size * 0.45,
    backgroundColor: colors.primary + '15',
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...(themeMode === 'colorful' && {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  familyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
    height: '60%',
  },
  parentLeft: {
    position: 'absolute',
    left: '5%',
    bottom: 0,
    alignItems: 'center',
  },
  parentRight: {
    position: 'absolute',
    right: '5%',
    bottom: 0,
    alignItems: 'center',
  },
  head: {
    width: size * 0.12,
    height: size * 0.12,
    borderRadius: size * 0.06,
    backgroundColor: colors.primary,
    marginBottom: 2,
  },
  body: {
    width: size * 0.15,
    height: size * 0.2,
    borderRadius: size * 0.08,
    backgroundColor: colors.primary,
  },
  child: {
    position: 'absolute',
    bottom: size * 0.02,
    left: '50%',
    marginLeft: -(size * 0.08),
    alignItems: 'center',
  },
  childHead: {
    width: size * 0.08,
    height: size * 0.08,
    borderRadius: size * 0.04,
    backgroundColor: colors.accent || colors.primary,
    marginBottom: 1,
  },
  childBody: {
    width: size * 0.1,
    height: size * 0.12,
    borderRadius: size * 0.05,
    backgroundColor: colors.accent || colors.primary,
  },
  heartContainer: {
    position: 'absolute',
    top: '-10%',
    left: '50%',
    marginLeft: -(size * 0.1),
    width: size * 0.2,
    height: size * 0.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heart: {
    width: size * 0.15,
    height: size * 0.15,
    position: 'relative',
    transform: [{ rotate: '-45deg' }],
  },
  heartLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: size * 0.075,
    height: size * 0.075,
    borderRadius: size * 0.0375,
    backgroundColor: colors.error || '#FF6B6B',
  },
  heartRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: size * 0.075,
    height: size * 0.075,
    borderRadius: size * 0.0375,
    backgroundColor: colors.error || '#FF6B6B',
  },
  starContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  star: {
    position: 'absolute',
    width: size * 0.06,
    height: size * 0.06,
    backgroundColor: colors.warning || '#FFD93D',
    borderRadius: size * 0.03,
    transform: [{ rotate: '45deg' }],
  },
  star1: {
    top: size * 0.1,
    left: size * 0.2,
  },
  star2: {
    top: size * 0.15,
    right: size * 0.3,
  },
  star3: {
    bottom: size * 0.2,
    left: size * 0.45,
  },
});

