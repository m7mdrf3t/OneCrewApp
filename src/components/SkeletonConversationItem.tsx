import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

interface SkeletonConversationItemProps {
  isDark?: boolean;
}

const SkeletonConversationItem: React.FC<SkeletonConversationItemProps> = ({ isDark = false }) => {
  return (
    <SkeletonPlaceholder
      backgroundColor={isDark ? '#1f1f1f' : '#e5e7eb'}
      highlightColor={isDark ? '#2a2a2a' : '#f3f4f6'}
      borderRadius={25}
    >
      <View style={styles.container}>
        <View style={styles.avatar} />
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.name} />
            <View style={styles.time} />
          </View>
          <View style={styles.message} />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    width: '60%',
    height: 16,
    borderRadius: 4,
  },
  time: {
    width: 50,
    height: 12,
    borderRadius: 4,
  },
  message: {
    width: '80%',
    height: 14,
    borderRadius: 4,
  },
  chevron: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});

export default SkeletonConversationItem;









