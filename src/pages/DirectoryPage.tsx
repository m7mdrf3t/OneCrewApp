import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { spacing, semanticSpacing } from '../constants/spacing';

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
  onNavigate?: (page: string, data?: any) => void;
}

interface Company {
  id: string;
  name: string;
  subcategory?: string;
  description?: string;
  bio?: string;
  logo_url?: string;
  location_text?: string;
  location?: string;
  company_type_info?: {
    code?: string;
    name?: string;
  };
}

const DirectoryPage: React.FC<DirectoryPageProps> = ({
  section,
  onBack,
  onUserSelect,
  onNavigate,
}) => {
  const { api, getUsersDirect, getMyTeam, addToMyTeam, removeFromMyTeam, getMyTeamMembers, isGuest, browseUsersAsGuest, getCompanies } = useApi();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [loadingCompleteData, setLoadingCompleteData] = useState<Set<string>>(new Set());
  const [teamMemberIds, setTeamMemberIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

  const fetchUsers = async () => {
    try {
      console.log('👥 Fetching users for directory...', isGuest ? '(Guest Mode)' : '(Authenticated)');
      setError(null);
      
      // Use guest browsing if in guest mode
      if (isGuest) {
        try {
          console.log('🎭 Browsing users as guest...');
          const response = await browseUsersAsGuest({ limit: 100 });
          
          if (response.success && response.data) {
            const usersArray = Array.isArray(response.data) ? response.data : (Array.isArray(response.data?.users) ? response.data.users : []);
            console.log('✅ Users fetched successfully as guest:', usersArray.length);
            setUsers(usersArray);
            return;
          } else {
            throw new Error(response.error || 'Failed to browse users as guest');
          }
        } catch (guestErr: any) {
          console.error('❌ Guest browsing failed:', guestErr);
          setError(guestErr.message || 'Failed to browse users as guest');
          throw guestErr;
        }
      }
      
      // Authenticated user flow
      // Try direct fetch first
      try {
        const response = await getUsersDirect({ limit: 100 });
        
        if (response.success && response.data) {
          const usersArray = Array.isArray(response.data) ? response.data : [];
          console.log('✅ Users fetched successfully with direct fetch:', usersArray.length);
          setUsers(usersArray);
          return;
        }
      } catch (directErr) {
        console.warn('⚠️ Direct fetch failed, trying API client:', directErr);
      }
      
      // Fallback to API client
      const response = await api.getUsers({ limit: 100 });
      
      if (response.success && response.data) {
        const usersArray = Array.isArray(response.data) ? response.data : [];
        console.log('✅ Users fetched successfully with API client:', usersArray.length);
        
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

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🏢 Fetching companies for directory...');
      const response = await getCompanies({ limit: 100 });
      
      if (response.success && response.data) {
        const companiesArray = Array.isArray(response.data) 
          ? response.data 
          : (Array.isArray(response.data?.data) ? response.data.data : []);
        console.log('✅ Companies fetched successfully:', companiesArray.length);
        setCompanies(companiesArray);
      } else {
        console.error('❌ Failed to fetch companies:', response.error);
        setError('Failed to load companies');
      }
    } catch (err: any) {
      console.error('❌ Error fetching companies:', err);
      setError(err.message || 'Failed to load companies');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    setIsLoading(true);
    // Only fetch users if not viewing companies section
    if (section.key !== 'onehub' && section.key !== 'academy') {
      fetchUsers().finally(() => setIsLoading(false));
    }
    
    // Fetch companies for Studios & Agencies and Academy sections
    if (section.key === 'onehub' || section.key === 'academy') {
      fetchCompanies(); // fetchCompanies already handles setIsLoading
    }
    
    // Only load team members if authenticated (not guest)
    if (!isGuest) {
      loadTeamMembers();
    }
  }, [isGuest, section.key]);

  const loadTeamMembers = async () => {
    // Skip loading team members if guest
    if (isGuest) return;
    
    try {
      const response = await getMyTeamMembers();
      if (response.success && response.data) {
        console.log('🔍 DirectoryPage - Team members data:', JSON.stringify(response.data, null, 2));
        const memberIds = new Set<string>(response.data.map((member: any) => member.user_id));
        setTeamMemberIds(memberIds);
        console.log('✅ DirectoryPage - Team member IDs loaded:', Array.from(memberIds));
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (section.key !== 'onehub' && section.key !== 'academy') {
      fetchUsers();
    } else {
      fetchCompanies();
    }
    // Only refresh team members if authenticated (not guest)
    if (!isGuest) {
      loadTeamMembers();
    }
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

  // Filter companies by type for Studios & Agencies and Academy
  const filteredCompaniesByType = useMemo(() => {
    if (!companies.length || (section.key !== 'onehub' && section.key !== 'academy')) {
      return {};
    }

    const companiesByType: { [key: string]: Company[] } = {};

    companies.forEach(company => {
      const subcategory = company.subcategory || company.company_type_info?.code || '';
      
      if (section.key === 'onehub') {
        // Studios & Agencies: production_house, agency, studio, casting_agency, management_company
        if (subcategory === 'production_house') {
          if (!companiesByType['Production Houses']) companiesByType['Production Houses'] = [];
          companiesByType['Production Houses'].push(company);
        } else if (subcategory === 'agency' || subcategory === 'casting_agency') {
          if (!companiesByType['Agency']) companiesByType['Agency'] = [];
          companiesByType['Agency'].push(company);
        } else if (subcategory === 'studio') {
          if (!companiesByType['Studio']) companiesByType['Studio'] = [];
          companiesByType['Studio'].push(company);
        } else if (subcategory === 'management_company') {
          if (!companiesByType['Management Company']) companiesByType['Management Company'] = [];
          companiesByType['Management Company'].push(company);
        }
      } else if (section.key === 'academy') {
        // Academy: academy subcategory
        if (subcategory === 'academy') {
          // Group by company type name if available, otherwise just "Academy"
          const typeName = company.company_type_info?.name || 'Academy';
          if (!companiesByType[typeName]) companiesByType[typeName] = [];
          companiesByType[typeName].push(company);
        }
      }
    });

    return companiesByType;
  }, [companies, section.key]);

  // Generate dynamic section items from companies
  const sectionItems = useMemo(() => {
    if (section.key === 'onehub' || section.key === 'academy') {
      // Use companies to generate items
      const items = Object.keys(filteredCompaniesByType).map(type => ({
        label: type,
        users: filteredCompaniesByType[type].length
      }));
      return items;
    }
    // For other sections, use original items
    return section.items;
  }, [section.items, section.key, filteredCompaniesByType]);

  // Filter users based on section and items
  const filteredUsers = useMemo(() => {
    if (!users.length || section.key === 'onehub' || section.key === 'academy') return {};
    
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
    };

    const sectionUsers: { [key: string]: User[] } = {};
    
    section.items.forEach(item => {
      const roles = roleMapping[item.label] || [];
      const categoryUsers = users.filter(user => {
        // Check if user's category matches section
        if (section.key === 'talent' && user.category !== 'talent') return false;
        if (section.key === 'individuals' && user.category !== 'crew') return false;
        
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

  const handleToggleTeamMember = async (user: User) => {
    const isCurrentlyInTeam = teamMemberIds.has(user.id);
    const isLoading = actionLoading.has(user.id);
    
    if (isLoading) return; // Prevent multiple simultaneous actions
    
    setActionLoading(prev => new Set(prev).add(user.id));
    
    try {
      if (isCurrentlyInTeam) {
        // Remove from team
        console.log('🔍 Removing user from personal team:', user.name);
        const response = await removeFromMyTeam(user.id);
        
        if (response.success) {
          setTeamMemberIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(user.id);
            return newSet;
          });
        } else {
          console.error('Failed to remove user:', response.error);
        }
      } else {
        // Add to team
        console.log('🔍 Adding user to personal team:', user.name);
        const response = await addToMyTeam(user.id);
        
        if (response.success) {
          setTeamMemberIds(prev => new Set(prev).add(user.id));
        } else {
          console.error('Failed to add user:', response.error);
        }
      }
    } catch (error) {
      console.error('Error toggling team member:', error);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.id);
        return newSet;
      });
    }
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
          <Text style={styles.loadingText}>
            {(section.key === 'onehub' || section.key === 'academy') ? 'Loading companies...' : 'Loading users...'}
          </Text>
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
            {sectionItems.map((item) => {
              const itemUsers = (filteredUsers as any)[item.label] || [];
              const itemCompanies = (filteredCompaniesByType as any)[item.label] || [];
              const count = section.key === 'onehub' || section.key === 'academy' 
                ? itemCompanies.length 
                : itemUsers.length;
              
              return (
                <TouchableOpacity
                  key={item.label}
                  style={styles.subcategoryCard}
                  onPress={() => setSelectedSubcategory(item.label)}
                  activeOpacity={0.7}
                >
                  <View style={styles.subcategoryContent}>
                    <View style={styles.subcategoryIcon}>
                      <Ionicons 
                        name={(section.key === 'onehub' || section.key === 'academy') ? "business" : "people"} 
                        size={24} 
                        color="#3b82f6" 
                      />
                    </View>
                    <View style={styles.subcategoryInfo}>
                      <Text style={styles.subcategoryTitle}>{item.label}</Text>
                      <Text style={styles.subcategoryCount}>{count} {(section.key === 'onehub' || section.key === 'academy') ? 'companies' : 'profiles'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#71717a" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          // Show users or companies for selected subcategory
          <View style={styles.usersContainer}>
            {(() => {
              // Check if we're showing companies
              if (section.key === 'onehub' || section.key === 'academy') {
                const itemCompanies = (filteredCompaniesByType as any)[selectedSubcategory] || [];
                
                return itemCompanies.length > 0 ? (
                  <View style={styles.companiesListContainer}>
                    {itemCompanies.map((company: Company) => {
                      const location = company.location_text || company.location || '';
                      const companyType = company.company_type_info?.name || '';
                      
                      return (
                        <TouchableOpacity
                          key={company.id}
                          style={styles.companyCardTwoTone}
                          onPress={() => {
                            if (onNavigate) {
                              onNavigate('companyProfile', { companyId: company.id });
                            }
                          }}
                          activeOpacity={0.8}
                        >
                          {/* Top Section - Dark Grey */}
                          <View style={styles.companyCardTop}>
                            {/* Company Logo */}
                            {company.logo_url ? (
                              <Image
                                source={{ uri: company.logo_url }}
                                style={styles.companyCardLogo}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.companyCardLogoPlaceholder}>
                                <Ionicons name="business" size={48} color="#71717a" />
                              </View>
                            )}
                            <Text style={styles.companyCardTopName} numberOfLines={2}>
                              {company.name}
                            </Text>
                            {/* Navigation Button */}
                            <TouchableOpacity
                              style={styles.companyNavButton}
                              onPress={() => {
                                if (onNavigate) {
                                  onNavigate('companyProfile', { companyId: company.id });
                                }
                              }}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="arrow-back" size={16} color="#fff" />
                            </TouchableOpacity>
                          </View>
                          
                          {/* Bottom Section - Light Grey */}
                          <View style={styles.companyCardBottom}>
                            <Text style={styles.companyCardBottomName} numberOfLines={1}>
                              {company.name}
                            </Text>
                            {companyType ? (
                              <Text style={styles.companyCardType} numberOfLines={1}>
                                {companyType}
                              </Text>
                            ) : null}
                            {location ? (
                              <View style={styles.companyCardLocation}>
                                <Ionicons name="location" size={14} color="#000" />
                                <Text style={styles.companyCardLocationText} numberOfLines={1}>
                                  {location}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No {selectedSubcategory.toLowerCase()} found</Text>
                  </View>
                );
              }
              
              // Show users for other sections
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
                          {user.image_url ? (
                            <Image
                              source={{ uri: user.image_url }}
                              style={styles.userImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <Text style={styles.initialsText}>
                              {getInitials(user.name)}
                            </Text>
                          )}
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
                          {/* Only show team actions if authenticated (not guest) */}
                          {!isGuest && (
                            <TouchableOpacity 
                              style={[
                                styles.actionButton,
                                teamMemberIds.has(user.id) && styles.actionButtonAdded,
                                actionLoading.has(user.id) && styles.actionButtonLoading
                              ]}
                              onPress={() => handleToggleTeamMember(user)}
                              disabled={actionLoading.has(user.id)}
                            >
                              {actionLoading.has(user.id) ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Ionicons 
                                  name={teamMemberIds.has(user.id) ? "checkmark" : "add"} 
                                  size={16} 
                                  color="#fff" 
                                />
                              )}
                            </TouchableOpacity>
                          )}
                          {/* Project assignment button - also only for authenticated users */}
                          {!isGuest && (
                            <TouchableOpacity style={styles.actionButton}>
                              <Ionicons name="briefcase" size={16} color="#fff" />
                            </TouchableOpacity>
                          )}
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
    padding: semanticSpacing.containerPadding,
    paddingTop: semanticSpacing.containerPadding,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: semanticSpacing.containerPadding,
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
    padding: semanticSpacing.containerPadding,
    margin: semanticSpacing.sectionGapLarge,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: semanticSpacing.sectionGapLarge,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: semanticSpacing.modalPadding,
    marginBottom: semanticSpacing.containerPadding,
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
    paddingHorizontal: spacing.xs,
    gap: semanticSpacing.buttonPadding,
  },
  userCard: {
    width: '48%',
    backgroundColor: '#000',
    borderRadius: 12,
    marginBottom: semanticSpacing.buttonPadding,
    minHeight: 220,
  },
  userCardContent: {
    padding: semanticSpacing.containerPadding,
    flex: 1,
  },
  userInitials: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: semanticSpacing.containerPadding,
    height: 100,
    width: '100%',
  },
  userImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1f2937',
  },
  initialsText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    marginBottom: semanticSpacing.buttonPadding,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
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
    marginTop: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
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
  actionButtonAdded: {
    backgroundColor: '#10b981', // Green color when user is in team
  },
  actionButtonLoading: {
    backgroundColor: '#6b7280', // Gray color when loading
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
  },
  subcategoriesContainer: {
    padding: semanticSpacing.modalPadding,
  },
  subcategoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: semanticSpacing.containerPadding,
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  subcategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: semanticSpacing.modalPadding,
  },
  subcategoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: semanticSpacing.sectionGapLarge,
  },
  subcategoryInfo: {
    flex: 1,
  },
  subcategoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: spacing.xs,
  },
  subcategoryCount: {
    fontSize: 14,
    color: '#71717a',
  },
  usersContainer: {
    padding: semanticSpacing.modalPadding,
  },
  companyLogoInCard: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  companyDescription: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    lineHeight: 16,
  },
  // Two-tone company card styles
  companiesListContainer: {
    padding: spacing.xs,
    gap: semanticSpacing.containerPadding,
  },
  companyCardTwoTone: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderColor: '#000',
    overflow: 'hidden',
    marginBottom: 4,
  },
  companyCardTop: {
    backgroundColor: '#262626',
    padding: 0,
    height: 200,
    justifyContent: 'flex-start',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  companyCardLogo: {
    width: '100%',
    height: 140,
    backgroundColor: '#1a1a1a',
  },
  companyCardLogoPlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyCardTopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  companyNavButton: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyCardBottom: {
    backgroundColor: '#f5f5f5',
    padding: semanticSpacing.modalPadding,
    paddingTop: semanticSpacing.containerPadding,
    gap: semanticSpacing.tightGap,
  },
  companyCardBottomName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  companyCardType: {
    fontSize: 14,
    color: '#000',
    opacity: 0.7,
  },
  companyCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: semanticSpacing.tightGap,
    marginTop: semanticSpacing.iconPaddingSmall,
  },
  companyCardLocationText: {
    fontSize: 14,
    color: '#000',
    opacity: 0.7,
    flex: 1,
  },
});

export default DirectoryPage;
