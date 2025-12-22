/**
 * Android-Specific Styles
 * 
 * Styles that follow Material Design guidelines.
 * These override common styles for Android platform.
 */

import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { commonColors, commonTypography, commonSpacing, commonBorderRadius, commonStyles } from './styles.common';

// Android-specific colors (Material Design)
export const androidColors = {
  ...commonColors,
  // Android uses Material colors
  background: '#ffffff',
  backgroundSecondary: '#f5f5f5',
  backgroundTertiary: '#fafafa',
  
  // Material Design colors
  primary: '#000000',
  primaryLight: '#424242',
  primaryDark: '#000000',
  
  // Material text colors
  textPrimary: '#212121',
  textSecondary: '#757575',
  textDisabled: '#bdbdbd',
  
  // Material surface colors
  surface: '#ffffff',
  surfaceVariant: '#f5f5f5',
} as const;

// Android-specific typography (Roboto)
export const androidTypography = {
  ...commonTypography,
  // Android uses Roboto font family
  fontFamily: {
    regular: 'Roboto',
    medium: 'Roboto-Medium',
    semibold: 'Roboto-Medium',
    bold: 'Roboto-Bold',
  },
} as const;

// Android-specific shadows (Material elevation)
export const androidShadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 2, // Material Design elevation
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 2.62,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.23,
    shadowRadius: 4.62,
    elevation: 8,
  },
} as const;

// Android-specific styles
export const androidStyles = StyleSheet.create({
  // Override container with Android background
  container: {
    ...commonStyles.container,
    backgroundColor: androidColors.backgroundSecondary,
  } as ViewStyle,
  
  containerWhite: {
    ...commonStyles.containerWhite,
    backgroundColor: androidColors.background,
  } as ViewStyle,
  
  // Android cards use Material elevation
  card: {
    ...commonStyles.card,
    borderRadius: 8, // Material Design prefers 8px radius
    ...androidShadows.sm,
  } as ViewStyle,
  
  // Android text styles
  text: {
    ...commonStyles.text,
    color: androidColors.textPrimary,
  } as TextStyle,
  
  textSecondary: {
    ...commonStyles.textSecondary,
    color: androidColors.textSecondary,
  } as TextStyle,
  
  // Android buttons use Material Design radius
  button: {
    ...commonStyles.button,
    borderRadius: 4, // Material Design prefers 4px for buttons
  } as ViewStyle,
  
  // Android inputs use Material Design style
  input: {
    ...commonStyles.input,
    borderRadius: 4, // Material Design prefers 4px for inputs
    borderColor: androidColors.borderDark,
  } as ViewStyle,
  
  // Android header with Material Design elevation
  header: {
    ...commonStyles.header,
    backgroundColor: androidColors.surface,
    borderBottomColor: androidColors.border,
    borderBottomWidth: 1, // Material Design uses 1px borders
    ...androidShadows.sm,
  } as ViewStyle,
  
  // Android-specific navigation styles
  tabBar: {
    backgroundColor: androidColors.surface,
    borderTopColor: androidColors.border,
    borderTopWidth: 1,
    height: 56, // Material Design tab bar height
    elevation: 8, // Material elevation
  } as ViewStyle,
  
  // Android modal styles
  modal: {
    backgroundColor: androidColors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 16, // High elevation for modals
  } as ViewStyle,
  
  // Material Design ripple effect support
  ripple: {
    color: androidColors.primaryLight,
    borderless: false,
  } as ViewStyle,
});

