import React, { Component, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

interface SafeSkeletonWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  isDark?: boolean;
}

interface SafeSkeletonWrapperState {
  hasError: boolean;
}

/**
 * Error boundary wrapper for SkeletonPlaceholder components
 * Prevents app crashes when native module (BVLinearGradient) isn't linked
 */
export class SafeSkeletonWrapper extends Component<SafeSkeletonWrapperProps, SafeSkeletonWrapperState> {
  constructor(props: SafeSkeletonWrapperProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): SafeSkeletonWrapperState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Silently handle - native module not linked yet
    if (error?.message?.includes('BVLinearGradient')) {
      // Expected error - native module not linked
      return;
    }
    // Log unexpected errors
    console.warn('⚠️ [SafeSkeletonWrapper] Error:', error?.message);
  }

  render() {
    if (this.state.hasError) {
      // Return fallback or simple placeholder
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }
      // Default fallback: simple gray box
      return (
        <View style={[styles.fallback, { backgroundColor: this.props.isDark ? '#1f1f1f' : '#e5e7eb' }]} />
      );
    }

    return <>{this.props.children}</>;
  }
}

const styles = StyleSheet.create({
  fallback: {
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
});

