import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';

interface TeamMember {
  id: string;
  user_id: string;
  role?: string;
  user?: {
    id: string;
    name: string;
    email?: string;
    image_url?: string;
    specialty?: string;
  };
  added_at: string;
}

interface MyTeamPageProps {
  onBack: () => void;
}

const MyTeamPage: React.FC<MyTeamPageProps> = ({ onBack }) => {
  const { getMyTeamMembers, removeFromMyTeam } = useApi();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    setIsLoading(true);
    try {
      const response = await getMyTeamMembers();
      if (response.success && response.data) {
        console.log('🔍 Team members data structure:', JSON.stringify(response.data, null, 2));
        
        // Transform the data structure to match our interface
        const transformedMembers = response.data.map((member: any, index: number) => {
          console.log(`🔍 Processing member ${index}:`, JSON.stringify(member, null, 2));
          
          // Handle the case where user data might be in a 'users' object (singular) or 'user' object
          let userData = member.users || member.user; // API returns 'users' (singular), not 'user'
          console.log(`🔍 Member ${index} - member.users:`, member.users);
          console.log(`🔍 Member ${index} - member.user:`, member.user);
          console.log(`🔍 Member ${index} - userData:`, userData);
          
          if (!userData && member.users && Array.isArray(member.users) && member.users.length > 0) {
            userData = member.users[0]; // Take the first user if it's an array
            console.log(`🔍 Member ${index} - using users[0]:`, userData);
          }
          
          // If still no user data, try to extract from the member object itself
          if (!userData && (member.name || member.email)) {
            userData = {
              id: member.user_id || member.id,
              name: member.name || member.full_name,
              email: member.email,
              image_url: member.image_url,
              specialty: member.specialty || member.primary_role
            };
            console.log(`🔍 Member ${index} - extracted from member:`, userData);
          }
          
          console.log(`🔍 Member ${index} - final userData:`, userData);
          
          const transformedMember = {
            id: `${member.team_id || 'team'}-${member.user_id || index}-${index}`, // Ensure unique ID using index
            user_id: member.user_id,
            role: member.role,
            user: userData ? {
              id: userData.id,
              name: userData.name || 'Unknown User',
              email: userData.email,
              image_url: userData.image_url,
              specialty: userData.specialty || userData.primary_role
            } : {
              id: member.user_id,
              name: 'Unknown User',
              email: undefined,
              image_url: undefined,
              specialty: undefined
            },
            added_at: member.joined_at || new Date().toISOString()
          };
          
          console.log(`🔍 Transformed member ${index}:`, JSON.stringify(transformedMember, null, 2));
          return transformedMember;
        });
        
        console.log('🔍 Transformed team members:', JSON.stringify(transformedMembers, null, 2));
        console.log('🔍 Team members count:', transformedMembers.length);
        console.log('🔍 First member structure:', transformedMembers[0] ? JSON.stringify(transformedMembers[0], null, 2) : 'No members');
        setTeamMembers(transformedMembers);
      } else {
        console.error('Failed to load team members:', response.error);
        Alert.alert('Error', 'Failed to load team members');
      }
    } catch (error) {
      console.error('Error loading team members:', error);
      Alert.alert('Error', 'Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    const userName = member.user?.name || 'Unknown User';
    Alert.alert(
      'Remove Team Member',
      `Are you sure you want to remove ${userName} from your team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsRemoving(member.id);
            try {
              const response = await removeFromMyTeam(member.user_id);
              if (response.success) {
                // Remove from local state
                setTeamMembers(prev => prev.filter(m => m.id !== member.id));
                Alert.alert('Success', `${userName} has been removed from your team`);
              } else {
                Alert.alert('Error', response.error || 'Failed to remove team member');
              }
            } catch (error) {
              console.error('Error removing team member:', error);
              Alert.alert('Error', 'Failed to remove team member');
            } finally {
              setIsRemoving(null);
            }
          }
        }
      ]
    );
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    const firstInitial = names[0]?.[0] || '';
    const lastInitial = names.length > 1 ? names[names.length - 1]?.[0] : '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Team</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading team members...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {teamMembers.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>
                {teamMembers.length} Team Member{teamMembers.length !== 1 ? 's' : ''}
              </Text>
              {teamMembers.map((member, index) => {
                console.log(`🔍 Rendering member ${index}:`, member.user?.name || 'No name');
                return (
                  <View key={member.id} style={styles.memberCard}>
                    <View style={styles.memberInfo}>
                      <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {getInitials(member.user?.name || 'Unknown')}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.memberDetails}>
                        <Text style={styles.memberName}>{member.user?.name || 'Unknown User'}</Text>
                        {member.user?.email && (
                          <Text style={styles.memberEmail}>{member.user.email}</Text>
                        )}
                        {member.user?.specialty && (
                          <Text style={styles.memberSpecialty}>{member.user.specialty}</Text>
                        )}
                        {member.role && (
                          <Text style={styles.memberRole}>Role: {member.role}</Text>
                        )}
                        <Text style={styles.memberDate}>
                          Added {formatDate(member.added_at)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveMember(member)}
                      disabled={isRemoving === member.id}
                    >
                      {isRemoving === member.id ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                      ) : (
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Team Members</Text>
              <Text style={styles.emptySubtitle}>
                Add people to your team by clicking the + button on user profiles
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    minHeight: 90,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  memberSpecialty: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  memberDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  removeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default MyTeamPage;
