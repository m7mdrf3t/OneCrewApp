/**
 * Dimension Utilities
 * 
 * Provides responsive scaling functions for consistent sizing across different screen sizes.
 * Based on a reference design size (typically iPhone X/11 Pro: 375x812).
 */

import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Reference dimensions (iPhone X/11 Pro - common design reference)
const REFERENCE_WIDTH = 375;
const REFERENCE_HEIGHT = 812;

/**
 * Scales a size based on screen width
 * Use for width, padding, margin, etc.
 * 
 * @param size - Size in design units (based on reference width)
 * @returns Scaled size in pixels
 */
export const scale = (size: number): number => {
  const scaleFactor = SCREEN_WIDTH / REFERENCE_WIDTH;
  return Math.round(size * scaleFactor);
};

/**
 * Scales a size based on screen height
 * Use for height-specific elements
 * 
 * @param size - Size in design units (based on reference height)
 * @returns Scaled size in pixels
 */
export const verticalScale = (size: number): number => {
  const scaleFactor = SCREEN_HEIGHT / REFERENCE_HEIGHT;
  return Math.round(size * scaleFactor);
};

/**
 * Moderate scaling - balances between width and height scaling
 * Prevents elements from becoming too large on tablets
 * 
 * @param size - Size in design units
 * @param factor - Scaling factor (default 0.5)
 * @returns Scaled size in pixels
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  const scaleFactor = SCREEN_WIDTH / REFERENCE_WIDTH;
  return Math.round(size + (scaleFactor - 1) * size * factor);
};

/**
 * Scales font size with pixel ratio consideration
 * Ensures fonts remain crisp on high-DPI screens
 * 
 * @param size - Font size in design units
 * @returns Scaled font size in pixels
 */
export const scaleFont = (size: number): number => {
  const scaleFactor = SCREEN_WIDTH / REFERENCE_WIDTH;
  const scaledSize = size * scaleFactor;
  return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
};

/**
 * Get current screen width
 */
export const getScreenWidth = (): number => SCREEN_WIDTH;

/**
 * Get current screen height
 */
export const getScreenHeight = (): number => SCREEN_HEIGHT;

/**
 * Get screen aspect ratio
 */
export const getAspectRatio = (): number => SCREEN_WIDTH / SCREEN_HEIGHT;

/**
 * Check if device is in landscape orientation
 */
export const isLandscape = (): boolean => SCREEN_WIDTH > SCREEN_HEIGHT;

/**
 * Check if device is in portrait orientation
 */
export const isPortrait = (): boolean => SCREEN_HEIGHT > SCREEN_WIDTH;

/**
 * Get pixel ratio for high-DPI handling
 */
export const getPixelRatio = (): number => PixelRatio.get();

/**
 * Convert design units to device pixels
 * Useful for precise measurements
 */
export const toDevicePixels = (size: number): number => {
  return PixelRatio.roundToNearestPixel(size);
};

