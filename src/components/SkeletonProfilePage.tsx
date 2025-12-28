import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';

interface SkeletonProfilePageProps {
  isDark?: boolean;
}

const SkeletonProfilePage: React.FC<SkeletonProfilePageProps> = ({ isDark = false }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={[styles.backButton, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
          <View style={[styles.headerTitle, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
          <View style={[styles.headerRight, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
        </View>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={[styles.heroSection, { backgroundColor: isDark ? '#1f1f1f' : '#f3f4f6' }]}>
            <View style={styles.heroImage} />
          </View>
          
          {/* Profile Info Section */}
          <View style={styles.profileInfo}>
            <View style={[styles.avatar, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
            <View style={styles.nameContainer}>
              <View style={[styles.name, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
              <View style={[styles.subtitle, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
            </View>
          </View>
          
          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={[styles.statItem, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
            <View style={[styles.statItem, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
            <View style={[styles.statItem, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
          </View>
          
          {/* About Section */}
          <View style={styles.section}>
            <View style={[styles.sectionTitle, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
            <View style={[styles.sectionLine1, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
            <View style={[styles.sectionLine2, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
            <View style={[styles.sectionLine3, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
          </View>
          
          {/* Skills/Details Section */}
          <View style={styles.section}>
            <View style={[styles.sectionTitle, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
            <View style={styles.tagsContainer}>
              <View style={[styles.tag, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
              <View style={[styles.tag, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
              <View style={[styles.tag, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
              <View style={[styles.tag, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
            </View>
          </View>
          
          {/* Additional Section */}
          <View style={styles.section}>
            <View style={[styles.sectionTitle, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
            <View style={[styles.sectionLine1, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
            <View style={[styles.sectionLine2, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
          </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    width: 120,
    height: 20,
    borderRadius: 4,
  },
  headerRight: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    width: '100%',
    height: 300,
    backgroundColor: '#f3f4f6',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: -50,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
    marginRight: 16,
  },
  nameContainer: {
    flex: 1,
    marginTop: 40,
  },
  name: {
    width: '70%',
    height: 24,
    borderRadius: 4,
    marginBottom: 8,
  },
  subtitle: {
    width: '50%',
    height: 16,
    borderRadius: 4,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  statItem: {
    width: 60,
    height: 50,
    borderRadius: 8,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    width: 100,
    height: 18,
    borderRadius: 4,
    marginBottom: 12,
  },
  sectionLine1: {
    width: '100%',
    height: 14,
    borderRadius: 4,
    marginBottom: 8,
  },
  sectionLine2: {
    width: '90%',
    height: 14,
    borderRadius: 4,
    marginBottom: 8,
  },
  sectionLine3: {
    width: '80%',
    height: 14,
    borderRadius: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    width: 80,
    height: 28,
    borderRadius: 14,
  },
});

export default SkeletonProfilePage;











