/**
 * Platform-Specific Styles Utility
 * 
 * Automatically loads platform-specific style files (.ios.ts or .android.ts)
 * and merges them with common styles. Provides type-safe style creation.
 */

import { Platform, StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';

type Style = ViewStyle | TextStyle | ImageStyle;
type StyleSheet<T> = { [K in keyof T]: Style };

/**
 * Platform-specific style configuration
 */
interface PlatformStyleConfig {
  ios?: Record<string, Style>;
  android?: Record<string, Style>;
  common?: Record<string, Style>;
}

/**
 * Creates platform-specific styles by merging common and platform-specific styles
 * 
 * @param config - Style configuration with common, ios, and android properties
 * @returns StyleSheet with merged styles
 * 
 * @example
 * const styles = createPlatformStyles({
 *   common: {
 *     container: { flex: 1 },
 *   },
 *   ios: {
 *     container: { backgroundColor: '#f5f5f5' },
 *   },
 *   android: {
 *     container: { backgroundColor: '#ffffff' },
 *   }
 * });
 */
export const createPlatformStyles = <T extends Record<string, Style>>(
  config: PlatformStyleConfig
): StyleSheet<T> => {
  const { common = {}, ios = {}, android = {} } = config;
  
  // Get platform-specific styles
  const platformStyles = Platform.OS === 'ios' ? ios : android;
  
  // Merge common styles with platform-specific styles
  // Platform-specific styles override common styles
  const mergedStyles: Record<string, Style> = {};
  
  // First, apply common styles
  Object.keys(common).forEach((key) => {
    mergedStyles[key] = { ...common[key] };
  });
  
  // Then, override with platform-specific styles
  Object.keys(platformStyles).forEach((key) => {
    mergedStyles[key] = {
      ...mergedStyles[key],
      ...platformStyles[key],
    };
  });
  
  // Create StyleSheet from merged styles
  return StyleSheet.create(mergedStyles as T);
};

/**
 * Loads platform-specific style module
 * NOTE: This function is deprecated. Use createPlatformStyles instead.
 * React Native doesn't support dynamic requires, so this function won't work at runtime.
 * 
 * @deprecated Use createPlatformStyles with explicit imports instead
 * 
 * @param basePath - Base path to style file (without .ios/.android extension)
 * @returns Platform-specific style module
 */
export const loadPlatformStyles = <T extends Record<string, Style>>(
  basePath: string
): T => {
  console.warn('loadPlatformStyles is deprecated. Use createPlatformStyles with explicit imports instead.');
  // React Native doesn't support dynamic requires
  // This function is kept for backward compatibility but will return empty object
  return {} as T;
};

/**
 * Merges multiple style objects
 * Useful for combining common styles with platform-specific overrides
 * 
 * @param styles - Array of style objects to merge
 * @returns Merged style object
 */
export const mergeStyles = <T extends Style>(...styles: (T | undefined | null)[]): T => {
  return Object.assign({}, ...styles.filter(Boolean)) as T;
};

/**
 * Conditionally applies styles based on platform
 * 
 * @param iosStyle - Style to apply on iOS
 * @param androidStyle - Style to apply on Android
 * @returns Platform-specific style
 */
export const platformSelect = <T extends Style>(
  iosStyle: T,
  androidStyle: T
): T => {
  return Platform.OS === 'ios' ? iosStyle : androidStyle;
};

/**
 * Creates styles with platform-specific values
 * 
 * @param styleCreator - Function that receives platform and returns styles
 * @returns Platform-specific styles
 * 
 * @example
 * const styles = createPlatformStylesFrom((platform) => ({
 *   container: {
 *     padding: platform === 'ios' ? 16 : 12,
 *   }
 * }));
 */
export const createPlatformStylesFrom = <T extends Record<string, Style>>(
  styleCreator: (platform: 'ios' | 'android') => T
): StyleSheet<T> => {
  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'android';
  const styles = styleCreator(platform);
  return StyleSheet.create(styles);
};

