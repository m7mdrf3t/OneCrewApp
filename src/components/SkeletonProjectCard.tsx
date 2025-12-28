import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

interface SkeletonProjectCardProps {
  isDark?: boolean;
}

const SkeletonProjectCard: React.FC<SkeletonProjectCardProps> = ({ isDark = false }) => {
  return (
    <SkeletonPlaceholder
      backgroundColor={isDark ? '#1f1f1f' : '#e5e7eb'}
      highlightColor={isDark ? '#2a2a2a' : '#f3f4f6'}
      borderRadius={12}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.title} />
          <View style={styles.headerRight}>
            <View style={styles.badge} />
            <View style={styles.menu} />
          </View>
        </View>
        <View style={styles.description} />
        <View style={styles.details}>
          <View style={styles.detailItem} />
          <View style={styles.detailItem} />
        </View>
        <View style={styles.footer}>
          <View style={styles.footerItem} />
          <View style={styles.footerItem} />
        </View>
      </View>
    </SkeletonPlaceholder>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    width: '60%',
    height: 20,
    borderRadius: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    width: 60,
    height: 20,
    borderRadius: 10,
  },
  menu: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  description: {
    width: '90%',
    height: 16,
    borderRadius: 4,
    marginBottom: 12,
  },
  details: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    width: 80,
    height: 14,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  footerItem: {
    width: 100,
    height: 14,
    borderRadius: 4,
  },
});

export default SkeletonProjectCard;












