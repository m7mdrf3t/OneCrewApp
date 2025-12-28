import React from 'react';
import { View, StyleSheet } from 'react-native';

interface SkeletonMessageProps {
  isOwn?: boolean;
  isDark?: boolean;
}

const SkeletonMessage: React.FC<SkeletonMessageProps> = ({ 
  isOwn = false, 
  isDark = false 
}) => {
  // Fallback component - simple gray boxes (always safe)
  return (
    <View style={[styles.container, isOwn && styles.containerOwn]}>
      <View style={[styles.bubble, isOwn && styles.bubbleOwn, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]}>
        <View style={[styles.line1, { backgroundColor: isDark ? '#1f1f1f' : '#d1d5db' }]} />
        <View style={[styles.line2, { backgroundColor: isDark ? '#1f1f1f' : '#d1d5db' }]} />
      </View>
    </View>
  );

  // TODO: After iOS rebuild, uncomment this to use real skeleton:
  /*
  try {
    const SkeletonPlaceholder = require('react-native-skeleton-placeholder').default;
    
    return (
      <View style={[styles.container, isOwn && styles.containerOwn]}>
        <SkeletonPlaceholder
          backgroundColor={isDark ? '#1f1f1f' : '#e5e7eb'}
          highlightColor={isDark ? '#2a2a2a' : '#f3f4f6'}
          borderRadius={18}
        >
          <View style={[styles.bubble, isOwn && styles.bubbleOwn]}>
            <View style={styles.line1} />
            <View style={styles.line2} />
          </View>
        </SkeletonPlaceholder>
      </View>
    );
  } catch (error) {
    return (
      <View style={[styles.container, isOwn && styles.containerOwn]}>
        <View style={[styles.bubble, isOwn && styles.bubbleOwn, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]}>
          <View style={[styles.line1, { backgroundColor: isDark ? '#1f1f1f' : '#d1d5db' }]} />
          <View style={[styles.line2, { backgroundColor: isDark ? '#1f1f1f' : '#d1d5db' }]} />
        </View>
      </View>
    );
  }
  */
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
  },
  containerOwn: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
  },
  bubbleOwn: {
    backgroundColor: '#3b82f6',
  },
  line1: {
    width: '80%',
    height: 14,
    borderRadius: 4,
    marginBottom: 6,
  },
  line2: {
    width: '60%',
    height: 14,
    borderRadius: 4,
  },
});

export default SkeletonMessage;











