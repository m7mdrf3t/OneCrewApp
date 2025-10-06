import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';

interface User {
  id: string;
  name: string;
  email?: string;
  category: 'crew' | 'talent' | 'company';
  primary_role?: string;
  profile_completeness: number;
  online_last_seen?: string;
  image_url?: string;
  bio?: string;
  specialty?: string;
  skills?: string[];
  about?: {
    gender?: string;
    age?: number;
    nationality?: string;
    location?: string;
    height_cm?: number;
    weight_kg?: number;
    skin_tone?: string;
    hair_color?: string;
    skin_tone_id?: string;
    hair_color_id?: string;
    skin_tones?: { name: string };
    hair_colors?: { name: string };
    eye_color?: string;
    chest_cm?: number;
    waist_cm?: number;
    hips_cm?: number;
    shoe_size_eu?: number;
    reel_url?: string;
    union_member?: boolean;
    dialects?: string[];
    travel_ready?: boolean;
  };
}

interface DirectoryPageProps {
  section: {
    key: string;
    title: string;
    items: Array<{ label: string; users?: number }>;
  };
  onBack: () => void;
  onUserSelect: (user: User) => void;
}

const DirectoryPage: React.FC<DirectoryPageProps> = ({
  section,
  onBack,
  onUserSelect,
}) => {
  const { api } = useApi();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [loadingCompleteData, setLoadingCompleteData] = useState<Set<string>>(new Set());

  const fetchUsers = async () => {
    try {
      console.log('👥 Fetching users for directory...');
      setError(null);
      const response = await api.getUsers({ limit: 100 });
      
      if (response.success && response.data) {
        const usersArray = Array.isArray(response.data) ? response.data : [];
        console.log('✅ Users fetched successfully:', usersArray.length);
        
        // For now, use basic user data to avoid rate limiting
        // TODO: Implement batch API call or server-side complete data fetching
        const completeUsers = usersArray;
        
        setUsers(completeUsers);
        console.log('✅ Complete user data fetched:', completeUsers.length);
      } else {
        console.error('❌ Failed to fetch users:', response.error);
        setError('Failed to load users');
      }
    } catch (err: any) {
      console.error('❌ Error fetching users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const fetchCompleteUserData = async (userId: string): Promise<User | null> => {
    if (loadingCompleteData.has(userId)) {
      return null; // Already loading
    }

    setLoadingCompleteData(prev => new Set(prev).add(userId));
    
    try {
      console.log(`🔍 Fetching complete data for user: ${userId}`);
      const completeResponse = await api.getUserByIdDirect(userId);
      
      if (completeResponse.success && completeResponse.data) {
        const updatedUser = completeResponse.data;
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId ? updatedUser : user
          )
        );
        console.log(`✅ Complete data fetched for user: ${userId}`);
        return updatedUser;
      }
    } catch (err) {
      console.warn(`⚠️ Failed to fetch complete data for user ${userId}:`, err);
    } finally {
      setLoadingCompleteData(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
    return null;
  };

  // Filter users based on section and items
  const filteredUsers = useMemo(() => {
    if (!users.length) return [];
    
    // Map section items to actual user roles
    const roleMapping: { [key: string]: string[] } = {
      'Actor': ['actor'],
      'Singer': ['singer'],
      'Dancer': ['dancer'],
      'Director': ['director'],
      'Producer': ['producer'],
      'Writer': ['scriptwriter', 'writer'],
      'DOP': ['dop'],
      'Editor': ['editor'],
      'Composer': ['composer'],
      'VFX Artist': ['vfx'],
      'Colorist': ['colorist'],
      'Sound Engineer': ['sound_engineer'],
      'Sound Designer': ['sound_designer'],
      'Gaffer': ['gaffer'],
      'Grip': ['grip'],
      'Makeup Artist': ['makeup_artist'],
      'Stylist': ['stylist'],
      'Production House': ['production_house'],
      'Agency': ['agency'],
      'Studio': ['studio'],
      'Post House': ['post_house'],
      'Equipment Rental': ['equipment_rental'],
    };

    const sectionUsers: { [key: string]: User[] } = {};
    
    section.items.forEach(item => {
      const roles = roleMapping[item.label] || [];
      const categoryUsers = users.filter(user => {
        // Check if user's category matches section
        if (section.key === 'talent' && user.category !== 'talent') return false;
        if (section.key === 'crew' && user.category !== 'crew') return false;
        if (section.key === 'onehub' && user.category !== 'company') return false;
        
        // Check if user's role matches the item
        return roles.some(role => 
          user.primary_role?.toLowerCase().includes(role.toLowerCase())
        );
      });
      
      sectionUsers[item.label] = categoryUsers;
    });

    return sectionUsers;
  }, [users, section]);

  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    const firstInitial = names[0]?.[0] || '';
    const lastInitial = names.length > 1 ? names[names.length - 1]?.[0] : '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  const getOnlineStatus = (user: User) => {
    if (user.online_last_seen) {
      const lastSeen = new Date(user.online_last_seen);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
      
      if (diffMinutes < 5) return 'online';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
      return 'offline';
    }
    return 'offline';
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>{section.title}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading users...</Text>
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
        <Text style={styles.title}>
          {selectedSubcategory ? selectedSubcategory : section.title}
        </Text>
        {selectedSubcategory && (
          <TouchableOpacity 
            onPress={() => setSelectedSubcategory(null)} 
            style={styles.backButton}
          >
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!selectedSubcategory ? (
          // Show subcategories
          <View style={styles.subcategoriesContainer}>
            {section.items.map((item) => {
              const itemUsers = (filteredUsers as any)[item.label] || [];
              
              return (
                <TouchableOpacity
                  key={item.label}
                  style={styles.subcategoryCard}
                  onPress={() => setSelectedSubcategory(item.label)}
                  activeOpacity={0.7}
                >
                  <View style={styles.subcategoryContent}>
                    <View style={styles.subcategoryIcon}>
                      <Ionicons name="people" size={24} color="#3b82f6" />
                    </View>
                    <View style={styles.subcategoryInfo}>
                      <Text style={styles.subcategoryTitle}>{item.label}</Text>
                      <Text style={styles.subcategoryCount}>{itemUsers.length} profiles</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#71717a" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          // Show users for selected subcategory
          <View style={styles.usersContainer}>
            {(() => {
              const itemUsers = (filteredUsers as any)[selectedSubcategory] || [];
              
              return itemUsers.length > 0 ? (
                <View style={styles.usersGrid}>
                  {itemUsers.map((user: User) => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.userCard}
                      onPress={async () => {
                        // For talent users without complete data, fetch it first
                        if (user.category === 'talent' && !user.about) {
                          const updatedUser = await fetchCompleteUserData(user.id);
                          onUserSelect(updatedUser || user);
                        } else {
                          onUserSelect(user);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.userCardContent}>
                        <View style={styles.userInitials}>
                          <Text style={styles.initialsText}>
                            {getInitials(user.name)}
                          </Text>
                        </View>
                        
                        <View style={styles.userInfo}>
                          <View style={styles.statusRow}>
                            <View style={[
                              styles.statusDot,
                              { backgroundColor: getOnlineStatus(user) === 'online' ? '#10b981' : '#9ca3af' }
                            ]} />
                            <Text style={styles.userName}>{user.name}</Text>
                          </View>
                          <Text style={styles.userRole}>
                            {user.primary_role?.replace('_', ' ').toUpperCase() || 'Member'}
                          </Text>
                          
                          {/* Talent-specific details */}
                          {user.category === 'talent' && user.about && (
                            <View style={styles.talentDetails}>
                              {user.about.age && (
                                <Text style={styles.talentDetailText}>
                                  {user.about.age} years
                                </Text>
                              )}
                              {user.about.height_cm && (
                                <Text style={styles.talentDetailText}>
                                  {user.about.height_cm}cm
                                </Text>
                              )}
                              {user.about.nationality && (
                                <Text style={styles.talentDetailText}>
                                  {user.about.nationality}
                                </Text>
                              )}
                              {(user.about.hair_color || user.about.hair_colors?.name) && (
                                <Text style={styles.talentDetailText}>
                                  {user.about.hair_colors?.name || user.about.hair_color}
                                </Text>
                              )}
                              {(user.about.skin_tone || user.about.skin_tones?.name) && (
                                <Text style={styles.talentDetailText}>
                                  {user.about.skin_tones?.name || user.about.skin_tone}
                                </Text>
                              )}
                              {user.about.eye_color && (
                                <Text style={styles.talentDetailText}>
                                  {user.about.eye_color}
                                </Text>
                              )}
                              {user.skills && user.skills.length > 0 && (
                                <Text style={styles.talentDetailText} numberOfLines={1}>
                                  {user.skills.slice(0, 2).join(', ')}{user.skills.length > 2 ? '...' : ''}
                                </Text>
                              )}
                            </View>
                          )}
                          
                          {/* Show message if talent profile data is not available */}
                          {user.category === 'talent' && !user.about && (
                            <View style={styles.talentDetails}>
                              <Text style={[styles.talentDetailText, { fontStyle: 'italic' }]}>
                                {loadingCompleteData.has(user.id) ? 'Loading details...' : 'Profile details not loaded'}
                              </Text>
                            </View>
                          )}
                        </View>
                        
                        <View style={styles.userActions}>
                          <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="add" size={16} color="#fff" />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="briefcase" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No {selectedSubcategory.toLowerCase()} profiles found</Text>
                </View>
              );
            })()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#71717a',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    margin: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  userCount: {
    fontSize: 14,
    color: '#71717a',
  },
  usersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    gap: 8,
  },
  userCard: {
    width: '48%',
    backgroundColor: '#000',
    borderRadius: 12,
    marginBottom: 8,
  },
  userCardContent: {
    padding: 12,
  },
  userInitials: {
    alignItems: 'center',
    marginBottom: 8,
  },
  initialsText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  userRole: {
    fontSize: 12,
    color: '#9ca3af',
  },
  talentDetails: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  talentDetailText: {
    fontSize: 10,
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
  },
  subcategoriesContainer: {
    padding: 16,
  },
  subcategoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  subcategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  subcategoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  subcategoryInfo: {
    flex: 1,
  },
  subcategoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subcategoryCount: {
    fontSize: 14,
    color: '#71717a',
  },
  usersContainer: {
    padding: 16,
  },
});

export default DirectoryPage;
