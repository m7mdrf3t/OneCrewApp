import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface User {
  id: string;
  name: string;
  email: string;
  category: 'crew' | 'talent' | 'company';
  primary_role?: string;
  profile_completeness: number;
  online_last_seen?: string;
  bio?: string;
  image_url?: string;
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

interface UserTableProps {
  title: string;
  users: User[];
  onUserSelect?: (user: User) => void;
  isDark?: boolean;
  onFetchCompleteData?: (userId: string) => void;
  loadingCompleteData?: Set<string>;
}

const UserTable: React.FC<UserTableProps> = ({
  title,
  users,
  onUserSelect,
  isDark = false,
  onFetchCompleteData,
  loadingCompleteData = new Set(),
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getOnlineStatus = (lastSeen?: string) => {
    if (!lastSeen) return 'Offline';
    
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 5) return 'Online';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return 'Offline';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'talent':
        return 'person';
      case 'crew':
        return 'people';
      case 'company':
        return 'business';
      default:
        return 'person';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'talent':
        return '#ff6b6b';
      case 'crew':
        return '#4ecdc4';
      case 'company':
        return '#45b7d1';
      default:
        return '#95a5a6';
    }
  };

  if (users.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#1f2937' : '#fff' }]}>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>{title}</Text>
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={isDark ? '#6b7280' : '#9ca3af'} />
          <Text style={[styles.emptyText, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
            No {title.toLowerCase()} found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1f2937' : '#fff' }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons 
            name={getCategoryIcon(title.toLowerCase())} 
            size={20} 
            color={getCategoryColor(title.toLowerCase())} 
          />
          <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>{title}</Text>
        </View>
        <Text style={[styles.count, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
          {users.length} {users.length === 1 ? 'user' : 'users'}
        </Text>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        {users.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={[styles.userCard, { backgroundColor: isDark ? '#374151' : '#f9fafb' }]}
            onPress={async () => {
              // For talent users without complete data, fetch it first
              if (user.category === 'talent' && !user.about && onFetchCompleteData) {
                // Note: UserTable doesn't have access to the updated user data
                // The parent component should handle this
                onFetchCompleteData(user.id);
              }
              onUserSelect?.(user);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.userHeader}>
              <View style={[styles.avatar, { backgroundColor: getCategoryColor(user.category) }]}>
                <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
                  {user.name}
                </Text>
                <Text style={[styles.userRole, { color: isDark ? '#9ca3af' : '#6b7280' }]} numberOfLines={1}>
                  {user.primary_role || 'No role specified'}
                </Text>
              </View>
            </View>
            
            <View style={styles.userDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="mail" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                <Text style={[styles.detailText, { color: isDark ? '#9ca3af' : '#6b7280' }]} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="time" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                <Text style={[styles.detailText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                  {getOnlineStatus(user.online_last_seen)}
                </Text>
              </View>

              {/* Talent-specific details - only show if data is available */}
              {user.category === 'talent' && user.about && (
                <>
                  {user.about.height_cm && (
                    <View style={styles.detailRow}>
                      <Ionicons name="resize" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                      <Text style={[styles.detailText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                        {user.about.height_cm}cm
                      </Text>
                    </View>
                  )}
                  
                  {user.about.age && (
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                      <Text style={[styles.detailText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                        {user.about.age} years
                      </Text>
                    </View>
                  )}
                  
                  {user.about.nationality && (
                    <View style={styles.detailRow}>
                      <Ionicons name="flag" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                      <Text style={[styles.detailText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                        {user.about.nationality}
                      </Text>
                    </View>
                  )}
                  
                  {user.about.location && (
                    <View style={styles.detailRow}>
                      <Ionicons name="location" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                      <Text style={[styles.detailText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                        {user.about.location}
                      </Text>
                    </View>
                  )}
                  
                  {(user.about.hair_color || user.about.hair_colors?.name) && (
                    <View style={styles.detailRow}>
                      <Ionicons name="cut" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                      <Text style={[styles.detailText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                        {user.about.hair_colors?.name || user.about.hair_color}
                      </Text>
                    </View>
                  )}
                  
                  {(user.about.skin_tone || user.about.skin_tones?.name) && (
                    <View style={styles.detailRow}>
                      <Ionicons name="color-palette" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                      <Text style={[styles.detailText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                        {user.about.skin_tones?.name || user.about.skin_tone}
                      </Text>
                    </View>
                  )}
                  
                  {user.about.eye_color && (
                    <View style={styles.detailRow}>
                      <Ionicons name="eye" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                      <Text style={[styles.detailText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                        {user.about.eye_color}
                      </Text>
                    </View>
                  )}
                  
                  {user.skills && user.skills.length > 0 && (
                    <View style={styles.detailRow}>
                      <Ionicons name="star" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                      <Text style={[styles.detailText, { color: isDark ? '#9ca3af' : '#6b7280' }]} numberOfLines={1}>
                        {user.skills
                          .map((skill: any) => {
                            if (typeof skill === 'string') return skill;
                            return skill?.skill_name || skill?.name || skill?.skills?.name || String(skill?.skill_id || skill?.id || '');
                          })
                          .slice(0, 2)
                          .join(', ')}{user.skills.length > 2 ? '...' : ''}
                      </Text>
                    </View>
                  )}
                </>
              )}
              
              {/* Show message if talent profile data is not available */}
              {user.category === 'talent' && !user.about && (
                <View style={styles.detailRow}>
                  <Ionicons 
                    name={loadingCompleteData.has(user.id) ? "refresh" : "information-circle"} 
                    size={12} 
                    color={isDark ? '#9ca3af' : '#6b7280'} 
                  />
                  <Text style={[styles.detailText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                    {loadingCompleteData.has(user.id) ? 'Loading details...' : 'Profile details not loaded'}
                  </Text>
                </View>
              )}
              
              <View style={styles.progressContainer}>
                <Text style={[styles.progressLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                  Profile: {user.profile_completeness}%
                </Text>
                <View style={[styles.progressBar, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${user.profile_completeness}%`,
                        backgroundColor: getCategoryColor(user.category)
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  count: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    marginHorizontal: -4,
  },
  userCard: {
    width: 200,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
  },
  userDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    flex: 1,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
});

export default UserTable;
