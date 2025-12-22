import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, DimensionValue } from 'react-native';

interface SkeletonCardProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  isDark?: boolean;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({
  width = '100%' as const,
  height = 100,
  borderRadius = 12,
  style,
  isDark = false,
}) => {
  // Fallback component - simple gray box (always safe)
  return (
    <View 
      style={[
        styles.container, 
        { 
          width, 
          height, 
          borderRadius, 
          backgroundColor: isDark ? '#1f1f1f' : '#e5e7eb' 
        }, 
        style
      ]} 
    />
  );

  // TODO: After iOS rebuild, uncomment this to use real skeleton:
  /*
  try {
    const SkeletonPlaceholder = require('react-native-skeleton-placeholder').default;
    
    return (
      <SkeletonPlaceholder
        backgroundColor={isDark ? '#1f1f1f' : '#e5e7eb'}
        highlightColor={isDark ? '#2a2a2a' : '#f3f4f6'}
        borderRadius={borderRadius}
      >
        <View style={[styles.container, { width, height, borderRadius }, style]} />
      </SkeletonPlaceholder>
    );
  } catch (error) {
    return (
      <View 
        style={[
          styles.container, 
          { 
            width, 
            height, 
            borderRadius, 
            backgroundColor: isDark ? '#1f1f1f' : '#e5e7eb' 
          }, 
          style
        ]} 
      />
    );
  }
  */
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

export default SkeletonCard;




