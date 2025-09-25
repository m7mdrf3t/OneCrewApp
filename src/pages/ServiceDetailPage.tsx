import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_PROFILES } from '../data/mockData';

interface ServiceDetailPageProps {
  service: {
    label: string;
    users?: number;
  };
  onBack: () => void;
  onProfileSelect: (profile: any) => void;
  onAddToTeam?: (profile: any) => void;
  onAssignToProject?: (profile: any) => void;
  onStartChat?: (profile: any) => void;
  myTeam?: any[];
}

const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({
  service,
  onBack,
  onProfileSelect,
  onAddToTeam,
  onAssignToProject,
  onStartChat,
  myTeam = [],
}) => {
  // Filter profiles based on the service
  const filteredProfiles = useMemo(() => {
    const serviceLabel = service.label.toLowerCase();
    
    return MOCK_PROFILES.filter(profile => {
      const specialty = profile.specialty.toLowerCase();
      const category = profile.category.toLowerCase();
      
      // Map service labels to profile specialties
      if (serviceLabel === 'actor') {
        return specialty.includes('actor') || specialty.includes('actress');
      } else if (serviceLabel === 'singer') {
        return specialty.includes('singer') || specialty.includes('voice');
      } else if (serviceLabel === 'dancer') {
        return specialty.includes('dancer') || specialty.includes('dance');
      } else if (serviceLabel === 'producer') {
        return specialty.includes('producer');
      } else if (serviceLabel === 'director') {
        return specialty.includes('director');
      } else if (serviceLabel === 'writer') {
        return specialty.includes('writer') || specialty.includes('author');
      } else if (serviceLabel === 'dop') {
        return specialty.includes('dop') || specialty.includes('cinematographer');
      } else if (serviceLabel === 'editor') {
        return specialty.includes('editor');
      } else if (serviceLabel === 'composer') {
        return specialty.includes('composer') || specialty.includes('music');
      } else if (serviceLabel === 'sound engineer') {
        return specialty.includes('sound') || specialty.includes('audio');
      } else if (serviceLabel === 'vfx artist') {
        return specialty.includes('vfx') || specialty.includes('visual');
      } else if (serviceLabel === 'colorist') {
        return specialty.includes('colorist') || specialty.includes('color');
      } else if (serviceLabel === 'ai technical') {
        return specialty.includes('ai') || specialty.includes('technical');
      }
      
      return false;
    });
  }, [service.label]);

  const renderProfileCard = (profile: any) => {
    const isInTeam = myTeam.some(member => member.id === profile.id);
    
    return (
      <TouchableOpacity
        key={profile.id}
        style={styles.profileCard}
        onPress={() => onProfileSelect(profile)}
      >
        <Image source={{ uri: profile.imageUrl }} style={styles.profileImage} />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileSpecialty}>{profile.specialty}</Text>
          <Text style={styles.profileLocation}>{profile.location}</Text>
          <View style={styles.skillsContainer}>
            {profile.skills.slice(0, 2).map((skill: string, index: number) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
          <View style={styles.statsContainer}>
            <Text style={styles.statText}>{profile.stats.followers} followers</Text>
            <Text style={styles.statText}>•</Text>
            <Text style={styles.statText}>{profile.stats.projects} projects</Text>
          </View>
        </View>
        <View style={styles.profileActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => onStartChat?.(profile)}
          >
            <Ionicons name="chatbubble" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, isInTeam ? styles.removeButton : styles.addButton]}
            onPress={() => onAddToTeam?.(profile)}
          >
            <Ionicons name={isInTeam ? "remove" : "add"} size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{service.label}</Text>
          <Text style={styles.subtitle}>
            {filteredProfiles.length} {filteredProfiles.length === 1 ? 'profile' : 'profiles'} available
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredProfiles.length > 0 ? (
          <View style={styles.profilesContainer}>
            {filteredProfiles.map(renderProfileCard)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people" size={64} color="#d4d4d8" />
            <Text style={styles.emptyTitle}>No profiles found</Text>
            <Text style={styles.emptySubtitle}>
              No {service.label.toLowerCase()} profiles are available at the moment.
            </Text>
          </View>
        )}
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
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#71717a',
    marginTop: 2,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  profilesContainer: {
    padding: 12,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#d4d4d8',
    alignItems: 'center',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  profileSpecialty: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 2,
  },
  profileLocation: {
    fontSize: 12,
    color: '#71717a',
    marginBottom: 8,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  skillTag: {
    backgroundColor: '#f4f4f5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  skillText: {
    fontSize: 10,
    color: '#000',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#71717a',
    marginRight: 8,
  },
  profileActions: {
    flexDirection: 'column',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#000',
  },
  addButton: {
    backgroundColor: '#10b981',
  },
  removeButton: {
    backgroundColor: '#ef4444',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ServiceDetailPage;
