import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

interface SkeletonSectionCardProps {
  isDark?: boolean;
}

const SkeletonSectionCard: React.FC<SkeletonSectionCardProps> = ({ isDark = false }) => {
  return (
    <SkeletonPlaceholder
      backgroundColor={isDark ? '#1f1f1f' : '#e5e7eb'}
      highlightColor={isDark ? '#2a2a2a' : '#f3f4f6'}
      borderRadius={12}
    >
      <View style={styles.container}>
        <View style={styles.iconContainer} />
        <View style={styles.content}>
          <View style={styles.title} />
        </View>
        <View style={styles.chevron} />
      </View>
    </SkeletonPlaceholder>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  title: {
    width: '70%',
    height: 20,
    borderRadius: 4,
  },
  chevron: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});

export default SkeletonSectionCard;





