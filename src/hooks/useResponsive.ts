/**
 * useResponsive Hook
 * 
 * React hook for responsive design that provides current breakpoint,
 * device type, orientation, and responsive value selection.
 */

import { useState, useEffect, useCallback } from 'react';
import { Dimensions, ScaledSize } from 'react-native';
import {
  getCurrentBreakpoint,
  getDeviceType,
  Breakpoint,
  DeviceType,
  selectResponsiveValue,
  isPhone,
  isTablet,
  isFoldable,
  matchesBreakpoint,
  isAtLeastBreakpoint,
  isAtMostBreakpoint,
  getSpacingMultiplier,
} from '../utils/responsive';
import { isLandscape, isPortrait } from '../utils/dimensions';

interface ResponsiveState {
  breakpoint: Breakpoint;
  deviceType: DeviceType;
  isPhone: boolean;
  isTablet: boolean;
  isFoldable: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  spacingMultiplier: number;
  width: number;
  height: number;
}

/**
 * Main responsive hook
 * Returns current responsive state and utilities
 */
export const useResponsive = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [state, setState] = useState<ResponsiveState>(() => ({
    breakpoint: getCurrentBreakpoint(),
    deviceType: getDeviceType(),
    isPhone: isPhone(),
    isTablet: isTablet(),
    isFoldable: isFoldable(),
    isLandscape: isLandscape(),
    isPortrait: isPortrait(),
    spacingMultiplier: getSpacingMultiplier(),
    width: dimensions.width,
    height: dimensions.height,
  }));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }: { window: ScaledSize }) => {
      setDimensions(window);
      setState({
        breakpoint: getCurrentBreakpoint(),
        deviceType: getDeviceType(),
        isPhone: isPhone(),
        isTablet: isTablet(),
        isFoldable: isFoldable(),
        isLandscape: isLandscape(),
        isPortrait: isPortrait(),
        spacingMultiplier: getSpacingMultiplier(),
        width: window.width,
        height: window.height,
      });
    });

    return () => subscription?.remove();
  }, []);

  // Update state when dimensions change
  useEffect(() => {
    setState({
      breakpoint: getCurrentBreakpoint(),
      deviceType: getDeviceType(),
      isPhone: isPhone(),
      isTablet: isTablet(),
      isFoldable: isFoldable(),
      isLandscape: isLandscape(),
      isPortrait: isPortrait(),
      spacingMultiplier: getSpacingMultiplier(),
      width: dimensions.width,
      height: dimensions.height,
    });
  }, [dimensions]);

  /**
   * Select responsive value based on breakpoint
   */
  const selectValue = useCallback(<T,>(values: Partial<Record<Breakpoint, T>>, defaultValue?: T): T => {
    return selectResponsiveValue(values, defaultValue);
  }, []);

  /**
   * Check if current breakpoint matches
   */
  const matches = useCallback((...breakpoints: Breakpoint[]): boolean => {
    return matchesBreakpoint(...breakpoints);
  }, [state.breakpoint]);

  /**
   * Check if at least breakpoint
   */
  const atLeast = useCallback((breakpoint: Breakpoint): boolean => {
    return isAtLeastBreakpoint(breakpoint);
  }, [state.breakpoint]);

  /**
   * Check if at most breakpoint
   */
  const atMost = useCallback((breakpoint: Breakpoint): boolean => {
    return isAtMostBreakpoint(breakpoint);
  }, [state.breakpoint]);

  return {
    ...state,
    selectValue,
    matches,
    atLeast,
    atMost,
  };
};

/**
 * Simplified hook for just breakpoint
 */
export const useBreakpoint = (): Breakpoint => {
  const { breakpoint } = useResponsive();
  return breakpoint;
};

/**
 * Simplified hook for device type
 */
export const useDeviceType = (): DeviceType => {
  const { deviceType } = useResponsive();
  return deviceType;
};

/**
 * Hook for responsive value selection
 */
export const useResponsiveValue = <T,>(
  values: Partial<Record<Breakpoint, T>>,
  defaultValue?: T
): T => {
  const { selectValue } = useResponsive();
  return selectValue(values, defaultValue);
};

