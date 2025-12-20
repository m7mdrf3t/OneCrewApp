import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

interface SkeletonMessageProps {
  isOwn?: boolean;
  isDark?: boolean;
}

const SkeletonMessage: React.FC<SkeletonMessageProps> = ({ 
  isOwn = false, 
  isDark = false 
}) => {
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









