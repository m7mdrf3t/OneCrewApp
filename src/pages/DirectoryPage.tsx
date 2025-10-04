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

  const fetchUsers = async () => {
    try {
      console.log('👥 Fetching users for directory...');
      setError(null);
      const response = await api.getUsers({ limit: 100 });
      
      if (response.success && response.data) {
        const usersArray = Array.isArray(response.data) ? response.data : [];
        console.log('✅ Users fetched successfully:', usersArray.length);
        setUsers(usersArray);
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
        <Text style={styles.title}>{section.title}</Text>
        <View style={styles.placeholder} />
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

        {section.items.map((item) => {
          const itemUsers = filteredUsers[item.label] || [];
          
          return (
            <View key={item.label} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{item.label}</Text>
                <Text style={styles.userCount}>{itemUsers.length} profiles</Text>
              </View>
              
              {itemUsers.length > 0 ? (
                <View style={styles.usersGrid}>
                  {itemUsers.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.userCard}
                      onPress={() => onUserSelect(user)}
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
                  <Text style={styles.emptyText}>No {item.label.toLowerCase()} profiles found</Text>
                </View>
              )}
            </View>
          );
        })}
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
});

export default DirectoryPage;
