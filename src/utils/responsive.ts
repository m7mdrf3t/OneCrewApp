/**
 * Responsive Design Utilities
 * 
 * Provides breakpoint system, device type detection, and responsive value selection
 * for comprehensive responsive design across all iOS and Android devices.
 */

import { Dimensions, Platform } from 'react-native';
import { getScreenWidth, getScreenHeight, isLandscape } from './dimensions';

// Breakpoint definitions (based on screen width)
export const BREAKPOINTS = {
  xs: 0,      // Extra small phones (< 375px)
  sm: 375,    // Small phones (375px - 414px)
  md: 415,    // Medium phones (415px - 767px)
  lg: 768,    // Tablets (768px - 1023px)
  xl: 1024,   // Large tablets (1024px - 1439px)
  xxl: 1440,  // Extra large tablets/desktops (1440px+)
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// Device type thresholds
const PHONE_MAX_WIDTH = 767;
const TABLET_MAX_WIDTH = 1439;

/**
 * Get current breakpoint based on screen width
 */
export const getCurrentBreakpoint = (): Breakpoint => {
  const width = getScreenWidth();
  
  if (width >= BREAKPOINTS.xxl) return 'xxl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

/**
 * Device type enumeration
 */
export type DeviceType = 'phone' | 'tablet' | 'foldable';

/**
 * Detect device type based on screen dimensions
 */
export const getDeviceType = (): DeviceType => {
  const width = getScreenWidth();
  const height = getScreenHeight();
  
  // Foldable detection (rough heuristic - can be improved with device info)
  // Foldables typically have unusual aspect ratios
  const aspectRatio = width / height;
  const isUnusualAspectRatio = aspectRatio > 2.1 || aspectRatio < 0.45;
  
  if (isUnusualAspectRatio && width > PHONE_MAX_WIDTH) {
    return 'foldable';
  }
  
  if (width <= PHONE_MAX_WIDTH) {
    return 'phone';
  }
  
  return 'tablet';
};

/**
 * Check if device is a phone
 */
export const isPhone = (): boolean => getDeviceType() === 'phone';

/**
 * Check if device is a tablet
 */
export const isTablet = (): boolean => getDeviceType() === 'tablet';

/**
 * Check if device is a foldable
 */
export const isFoldable = (): boolean => getDeviceType() === 'foldable';

/**
 * Responsive value selector
 * Returns different values based on breakpoint
 * 
 * @example
 * const padding = selectResponsiveValue({
 *   xs: 8,
 *   sm: 12,
 *   md: 16,
 *   lg: 20,
 *   xl: 24,
 *   xxl: 28
 * });
 */
export const selectResponsiveValue = <T>(values: Partial<Record<Breakpoint, T>>, defaultValue?: T): T => {
  const breakpoint = getCurrentBreakpoint();
  
  // Try exact match first
  if (values[breakpoint] !== undefined) {
    return values[breakpoint] as T;
  }
  
  // Try to find closest smaller breakpoint
  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp] as T;
    }
  }
  
  // Try to find closest larger breakpoint
  for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp] as T;
    }
  }
  
  // Return default or throw error
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  
  throw new Error(`No responsive value found for breakpoint ${breakpoint} and no default provided`);
};

/**
 * Get responsive spacing multiplier
 * Returns multiplier based on device type and breakpoint
 */
export const getSpacingMultiplier = (): number => {
  const deviceType = getDeviceType();
  const breakpoint = getCurrentBreakpoint();
  
  if (deviceType === 'tablet') {
    // Tablets get slightly larger spacing
    if (breakpoint === 'xl' || breakpoint === 'xxl') {
      return 1.3;
    }
    return 1.2;
  }
  
  if (deviceType === 'foldable') {
    // Foldables get moderate spacing increase
    return 1.15;
  }
  
  // Phones use base spacing
  return 1.0;
};

/**
 * Check if current breakpoint matches any of the provided breakpoints
 */
export const matchesBreakpoint = (...breakpoints: Breakpoint[]): boolean => {
  const current = getCurrentBreakpoint();
  return breakpoints.includes(current);
};

/**
 * Check if current breakpoint is at least the provided breakpoint
 */
export const isAtLeastBreakpoint = (breakpoint: Breakpoint): boolean => {
  const current = getCurrentBreakpoint();
  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
  const currentIndex = breakpointOrder.indexOf(current);
  const targetIndex = breakpointOrder.indexOf(breakpoint);
  return currentIndex >= targetIndex;
};

/**
 * Check if current breakpoint is at most the provided breakpoint
 */
export const isAtMostBreakpoint = (breakpoint: Breakpoint): boolean => {
  const current = getCurrentBreakpoint();
  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
  const currentIndex = breakpointOrder.indexOf(current);
  const targetIndex = breakpointOrder.indexOf(breakpoint);
  return currentIndex <= targetIndex;
};

/**
 * Get safe area insets (for notched devices)
 * Returns padding values for safe areas
 */
export const getSafeAreaInsets = () => {
  // This is a placeholder - actual implementation should use
  // react-native-safe-area-context's useSafeAreaInsets hook
  // For now, return platform-specific defaults
  const isIOS = Platform.OS === 'ios';
  const deviceType = getDeviceType();
  
  return {
    top: isIOS && deviceType === 'phone' ? 44 : 0,
    bottom: isIOS && deviceType === 'phone' ? 34 : 0,
    left: 0,
    right: 0,
  };
};

