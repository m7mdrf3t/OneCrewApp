/**
 * Common Styles
 * 
 * Shared styles between iOS and Android platforms.
 * These styles are merged with platform-specific overrides.
 */

import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { spacing, semanticSpacing } from '../constants/spacing';

// Common color palette
export const commonColors = {
  // Primary colors
  primary: '#0F172A',
  primaryLight: '#334155',
  primaryDark: '#020617',
  accent: '#0369A1',
  accentLight: '#EFF6FF',
  
  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFC',
  backgroundTertiary: '#F1F5F9',
  
  // Text colors
  text: '#020617',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textInverse: '#ffffff',
  
  // Border colors
  border: '#E2E8F0',
  borderDark: '#CBD5E1',
  
  // Status colors
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  // Overlay colors
  overlay: 'rgba(15, 23, 42, 0.5)',
  overlayLight: 'rgba(15, 23, 42, 0.3)',
} as const;

// Common typography
export const commonTypography = {
  // Font sizes
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },
  
  // Font weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// Common spacing values
export const commonSpacing = {
  ...spacing,
  ...semanticSpacing,
} as const;

// Common border radius
export const commonBorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// Common shadow styles (will be overridden by platform-specific)
export const commonShadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// Base common styles
export const commonStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: commonColors.backgroundSecondary,
  } as ViewStyle,
  
  containerWhite: {
    flex: 1,
    backgroundColor: commonColors.background,
  } as ViewStyle,
  
  // Card styles
  card: {
    backgroundColor: commonColors.background,
    borderRadius: commonBorderRadius.lg,
    padding: semanticSpacing.cardPadding,
  } as ViewStyle,
  
  // Text styles
  text: {
    fontSize: commonTypography.fontSize.base,
    color: commonColors.text,
    fontWeight: commonTypography.fontWeight.normal,
  } as TextStyle,
  
  textBold: {
    fontSize: commonTypography.fontSize.base,
    color: commonColors.text,
    fontWeight: commonTypography.fontWeight.bold,
  } as TextStyle,
  
  textSecondary: {
    fontSize: commonTypography.fontSize.sm,
    color: commonColors.textSecondary,
    fontWeight: commonTypography.fontWeight.normal,
  } as TextStyle,
  
  // Button styles
  button: {
    paddingVertical: semanticSpacing.buttonPadding,
    paddingHorizontal: semanticSpacing.buttonPaddingLarge,
    borderRadius: commonBorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  
  buttonPrimary: {
    backgroundColor: commonColors.primary,
  } as ViewStyle,
  
  buttonText: {
    fontSize: commonTypography.fontSize.md,
    fontWeight: commonTypography.fontWeight.semibold,
    color: commonColors.textInverse,
  } as TextStyle,
  
  // Input styles
  input: {
    borderWidth: 1.5,
    borderColor: commonColors.borderDark,
    borderRadius: commonBorderRadius.md,
    paddingHorizontal: semanticSpacing.inputPadding,
    paddingVertical: semanticSpacing.inputPaddingSmall,
    fontSize: commonTypography.fontSize.base,
    color: commonColors.text,
    backgroundColor: commonColors.background,
  } as ViewStyle,
  
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: commonColors.background,
    borderBottomWidth: 1,
    borderBottomColor: commonColors.border,
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: semanticSpacing.headerPaddingVertical,
    paddingTop: semanticSpacing.containerPadding,
    minHeight: 56,
  } as ViewStyle,
  
  // Safe area styles
  safeArea: {
    flex: 1,
  } as ViewStyle,
});

