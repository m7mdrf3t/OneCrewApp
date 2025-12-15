import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchModalProps } from '../types';
import { useApi } from '../contexts/ApiContext';
import { FILTER_OPTIONS, SERVICE_FILTERS } from '../data/mockData';
import SkeletonUserCard from './SkeletonUserCard';

const SearchModal: React.FC<SearchModalProps> = ({
  visible,
  onClose,
  onSelect,
  preFilterRole,
  preFilterService,
}) => {
  const { getUsersDirect } = useApi();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedRole, setSelectedRole] = useState(preFilterRole || '');

  useEffect(() => {
    if (visible) {
      loadUsers();
      setSearchQuery('');
      setFilters({});
      setSelectedRole(preFilterRole || '');
    }
  }, [visible, preFilterRole]);

  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, filters, selectedRole]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await getUsersDirect();
      setUsers(response || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      Alert.alert('Error', 'Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Apply search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply role filter
    if (selectedRole) {
      filtered = filtered.filter(user =>
        user.specialty?.toLowerCase().includes(selectedRole.toLowerCase()) ||
        user.category?.toLowerCase().includes(selectedRole.toLowerCase())
      );
    }

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'any') {
        switch (key) {
          case 'age':
            const [minAge, maxAge] = value.split('-').map(Number);
            filtered = filtered.filter(user => {
              const userAge = user.about?.age;
              return userAge >= minAge && userAge <= maxAge;
            });
            break;
          case 'gender':
            filtered = filtered.filter(user =>
              user.about?.gender?.toLowerCase() === value.toLowerCase()
            );
            break;
          case 'location':
            filtered = filtered.filter(user =>
              user.location?.toLowerCase().includes(value.toLowerCase())
            );
            break;
          case 'experience':
            // This would need to be implemented based on your user data structure
            break;
        }
      }
    });

    setFilteredUsers(filtered);
  };

  const handleFilterChange = (filterKey: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setSelectedRole(preFilterRole || '');
  };

  const getAvailableFilters = () => {
    if (selectedRole && SERVICE_FILTERS[selectedRole.toLowerCase() as keyof typeof SERVICE_FILTERS]) {
      return SERVICE_FILTERS[selectedRole.toLowerCase() as keyof typeof SERVICE_FILTERS];
    }
    return ['age', 'gender', 'location', 'experience'];
  };

  const renderUserCard = (user: any) => (
    <TouchableOpacity
      key={user.id}
      style={styles.userCard}
      onPress={() => {
        onSelect(user);
        onClose();
      }}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.userInitials}>
          {user.name?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name || 'Unknown'}</Text>
        <Text style={styles.userSpecialty}>{user.specialty || 'No specialty'}</Text>
        <Text style={styles.userLocation}>{user.location || 'No location'}</Text>
        
        {user.about && (
          <View style={styles.userDetails}>
            <Text style={styles.userDetail}>
              {user.about.age ? `${user.about.age} years` : ''}
              {user.about.gender ? ` • ${user.about.gender}` : ''}
            </Text>
          </View>
        )}
        
        {user.skills && user.skills.length > 0 && (
          <View style={styles.skillsContainer}>
            {user.skills.slice(0, 3).map((skill: string, index: number) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
            {user.skills.length > 3 && (
              <Text style={styles.moreSkills}>+{user.skills.length - 3} more</Text>
            )}
          </View>
        )}
      </View>
      
      <View style={styles.assignButton}>
        <Ionicons name="add" size={20} color="#3b82f6" />
      </View>
    </TouchableOpacity>
  );

  const renderFilters = () => {
    const availableFilters = getAvailableFilters();
    
    return (
      <View style={styles.filtersContainer}>
        <View style={styles.filtersHeader}>
          <Text style={styles.filtersTitle}>Filters</Text>
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </View>
        
        {availableFilters.map((filterKey: string) => {
          const options = FILTER_OPTIONS[filterKey as keyof typeof FILTER_OPTIONS];
          if (!options) return null;
          
          return (
            <View key={filterKey} style={styles.filterGroup}>
              <Text style={styles.filterLabel}>
                {filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  {options.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterOption,
                        filters[filterKey] === option.value && styles.filterOptionSelected,
                      ]}
                      onPress={() => handleFilterChange(filterKey, option.value)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filters[filterKey] === option.value && styles.filterOptionTextSelected,
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {preFilterRole ? `Find ${preFilterRole}s` : 'Search Talent'}
          </Text>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={styles.filterButton}
          >
            <Ionicons 
              name={showFilters ? "filter" : "filter-outline"} 
              size={24} 
              color="#3b82f6" 
            />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name, specialty, or category..."
              placeholderTextColor="#9ca3af"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filters */}
        {showFilters && renderFilters()}

        {/* Results */}
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {filteredUsers.length} {filteredUsers.length === 1 ? 'result' : 'results'}
            </Text>
            {selectedRole && (
              <View style={styles.roleFilter}>
                <Text style={styles.roleFilterText}>Role: {selectedRole}</Text>
                <TouchableOpacity onPress={() => setSelectedRole('')}>
                  <Ionicons name="close" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {isLoading ? (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.skeletonScroll}>
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonUserCard key={index} isDark={false} />
              ))}
            </ScrollView>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search or filters
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredUsers.map(renderUserCard)}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  filterButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#000',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  filterOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterOptionText: {
    fontSize: 12,
    color: '#374151',
  },
  filterOptionTextSelected: {
    color: '#fff',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  roleFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleFilterText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  skeletonScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInitials: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userSpecialty: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 2,
  },
  userLocation: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  userDetails: {
    marginBottom: 8,
  },
  userDetail: {
    fontSize: 12,
    color: '#6b7280',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  skillTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skillText: {
    fontSize: 10,
    color: '#374151',
  },
  moreSkills: {
    fontSize: 10,
    color: '#6b7280',
    alignSelf: 'center',
  },
  assignButton: {
    padding: 8,
  },
});

export default SearchModal;
