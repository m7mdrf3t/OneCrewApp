import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileDetailPageProps } from '../types';
import { getInitials } from '../data/mockData';

const ProfileDetailPage: React.FC<ProfileDetailPageProps & { onLogout?: () => void }> = ({
  profile,
  onBack,
  onAssignToProject,
  onAddToTeam,
  myTeam,
  onStartChat,
  onMediaSelect,
  isCurrentUser = false,
  onLogout,
}) => {
  const isInTeam = myTeam.some(member => member.id === profile.id);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>{profile.name}</Text>
        {isCurrentUser && onLogout ? (
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Ionicons name="log-out" size={24} color="#ff4444" />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroInitials}>{getInitials(profile.name)}</Text>
        </View>
        <View style={styles.profileContainer}>
          <View style={styles.nameRow}> 
            <Text style={styles.name}>{profile.name}</Text>
            <Ionicons name={profile.about?.gender?.toLowerCase() === 'female' ? 'woman' : 'man'} size={18} color="#fff" />
          </View>
          <Text style={styles.lastSeen}>{profile.onlineStatus || 'Last seen recently'}</Text>

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaLight]}
              onPress={() => onAddToTeam(profile)}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.ctaText}>My Team</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaDark]}
              onPress={() => onAssignToProject(profile)}
            >
              <Text style={styles.ctaText}>Add to Crew</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{profile.stats.followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{profile.stats.projects}</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{profile.stats.likes}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>

          <View style={styles.bioContainer}>
            <Text style={styles.sectionHeader}>About</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>

          <View style={styles.skillsContainer}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsList}>
              {profile.skills.map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.actionsContainer}>
            {!isCurrentUser && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={onStartChat}
                >
                  <Ionicons name="chatbubble" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, isInTeam ? styles.removeButton : styles.addButton]}
                  onPress={() => onAddToTeam(profile)}
                >
                  <Ionicons name={isInTeam ? "remove" : "add"} size={20} color="#fff" />
                  <Text style={styles.secondaryButtonText}>
                    {isInTeam ? "Remove from Team" : "Add to Team"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.assignButton]}
                  onPress={() => onAssignToProject(profile)}
                >
                  <Ionicons name="briefcase" size={20} color="#fff" />
                  <Text style={styles.secondaryButtonText}>Assign to Project</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    padding: 12,
    paddingTop: 16,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  hero: {
    height: 360,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInitials: {
    fontSize: 220,
    fontWeight: '800',
    color: '#9ca3af',
  },
  profileContainer: {
    padding: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  lastSeen: {
    fontSize: 14,
    color: '#d1d5db',
    marginBottom: 16,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  ctaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  ctaLight: {
    backgroundColor: '#1f2937',
  },
  ctaDark: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bioContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  bio: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    borderWidth: 2,
    borderColor: '#111111',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
  },
  skillsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    backgroundColor: '#f4f4f5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffe6e6',
  },
});

export default ProfileDetailPage;
