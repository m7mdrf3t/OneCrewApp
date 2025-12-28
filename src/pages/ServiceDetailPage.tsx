import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { spacing, semanticSpacing } from '../constants/spacing';
import { MOCK_PROFILES, getInitials } from '../data/mockData';
import { useApi } from '../contexts/ApiContext';
import { useAppNavigation } from '../navigation/NavigationContext';
import { RootStackScreenProps } from '../navigation/types';

interface ServiceDetailPageProps {
  service?: {
    label: string;
    users?: number;
  };
  onBack?: () => void;
  onProfileSelect?: (profile: any) => void;
  onAddToTeam?: (profile: any) => void;
  onAssignToProject?: (profile: any) => void;
  onStartChat?: (profile: any) => void;
  myTeam?: any[];
}

const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({
  service: serviceProp,
  onBack: onBackProp,
  onProfileSelect,
  onAddToTeam,
  onAssignToProject,
  onStartChat,
  myTeam = [],
}) => {
  // Get route params if available (React Navigation)
  const route = useRoute<RootStackScreenProps<'details'>['route']>();
  const navigation = useNavigation();
  const routeParams = route.params;
  
  const { goBack } = useAppNavigation();
  const onBack = onBackProp || goBack;
  
  // Get service from route params or prop
  const serviceData = routeParams?.serviceData || serviceProp;
  const service = serviceData?.label ? serviceData : (serviceProp || { label: '', users: 0 });
  
  const { isGuest } = useApi();
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
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          {isInTeam && (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={18} color="#000" />
            </View>
          )}
          <View style={styles.bagBadge}>
            <Ionicons name="briefcase" size={18} color="#fff" />
          </View>
        </View>
        <View style={styles.initialsContainer}>
          <Text style={styles.initialsText}>{getInitials(profile.name)}</Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.nameRow}>
            <View style={[styles.dot, { backgroundColor: profile.onlineStatus === 'online' ? '#10b981' : '#6b7280' }]} />
            <Text style={styles.profileName}>{profile.name}</Text>
          </View>
          <Text style={styles.profileSpecialty}>{profile.specialty}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (isGuest) {
              Alert.alert(
                'Sign Up Required',
                'Create an account to add users to your team.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Up', onPress: () => {} },
                  { text: 'Sign In', onPress: () => {} },
                ]
              );
            } else {
              onAddToTeam?.(profile);
            }
          }}
          style={styles.plusBadge}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
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
    padding: semanticSpacing.containerPadding,
    paddingTop: semanticSpacing.containerPadding,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: semanticSpacing.containerPadding,
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
    marginTop: semanticSpacing.iconPaddingSmall,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  profilesContainer: {
    padding: semanticSpacing.containerPadding,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  profileCard: {
    width: '48%',
    backgroundColor: '#000',
    borderRadius: 16,
    padding: semanticSpacing.modalPadding,
    marginBottom: semanticSpacing.sectionGapLarge,
    position: 'relative',
  },
  cardHeader: {
    position: 'absolute',
    top: semanticSpacing.containerPadding,
    right: semanticSpacing.containerPadding,
    flexDirection: 'row',
    gap: semanticSpacing.buttonPadding,
  },
  checkBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: semanticSpacing.buttonPadding,
  },
  bagBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  plusBadge: {
    position: 'absolute',
    top: semanticSpacing.containerPadding,
    left: semanticSpacing.containerPadding,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsContainer: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 96,
    fontWeight: '800',
    color: '#fff',
  },
  cardFooter: {
    marginTop: semanticSpacing.containerPadding,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: semanticSpacing.buttonPadding,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  profileSpecialty: {
    fontSize: 14,
    color: '#d1d5db',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40, // Keep 40px for empty states
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: semanticSpacing.sectionGapLarge,
    marginBottom: semanticSpacing.buttonPadding,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ServiceDetailPage;
