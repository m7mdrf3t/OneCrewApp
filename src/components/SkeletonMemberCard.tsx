import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

interface SkeletonMemberCardProps {
  isDark?: boolean;
}

const SkeletonMemberCard: React.FC<SkeletonMemberCardProps> = ({ isDark = false }) => {
  return (
    <SkeletonPlaceholder
      backgroundColor={isDark ? '#1f1f1f' : '#e5e7eb'}
      highlightColor={isDark ? '#2a2a2a' : '#f3f4f6'}
      borderRadius={12}
    >
      <View style={styles.container}>
        <View style={styles.avatar} />
        <View style={styles.content}>
          <View style={styles.name} />
          <View style={styles.role} />
          <View style={styles.badge} />
        </View>
      </View>
    </SkeletonPlaceholder>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    width: '50%',
    height: 16,
    borderRadius: 4,
    marginBottom: 6,
  },
  role: {
    width: '40%',
    height: 14,
    borderRadius: 4,
    marginBottom: 6,
  },
  badge: {
    width: 80,
    height: 20,
    borderRadius: 10,
  },
});

export default SkeletonMemberCard;

