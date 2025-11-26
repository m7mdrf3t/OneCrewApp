import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, ActivityIndicator, Image, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { spacing, semanticSpacing } from '../constants/spacing';
import SearchBar from '../components/SearchBar';
import FilterModal, { FilterParams } from '../components/FilterModal';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterParams>({});
  
  // Pagination state
  const [usersPage, setUsersPage] = useState(1);
  const [companiesPage, setCompaniesPage] = useState(1);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [hasMoreCompanies, setHasMoreCompanies] = useState(true);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [loadingMoreCompanies, setLoadingMoreCompanies] = useState(false);

  const fetchUsers = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      console.log('👥 Fetching users for directory...', isGuest ? '(Guest Mode)' : '(Authenticated)', `Page: ${page}`);
      setError(null);
      
      if (append) {
        setLoadingMoreUsers(true);
      } else if (page === 1) {
        setIsLoading(true);
      }
      
      const limit = 20;
      
      // Map subcategory to role if a subcategory is selected
      let roleFilter = filters.role;
      if (selectedSubcategory && section.key !== 'onehub' && section.key !== 'academy') {
        const roleMapping: { [key: string]: string } = {
          'Actor': 'actor',
          'Singer': 'singer',
          'Dancer': 'dancer',
          'Director': 'director',
          'Producer': 'producer',
          'Writer': 'writer',
          'DOP': 'dop',
          'Editor': 'editor',
          'Composer': 'composer',
          'VFX Artist': 'vfx',
          'Colorist': 'colorist',
          'Sound Engineer': 'sound_engineer',
          'Sound Designer': 'sound_designer',
          'Gaffer': 'gaffer',
          'Grip': 'grip',
          'Makeup Artist': 'makeup_artist',
          'Stylist': 'stylist',
        };
        roleFilter = roleMapping[selectedSubcategory] || filters.role;
      }
      
      // Set category based on section
      let categoryFilter = filters.category;
      if (!categoryFilter) {
        if (section.key === 'talent') {
          categoryFilter = 'talent';
        } else if (section.key === 'individuals') {
          categoryFilter = 'crew';
        }
      }
      
      const params = {
        limit,
        page,
        search: searchQuery || filters.search,
        category: categoryFilter,
        role: roleFilter,
        location: filters.location,
      };
      
      // Use guest browsing if in guest mode
      if (isGuest) {
        try {
          console.log('🎭 Browsing users as guest...', params);
          const response = await browseUsersAsGuest(params);
          
          if (response.success && response.data) {
            const data = response.data.data || response.data;
            const usersArray = Array.isArray(data) ? data : (Array.isArray(data?.users) ? data.users : []);
            const pagination = response.data.pagination;
            
            if (append) {
              setUsers(prev => [...prev, ...usersArray]);
            } else {
            setUsers(usersArray);
            }
            
            setHasMoreUsers(pagination ? page < pagination.totalPages : usersArray.length === limit);
            console.log('✅ Users fetched successfully as guest:', usersArray.length);
            return;
          } else {
            throw new Error(response.error || 'Failed to browse users as guest');
          }
        } catch (guestErr: any) {
          console.error('❌ Guest browsing failed:', guestErr);
          setError(guestErr.message || 'Failed to browse users as guest');
          if (!append) {
            setUsers([]);
          }
          throw guestErr;
        }
      }
      
      // Authenticated user flow
      // Try direct fetch first
      try {
        const response = await getUsersDirect(params);
        
        if (response.success && response.data) {
          const data = response.data.data || response.data;
          const usersArray = Array.isArray(data) ? data : [];
          const pagination = response.data.pagination;
          
          if (append) {
            setUsers(prev => [...prev, ...usersArray]);
          } else {
          setUsers(usersArray);
          }
          
          setHasMoreUsers(pagination ? page < pagination.totalPages : usersArray.length === limit);
          console.log('✅ Users fetched successfully with direct fetch:', usersArray.length);
          return;
        }
      } catch (directErr) {
        console.warn('⚠️ Direct fetch failed, trying API client:', directErr);
      }
      
      // Fallback to API client - use search parameter (API client will convert to q)
      const apiParams: any = {
        limit,
        page,
      };
      if (params.search) apiParams.q = params.search;
      if (params.category) apiParams.category = params.category;
      if (params.role) apiParams.role = params.role;
      
      const response = await api.getUsers(apiParams);
      
      if (response.success && response.data) {
        const data = response.data.data || response.data;
        const usersArray = Array.isArray(data) ? data : [];
        const pagination = response.data.pagination;
        
        if (append) {
          setUsers(prev => [...prev, ...usersArray]);
        } else {
          setUsers(usersArray);
        }
        
        setHasMoreUsers(pagination ? page < pagination.totalPages : usersArray.length === limit);
        console.log('✅ Users fetched successfully with API client:', usersArray.length);
      } else {
        console.error('❌ Failed to fetch users:', response.error);
        setError('Failed to load users');
        if (!append) {
          setUsers([]);
        }
      }
    } catch (err: any) {
      console.error('❌ Error fetching users:', err);
      setError(err.message || 'Failed to load users');
      if (!append) {
        setUsers([]);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setLoadingMoreUsers(false);
    }
  }, [isGuest, searchQuery, filters, selectedSubcategory, section.key, browseUsersAsGuest, getUsersDirect, api]);

  const fetchCompanies = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      setError(null);
      console.log('🏢 Fetching companies for directory...', `Page: ${page}`);
      
      if (append) {
        setLoadingMoreCompanies(true);
      } else if (page === 1) {
        setIsLoading(true);
      }
      
      const limit = 20;
      const params = {
        limit,
        page,
        search: searchQuery || filters.search,
        category: filters.category,
        location: filters.location,
      };
      
      const response = await getCompanies(params);
      
      if (response.success && response.data) {
        const data = response.data.data || response.data;
        const companiesArray = Array.isArray(data) ? data : [];
        const pagination = response.data.pagination;
        
        if (append) {
          setCompanies(prev => [...prev, ...companiesArray]);
        } else {
        setCompanies(companiesArray);
        }
        
        setHasMoreCompanies(pagination ? page < pagination.totalPages : companiesArray.length === limit);
        console.log('✅ Companies fetched successfully:', companiesArray.length);
      } else {
        console.error('❌ Failed to fetch companies:', response.error);
        setError('Failed to load companies');
        if (!append) {
          setCompanies([]);
        }
      }
    } catch (err: any) {
      console.error('❌ Error fetching companies:', err);
      setError(err.message || 'Failed to load companies');
      if (!append) {
        setCompanies([]);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setLoadingMoreCompanies(false);
    }
  }, [searchQuery, filters, getCompanies]);


  useEffect(() => {
    setIsLoading(true);
    setUsersPage(1);
    setCompaniesPage(1);
    setHasMoreUsers(true);
    setHasMoreCompanies(true);
    
    // Only fetch users if not viewing companies section
    if (section.key !== 'onehub' && section.key !== 'academy') {
      fetchUsers(1, false);
    }
    
    // Fetch companies for Studios & Agencies and Academy sections
    if (section.key === 'onehub' || section.key === 'academy') {
      fetchCompanies(1, false);
    }
    
    // Only load team members if authenticated (not guest)
    if (!isGuest) {
      loadTeamMembers();
    }
  }, [isGuest, section.key, fetchUsers, fetchCompanies]);
  
  // Reset and refetch when search, filters, or subcategory changes
  useEffect(() => {
    if (section.key !== 'onehub' && section.key !== 'academy') {
      setUsersPage(1);
      setHasMoreUsers(true);
      fetchUsers(1, false);
    } else {
      setCompaniesPage(1);
      setHasMoreCompanies(true);
      fetchCompanies(1, false);
    }
  }, [searchQuery, filters, selectedSubcategory, section.key, fetchUsers, fetchCompanies]);

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setUsersPage(1);
    setCompaniesPage(1);
    setHasMoreUsers(true);
    setHasMoreCompanies(true);
    
    if (section.key !== 'onehub' && section.key !== 'academy') {
      fetchUsers(1, false);
    } else {
      fetchCompanies(1, false);
    }
    // Only refresh team members if authenticated (not guest)
    if (!isGuest) {
      loadTeamMembers();
    }
  }, [section.key, fetchUsers, fetchCompanies, isGuest]);
  
  const handleLoadMoreUsers = useCallback(() => {
    if (!loadingMoreUsers && hasMoreUsers && !isLoading && section.key !== 'onehub' && section.key !== 'academy') {
      const nextPage = usersPage + 1;
      setUsersPage(nextPage);
      fetchUsers(nextPage, true);
    }
  }, [loadingMoreUsers, hasMoreUsers, isLoading, usersPage, section.key, fetchUsers]);
  
  const handleLoadMoreCompanies = useCallback(() => {
    if (!loadingMoreCompanies && hasMoreCompanies && !isLoading && (section.key === 'onehub' || section.key === 'academy')) {
      const nextPage = companiesPage + 1;
      setCompaniesPage(nextPage);
      fetchCompanies(nextPage, true);
    }
  }, [loadingMoreCompanies, hasMoreCompanies, isLoading, companiesPage, section.key, fetchCompanies]);
  
  const handleApplyFilters = useCallback((newFilters: FilterParams) => {
    setFilters(newFilters);
  }, []);
  
  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, []);

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

  // Filter users based on section and items (for subcategory view, users are already filtered by API)
  const filteredUsers = useMemo(() => {
    if (!users.length || section.key === 'onehub' || section.key === 'academy') return {};
    
    // If a subcategory is selected, users are already filtered by API, just group them
    if (selectedSubcategory) {
      // Map section items to actual user roles for grouping
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
      
      // Return all users for the selected subcategory (they're already filtered by API)
      return { [selectedSubcategory]: users };
    }
    
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
  }, [users, section, selectedSubcategory]);

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

  const handleBackPress = useCallback(() => {
    if (selectedSubcategory) {
      // If we're viewing a subcategory, just clear it instead of going back
      setSelectedSubcategory(null);
    } else {
      // If we're at the main category view, go back in navigation
      onBack();
    }
  }, [selectedSubcategory, onBack]);

  const renderSubcategory = useCallback(({ item }: { item: any }) => {
              const itemUsers = (filteredUsers as any)[item.label] || [];
              const itemCompanies = (filteredCompaniesByType as any)[item.label] || [];
              const count = section.key === 'onehub' || section.key === 'academy' 
                ? itemCompanies.length 
                : itemUsers.length;
              
              return (
                <TouchableOpacity
                  style={styles.subcategoryCard}
                  onPress={() => setSelectedSubcategory(item.label)}
                  activeOpacity={0.7}
                >
                  <View style={styles.subcategoryContent}>
                    <View style={styles.subcategoryIcon}>
                      <Ionicons 
                        name={(section.key === 'onehub' || section.key === 'academy') ? "business" : "people"} 
              size={26} 
              color="#0ea5e9" 
                      />
                    </View>
                    <View style={styles.subcategoryInfo}>
                      <Text style={styles.subcategoryTitle}>{item.label}</Text>
                      <Text style={styles.subcategoryCount}>{count} {(section.key === 'onehub' || section.key === 'academy') ? 'companies' : 'profiles'}</Text>
                    </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </View>
                </TouchableOpacity>
              );
  }, [section.key, filteredUsers, filteredCompaniesByType]);
  
  const renderCompany = useCallback(({ item: company }: { item: Company }) => {
                      const location = company.location_text || company.location || '';
                      const companyType = company.company_type_info?.name || '';
                      
                      return (
                        <TouchableOpacity
        style={styles.companyCardSimple}
                          onPress={() => {
                            if (onNavigate) {
                              onNavigate('companyProfile', { companyId: company.id });
                            }
                          }}
        activeOpacity={0.7}
                        >
        <View style={styles.companyCardImageContainer}>
                            {company.logo_url ? (
                              <Image
                                source={{ uri: company.logo_url }}
              style={styles.companyCardImage}
                                resizeMode="cover"
                              />
                            ) : (
            <View style={styles.companyCardImagePlaceholder}>
              <Ionicons name="business" size={40} color="#9ca3af" />
                              </View>
                            )}
                          </View>
                          
        <View style={styles.companyCardInfo}>
          <Text style={styles.companyCardName} numberOfLines={2}>
                              {company.name}
                            </Text>
          {(companyType || location) && (
            <View style={styles.companyCardMeta}>
                            {companyType ? (
                              <Text style={styles.companyCardType} numberOfLines={1}>
                                {companyType}
                              </Text>
                            ) : null}
                            {location ? (
                              <View style={styles.companyCardLocation}>
                  <Ionicons name="location-outline" size={14} color="#6b7280" />
                                <Text style={styles.companyCardLocationText} numberOfLines={1}>
                                  {location}
                                </Text>
                              </View>
                            ) : null}
            </View>
          )}
                          </View>
                        </TouchableOpacity>
                      );
  }, [onNavigate]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => onBack()} style={styles.backButton}>
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
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {selectedSubcategory ? selectedSubcategory : section.title}
        </Text>
        <View style={styles.placeholder} />
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!selectedSubcategory ? (
        // Show subcategories with FlatList
        <FlatList
          data={sectionItems}
          renderItem={renderSubcategory}
          keyExtractor={(item) => item.label}
          contentContainerStyle={styles.subcategoriesContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No subcategories found</Text>
            </View>
          }
        />
      ) : (
        // Show users or companies for selected subcategory
        <>
          {/* Search Bar - Only visible when viewing users/companies */}
          <View style={styles.searchContainer}>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onOpenFilter={() => setShowFilterModal(true)}
              filters={filters}
              onClearFilters={handleClearFilters}
            />
          </View>
          
          {section.key === 'onehub' || section.key === 'academy' ? (
            // Show companies for selected subcategory
            (() => {
          const itemCompanies = companies.filter((company: Company) => {
            const subcategory = company.subcategory || company.company_type_info?.code || '';
            const companyType = company.company_type_info?.name || 'Academy';
            
            if (section.key === 'onehub') {
              if (selectedSubcategory === 'Production Houses') return subcategory === 'production_house';
              if (selectedSubcategory === 'Agency') return subcategory === 'agency' || subcategory === 'casting_agency';
              if (selectedSubcategory === 'Studio') return subcategory === 'studio';
              if (selectedSubcategory === 'Management Company') return subcategory === 'management_company';
            } else if (section.key === 'academy') {
              return companyType === selectedSubcategory || (selectedSubcategory === 'Academy' && subcategory === 'academy');
            }
            return false;
          });
          
          return itemCompanies.length > 0 ? (
            <FlatList
              data={itemCompanies}
              renderItem={renderCompany}
              keyExtractor={(item: Company) => item.id}
              contentContainerStyle={styles.companiesListContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              onEndReached={handleLoadMoreCompanies}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingMoreCompanies ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color="#000" />
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No companies found</Text>
                </View>
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No {selectedSubcategory.toLowerCase()} found</Text>
            </View>
          );
        })()
      ) : (
        // Show users for other sections - use all users since they're already filtered by API
        (() => {
          const itemUsers = users; // Users are already filtered by API based on selectedSubcategory
          
          const renderUser = ({ item: user }: { item: User }) => (
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
          );
          
          return itemUsers.length > 0 ? (
            <FlatList
              key={`users-grid-${section.key}-${selectedSubcategory || 'all'}-2cols`}
              data={itemUsers}
              renderItem={renderUser}
              keyExtractor={(item: User) => item.id}
              contentContainerStyle={styles.usersGrid}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              onEndReached={handleLoadMoreUsers}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingMoreUsers ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color="#000" />
                </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No profiles found</Text>
                </View>
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No {selectedSubcategory.toLowerCase()} profiles found</Text>
            </View>
          );
        })()
          )}
        </>
      )}
      
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />
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
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: semanticSpacing.containerPaddingLarge,
    paddingVertical: semanticSpacing.containerPadding,
    paddingTop: semanticSpacing.containerPadding + 4,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: semanticSpacing.sectionGap,
    borderRadius: semanticSpacing.borderRadius.sm,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
    letterSpacing: -0.2,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: semanticSpacing.borderRadius.md,
    padding: semanticSpacing.containerPaddingLarge,
    margin: semanticSpacing.containerPaddingLarge,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  categorySection: {
    marginBottom: semanticSpacing.sectionGapLarge,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: semanticSpacing.containerPaddingLarge,
    marginBottom: semanticSpacing.containerPadding,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.4,
  },
  userCount: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
    letterSpacing: -0.2,
  },
  usersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: semanticSpacing.containerPadding,
    gap: semanticSpacing.containerPadding,
  },
  userCard: {
    width: '48%',
    backgroundColor: '#000',
    borderRadius: semanticSpacing.borderRadius.lg,
    marginBottom: semanticSpacing.containerPadding,
    minHeight: 220,
    overflow: 'hidden',
  },
  userCardContent: {
    padding: semanticSpacing.containerPaddingLarge,
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
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -1,
  },
  userInfo: {
    marginBottom: semanticSpacing.buttonPadding,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    letterSpacing: -0.3,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9ca3af',
    letterSpacing: -0.2,
    textTransform: 'uppercase',
  },
  talentDetails: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  talentDetailText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9ca3af',
    backgroundColor: '#1f2937',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: semanticSpacing.borderRadius.sm,
    letterSpacing: -0.1,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonAdded: {
    backgroundColor: '#10b981',
  },
  actionButtonLoading: {
    backgroundColor: '#6b7280',
  },
  emptyState: {
    padding: spacing.xxl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  searchContainer: {
    padding: semanticSpacing.containerPaddingLarge,
    paddingTop: semanticSpacing.containerPadding,
    backgroundColor: '#f4f4f5',
  },
  emptyContainer: {
    padding: semanticSpacing.containerPaddingLarge * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoader: {
    padding: semanticSpacing.containerPaddingLarge,
    alignItems: 'center',
  },
  subcategoriesContainer: {
    padding: semanticSpacing.containerPaddingLarge,
    paddingTop: semanticSpacing.sectionGapLarge,
  },
  subcategoryCard: {
    backgroundColor: '#fff',
    borderRadius: semanticSpacing.borderRadius.lg,
    marginBottom: semanticSpacing.containerPadding,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  subcategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: semanticSpacing.containerPaddingLarge,
  },
  subcategoryIcon: {
    width: 52,
    height: 52,
    borderRadius: semanticSpacing.borderRadius.md,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: semanticSpacing.containerPadding,
  },
  subcategoryInfo: {
    flex: 1,
  },
  subcategoryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  subcategoryCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    letterSpacing: -0.2,
  },
  usersContainer: {
    padding: semanticSpacing.containerPaddingLarge,
    paddingTop: semanticSpacing.sectionGapLarge,
  },
  companyLogoInCard: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  companyDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6b7280',
    marginTop: spacing.xs,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  // Simple, clean company card styles
  companiesListContainer: {
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingTop: semanticSpacing.containerPadding,
    gap: semanticSpacing.containerPadding,
  },
  companyCardSimple: {
    backgroundColor: '#fff',
    borderRadius: semanticSpacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  companyCardImageContainer: {
    width: '100%',
    height: 160,
    backgroundColor: '#f9fafb',
  },
  companyCardImage: {
    width: '100%',
    height: '100%',
  },
  companyCardImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  companyCardInfo: {
    padding: semanticSpacing.containerPaddingLarge,
  },
  companyCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  companyCardMeta: {
    gap: spacing.xs,
  },
  companyCardType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    letterSpacing: -0.2,
  },
  companyCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  companyCardLocationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    flex: 1,
    letterSpacing: -0.2,
  },
});

export default DirectoryPage;
