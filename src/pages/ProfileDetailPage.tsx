import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileDetailPageProps } from '../types';
import { getInitials } from '../data/mockData';
import { useApi } from '../contexts/ApiContext';

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
  const { api } = useApi();
  const [userProfile, setUserProfile] = useState(profile);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch fresh user data if we have a user ID
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!profile?.id || profile.id === '' || profile.id === 'undefined') {
        console.log('⚠️ No valid profile ID provided, skipping fetch');
        console.log('⚠️ Profile ID value:', profile?.id);
        return;
      }
      
      // Skip fetch if we already have complete profile data
      if (profile.bio && profile.skills && profile.stats) {
        console.log('✅ Profile data already complete, skipping fetch');
        setUserProfile(profile);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('👤 Fetching user profile for ID:', profile.id);
        console.log('👤 Profile object:', profile);
        const response = await api.getUserById(profile.id);
        
        if (response.success && response.data) {
          console.log('✅ User profile fetched successfully');
          // Transform the data to match expected format
          const transformedProfile = {
            ...response.data,
            stats: (response.data as any).stats || {
              followers: '0',
              projects: 0,
              likes: '0'
            },
            skills: (response.data as any).skills || [],
            bio: response.data.bio || 'No bio available',
            onlineStatus: (response.data as any).onlineStatus || response.data.online_last_seen || 'Last seen recently',
            about: (response.data as any).about || {
              gender: 'unknown'
            }
          };
          setUserProfile(transformedProfile);
        } else {
          console.error('❌ Failed to fetch user profile:', response.error);
          setError('Failed to load profile');
        }
      } catch (err: any) {
        console.error('❌ Error fetching user profile:', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [profile?.id, api]);

  const isInTeam = myTeam.some(member => member.id === userProfile.id);

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Loading...</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Error</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            setError(null);
            setIsLoading(true);
            // Re-trigger the useEffect by updating the profile ID
            setUserProfile(profile);
          }}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>{userProfile.name}</Text>
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
          <Text style={styles.heroInitials}>{getInitials(userProfile.name)}</Text>
        </View>
        <View style={styles.profileContainer}>
          <View style={styles.nameRow}> 
            <Text style={styles.name}>{userProfile.name}</Text>
            <Ionicons name={userProfile.about?.gender?.toLowerCase() === 'female' ? 'woman' : 'man'} size={18} color="#fff" />
          </View>
          <Text style={styles.lastSeen}>{userProfile.onlineStatus || userProfile.online_last_seen || 'Last seen recently'}</Text>

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaLight]}
              onPress={() => onAddToTeam(userProfile)}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.ctaText}>My Team</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaDark]}
              onPress={() => onAssignToProject(userProfile)}
            >
              <Text style={styles.ctaText}>Add to Crew</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{userProfile.stats?.followers || '0'}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{userProfile.stats?.projects || '0'}</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{userProfile.stats?.likes || '0'}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>

          <View style={styles.bioContainer}>
            <Text style={styles.sectionHeader}>About</Text>
            <Text style={styles.bio}>{userProfile.bio || 'No bio available'}</Text>
          </View>

          <View style={styles.skillsContainer}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsList}>
              {(userProfile.skills || []).map((skill: string, index: number) => (
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  addButton: {
    backgroundColor: '#10b981',
  },
  removeButton: {
    backgroundColor: '#ef4444',
  },
  assignButton: {
    backgroundColor: '#f59e0b',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#71717a',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileDetailPage;
