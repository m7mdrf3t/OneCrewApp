/**
 * iOS-Specific Styles
 * 
 * Styles that follow iOS Human Interface Guidelines (HIG).
 * These override common styles for iOS platform.
 */

import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { commonColors, commonTypography, commonSpacing, commonBorderRadius, commonStyles } from './styles.common';

// iOS-specific colors (SF Colors)
export const iosColors = {
  ...commonColors,
  // iOS uses more subtle grays
  background: '#f2f2f7',
  backgroundSecondary: '#ffffff',
  backgroundTertiary: '#f9f9f9',
  
  // iOS system colors
  systemBlue: '#007aff',
  systemGreen: '#34c759',
  systemRed: '#ff3b30',
  systemOrange: '#ff9500',
  
  // iOS text colors
  label: '#000000',
  secondaryLabel: '#3c3c43',
  tertiaryLabel: '#3c3c4399',
} as const;

// iOS-specific typography (SF Pro)
export const iosTypography = {
  ...commonTypography,
  // iOS uses SF Pro font family (system default)
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
} as const;

// iOS-specific shadows (more subtle)
export const iosShadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 0, // iOS doesn't use elevation
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 0,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 0,
  },
} as const;

// iOS-specific styles
export const iosStyles = StyleSheet.create({
  // Override container with iOS background
  container: {
    ...commonStyles.container,
    backgroundColor: iosColors.background,
  } as ViewStyle,
  
  containerWhite: {
    ...commonStyles.containerWhite,
    backgroundColor: iosColors.backgroundSecondary,
  } as ViewStyle,
  
  // iOS cards have more rounded corners
  card: {
    ...commonStyles.card,
    borderRadius: 16, // iOS prefers 16px radius
    ...iosShadows.sm,
  } as ViewStyle,
  
  // iOS text styles
  text: {
    ...commonStyles.text,
    color: iosColors.label,
  } as TextStyle,
  
  textSecondary: {
    ...commonStyles.textSecondary,
    color: iosColors.secondaryLabel,
  } as TextStyle,
  
  // iOS buttons have more rounded corners
  button: {
    ...commonStyles.button,
    borderRadius: 12, // iOS prefers 12px for buttons
  } as ViewStyle,
  
  // iOS inputs have more rounded corners
  input: {
    ...commonStyles.input,
    borderRadius: 10, // iOS prefers 10px for inputs
    borderColor: iosColors.borderDark,
  } as ViewStyle,
  
  // iOS header with blur effect support
  header: {
    ...commonStyles.header,
    backgroundColor: iosColors.backgroundSecondary,
    borderBottomColor: iosColors.border,
    borderBottomWidth: 0.5, // iOS uses thinner borders
  } as ViewStyle,
  
  // iOS-specific navigation styles
  tabBar: {
    backgroundColor: iosColors.backgroundSecondary,
    borderTopColor: iosColors.border,
    borderTopWidth: 0.5,
    height: 83, // Includes safe area
    paddingBottom: 34, // Safe area bottom
  } as ViewStyle,
  
  // iOS modal styles
  modal: {
    backgroundColor: iosColors.backgroundSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  } as ViewStyle,
});

