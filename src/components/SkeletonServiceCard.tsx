import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

interface SkeletonServiceCardProps {
  isDark?: boolean;
}

const SkeletonServiceCard: React.FC<SkeletonServiceCardProps> = ({ isDark = false }) => {
  return (
    <SkeletonPlaceholder
      backgroundColor={isDark ? '#1f1f1f' : '#e5e7eb'}
      highlightColor={isDark ? '#2a2a2a' : '#f3f4f6'}
      borderRadius={12}
    >
      <View style={styles.container}>
        <View style={styles.icon} />
        <View style={styles.content}>
          <View style={styles.title} />
          <View style={styles.description} />
        </View>
      </View>
    </SkeletonPlaceholder>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    width: '60%',
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
  },
  description: {
    width: '80%',
    height: 12,
    borderRadius: 4,
  },
});

export default SkeletonServiceCard;

