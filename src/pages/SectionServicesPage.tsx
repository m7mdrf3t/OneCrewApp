import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ServiceCard from '../components/ServiceCard';
import { useApi } from '../contexts/ApiContext';
import { User } from '../types';
import { filterRolesByCategory, getRoleName } from '../utils/roleCategorizer';

interface SectionServicesPageProps {
  section: {
    key: string;
    title: string;
    items: Array<{ label: string; users?: number }>;
  };
  onBack: () => void;
  onServiceSelect: (serviceData: any, sectionKey: string) => void;
}

const SectionServicesPage: React.FC<SectionServicesPageProps> = ({
  section,
  onBack,
  onServiceSelect,
}) => {
  const { getRoles, getUsersDirect, isGuest, browseUsersAsGuest } = useApi();
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleCounts, setRoleCounts] = useState<{ [key: string]: number }>({});

  // Load roles and users from database
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.key]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch roles from API
      const rolesResponse = await getRoles();
      if (rolesResponse.success && rolesResponse.data) {
        const rolesData = Array.isArray(rolesResponse.data) ? rolesResponse.data : [];
        setRoles(rolesData);
      }

      // Fetch users from API
      let usersData: User[] = [];
      if (isGuest) {
        const guestResponse = await browseUsersAsGuest({ 
          limit: 1000,
          category: section.key === 'individuals' ? 'crew' : section.key === 'talent' ? 'talent' : undefined
        });
        if (guestResponse.success && guestResponse.data) {
          usersData = Array.isArray(guestResponse.data) ? guestResponse.data : (guestResponse.data.data || []);
        }
      } else {
        const usersResponse = await getUsersDirect({ limit: 1000 });
        if (usersResponse.success && usersResponse.data) {
          usersData = Array.isArray(usersResponse.data) ? usersResponse.data : (usersResponse.data.data || []);
        }
      }
      
      // Filter users by category
      const categoryFilter = section.key === 'individuals' ? 'crew' : section.key === 'talent' ? 'talent' : undefined;
      const filteredUsers = categoryFilter 
        ? usersData.filter(u => u.category === categoryFilter)
        : usersData;
      
      setUsers(filteredUsers);

      // Count users by role using improved matching
      const counts: { [key: string]: number } = {};
      
      // Role mapping similar to DirectoryPage for accurate matching
      const roleMapping: { [key: string]: string[] } = {
        'Actor': ['actor'],
        'Singer': ['singer'],
        'Dancer': ['dancer'],
        'Director': ['director'],
        'Producer': ['producer'],
        'Writer': ['scriptwriter', 'writer'],
        'Creative Director': ['creative director', 'creative_director'],
        'DOP': ['dop', 'cinematographer', 'director of photography'],
        'Editor': ['editor'],
        'Composer': ['composer'],
        'VFX Artist': ['vfx', 'vfx artist'],
        'Colorist': ['colorist'],
        'Sound Engineer': ['sound_engineer', 'sound engineer'],
        'Sound Designer': ['sound_designer', 'sound designer'],
        'Gaffer': ['gaffer'],
        'Grip': ['grip'],
        'Art Director': ['art director', 'art_director'],
        'Makeup Artist': ['makeup_artist', 'makeup artist'],
        'Stylist': ['stylist'],
      };
      
      if (rolesResponse.success && rolesResponse.data) {
        rolesResponse.data.forEach((role: any) => {
          const roleName = typeof role === 'string' ? role : role.name;
          
          // Try exact match first, then use mapping
          const matchingRoles = roleMapping[roleName] || [roleName.toLowerCase()];
          
          const count = filteredUsers.filter(user => {
            const userRole = (user.primary_role || user.specialty || '').toLowerCase();
            if (!userRole) return false;
            
            // Check if user role matches any of the mapped roles
            return matchingRoles.some(mappedRole => 
              userRole.includes(mappedRole.toLowerCase()) || 
              mappedRole.toLowerCase().includes(userRole)
            );
          }).length;
          
          counts[roleName] = count;
        });
      }
      
      setRoleCounts(counts);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Map roles to section items with real counts
  const realSectionItems = useMemo(() => {
    if (isLoading || roles.length === 0) {
      // Return mock data while loading
      return section.items;
    }

    // Filter roles based on section category using the same logic as signup
    let filteredRoles = roles;
    
    if (section.key === 'individuals') {
      // Crew section: use the same categorization as signup
      filteredRoles = filterRolesByCategory(roles, 'crew');
    } else if (section.key === 'talent') {
      // Talent section: use the same categorization as signup
      filteredRoles = filterRolesByCategory(roles, 'talent');
    } else {
      // For other sections (technicians, specialized), keep all roles
      // These sections might have their own specific roles
      filteredRoles = roles;
    }

    // Create items with real counts
    const items = filteredRoles.map((role: any) => {
      const roleName = getRoleName(role);
      const count = roleCounts[roleName] || 0;
      return {
        label: roleName,
        users: count
      };
    });

    // Sort: roles with users first (descending by count), then roles without users alphabetically
    return items.sort((a, b) => {
      if (a.users > 0 && b.users === 0) return -1;
      if (a.users === 0 && b.users > 0) return 1;
      if (a.users > 0 && b.users > 0) return b.users - a.users;
      return a.label.localeCompare(b.label);
    });
  }, [roles, roleCounts, section.key, section.items, isLoading]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>{section.title}</Text>
        <View style={styles.placeholder} />
      </View>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading roles...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.servicesContainer}>
            {realSectionItems.length > 0 ? (
              realSectionItems.map((item, index) => (
                <ServiceCard
                  key={index}
                  item={item}
                  onSelect={() => onServiceSelect(item, section.key)}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No roles found</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
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
  servicesContainer: {
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
});

export default SectionServicesPage;
