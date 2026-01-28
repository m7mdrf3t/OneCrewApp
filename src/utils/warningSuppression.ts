/**
 * Centralized Warning Suppression
 * 
 * This file manages all warning suppressions to ensure they don't affect the application.
 * Only suppress warnings that are:
 * 1. From third-party libraries (not our code)
 * 2. Known issues that don't affect functionality
 * 3. Expected during app initialization
 */

import { LogBox } from 'react-native';

/**
 * Initialize warning suppressions
 * Call this once in App.tsx or index.ts
 */
export const initializeWarningSuppressions = () => {
  // Suppress warnings from StreamChat library (known issues)
  // These are from stream-chat-react-native v8.12.0 internal implementation
  LogBox.ignoreLogs([
    // StreamChat MessageActionList internal ScrollView key warning
    /Each child in a list should have a unique "key" prop/,
    /Check the render method of `ScrollView`/,
    
    // React Native deprecation warnings (if any)
    // These are usually from dependencies, not our code
    
    // Firebase native module warnings during startup (expected)
    /NativeEventEmitter.*requires a non-null argument/,
    
    // Expo warnings that don't affect functionality
    /Require cycle:/, // Common in React Native apps, doesn't affect functionality
  ]);

  // Suppress specific warning patterns that are known to be safe
  if (__DEV__) {
    // In development, we can be more verbose about what we're suppressing
    console.log('✅ Warning suppressions initialized');
  }
};

/**
 * Check if a warning should be suppressed
 * Use this for programmatic warning handling
 */
export const shouldSuppressWarning = (message: string): boolean => {
  const suppressPatterns = [
    /Each child in a list should have a unique "key" prop/,
    /Check the render method of `ScrollView`/,
    /NativeEventEmitter.*requires a non-null argument/,
    /Require cycle:/,
  ];

  return suppressPatterns.some(pattern => pattern.test(message));
};

/**
 * Safe console.warn wrapper
 * Only logs warnings that aren't suppressed
 */
export const safeWarn = (message: string, ...args: any[]) => {
  if (!shouldSuppressWarning(message)) {
    console.warn(message, ...args);
  }
};


