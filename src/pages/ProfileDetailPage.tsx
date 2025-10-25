import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileDetailPageProps } from '../types';
import { getInitials } from '../data/mockData';
import { useApi } from '../contexts/ApiContext';
import ProfileCompletionBanner from '../components/ProfileCompletionBanner';

const ProfileDetailPage: React.FC<ProfileDetailPageProps & { onLogout?: () => void; onNavigate?: (page: string, data?: any) => void }> = ({
  profile,
  onBack,
  onAssignToProject,
  onAddToTeam,
  myTeam,
  onStartChat,
  onMediaSelect,
  isCurrentUser = false,
  onLogout,
  onNavigate,
}) => {
  const { api, user: currentUser } = useApi();
  const [userProfile, setUserProfile] = useState(profile);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileCompleteness, setProfileCompleteness] = useState(0);

  // Fetch fresh user data if we have a user ID
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!profile?.id || profile.id === '' || profile.id === 'undefined') {
        console.log('⚠️ No valid profile ID provided, skipping fetch');
        console.log('⚠️ Profile ID value:', profile?.id);
        return;
      }
      
      // Skip fetch if we already have complete profile data
      // Check for both basic profile data and talent-specific data
      const hasBasicData = profile.bio && profile.skills && profile.stats;
      const hasTalentData = profile.category !== 'talent' || (profile.about && profile.about.height_cm);
      
      if (hasBasicData && hasTalentData) {
        console.log('✅ Profile data already complete, skipping fetch');
        setUserProfile(profile);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('👤 Fetching user profile directly for ID:', profile.id);
        console.log('👤 Profile object:', profile);
        
        let response;
        try {
          // Fetch from both UserDetails and Talent Profile endpoints
          console.log('🔍 Fetching user profile, user details, and talent profile...');
          
          // Get basic user profile
          const userResponse = await api.getUserByIdDirect(profile.id);
          console.log('✅ User profile fetched:', userResponse);
          
          // Get UserDetails (age, nationality, gender only)
          let userDetailsResponse = null;
          try {
            userDetailsResponse = await api.getUserDetails(profile.id);
            console.log('✅ User details (age, nationality, gender) fetched:', userDetailsResponse);
          } catch (detailsError: any) {
            // 404 is expected if user details don't exist yet
            if (detailsError.message?.includes('404') || detailsError.message?.includes('not found')) {
              console.log('ℹ️ User details not created yet, continuing without details');
            } else {
              console.log('⚠️ Error fetching user details:', detailsError.message);
            }
          }

          // Get talent profile data (all other physical and professional details)
          let talentProfileResponse = null;
          try {
            const accessToken = (api as any).auth?.authToken || (api as any).auth?.getAuthToken?.();
            if (accessToken) {
              const talentResponse = await fetch('https://onecrewbe-production.up.railway.app/api/talent/profile', {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
              });
              
              if (talentResponse.ok) {
                talentProfileResponse = await talentResponse.json();
                console.log('✅ Talent profile data fetched:', talentProfileResponse);
              } else {
                console.log('⚠️ Talent profile not found, continuing without details');
              }
            }
          } catch (talentError: any) {
            console.log('⚠️ Talent profile fetch failed, continuing without details:', talentError.message);
          }

          // Get user skills
          let userSkillsResponse = null;
          try {
            userSkillsResponse = await api.getUserSkills();
            console.log('✅ User skills fetched:', userSkillsResponse);
            console.log('🔍 User skills data structure:', JSON.stringify(userSkillsResponse, null, 2));
            console.log('🔍 User skills data array:', userSkillsResponse?.data);
            console.log('🔍 User skills data length:', userSkillsResponse?.data?.length);
          } catch (skillsError: any) {
            console.log('ℹ️ User skills not accessible:', skillsError.message);
            console.log('🔍 Skills error details:', skillsError);
          }
          
          // Combine the data: UserDetails + Talent Profile + Skills
          response = {
            success: true,
            data: {
              ...userResponse.data,
              skills: userSkillsResponse?.data || [], // Add skills data
              about: {
                ...userDetailsResponse?.data,  // age, nationality, gender
                ...talentProfileResponse?.data // height, weight, skin_tone, etc.
              }
            }
          };
          console.log('✅ Combined profile data:', response);
        } catch (error: any) {
          console.log('❌ API methods failed, trying fallback...', error.message);
          // Fallback to regular API methods
          try {
            response = await api.getUserByIdDirect(profile.id);
            console.log('✅ Fallback API method succeeded');
            
            // Try to get skills for fallback case too
            try {
              const userSkillsResponse = await api.getUserSkills();
              console.log('🔍 Fallback skills response:', userSkillsResponse);
              if (userSkillsResponse?.data && response.data) {
                (response.data as any).skills = userSkillsResponse.data;
                console.log('✅ Skills added to fallback response:', userSkillsResponse.data);
              }
            } catch (skillsError: any) {
              console.log('ℹ️ Skills not available in fallback:', skillsError.message);
              console.log('🔍 Fallback skills error:', skillsError);
            }
          } catch (fallbackError: any) {
            console.log('❌ Fallback API method failed, trying regular method...', fallbackError.message);
            response = await api.getUserById(profile.id);
            console.log('✅ Regular API method succeeded');
            
            // Try to get skills for regular method too
            try {
              const userSkillsResponse = await api.getUserSkills();
              console.log('🔍 Regular method skills response:', userSkillsResponse);
              if (userSkillsResponse?.data && response.data) {
                (response.data as any).skills = userSkillsResponse.data;
                console.log('✅ Skills added to regular response:', userSkillsResponse.data);
              }
            } catch (skillsError: any) {
              console.log('ℹ️ Skills not available in regular method:', skillsError.message);
              console.log('🔍 Regular method skills error:', skillsError);
            }
          }
        }
        
        if (response.success && response.data) {
          console.log('User profile fetched successfully');
          // Transform the data to match expected format
          const rawSkills = (response.data as any).skills || [];
          console.log('🔍 Raw skills from response:', rawSkills);
          console.log('🔍 Raw skills type:', typeof rawSkills);
          console.log('🔍 Raw skills is array:', Array.isArray(rawSkills));
          
          const transformedSkills = Array.isArray(rawSkills) 
            ? rawSkills.map((skill: any) => {
                console.log('🔍 Processing skill in ProfileDetailPage:', skill);
                return skill.skill_name || skill.name || skill;
              })
            : [];
          
          console.log('🔍 Transformed skills:', transformedSkills);
          
          const transformedProfile = {
            ...response.data,
            stats: (response.data as any).stats || {
              followers: '0',
              projects: 0,
              likes: '0'
            },
            skills: transformedSkills,
            bio: response.data.bio || 'No bio available',
            onlineStatus: (response.data as any).onlineStatus || response.data.online_last_seen || 'Last seen recently',
            about: (response.data as any).about || {
              gender: 'unknown'
            }
          };
          
          console.log('🔍 Final transformed profile skills:', transformedProfile.skills);
          setUserProfile(transformedProfile);
        } else {
          console.error('Failed to fetch user profile:', response.error);
          setError('Failed to load profile');
        }
      } catch (err: any) {
        console.error('Error fetching user profile:', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [profile?.id, api]);

  const isInTeam = myTeam.some(member => member.id === userProfile.id);

  // Calculate profile completeness
  const calculateProfileCompleteness = (profile: any) => {
    const fields = [
      profile.bio,
      profile.specialty,
      profile.skills && profile.skills.length > 0,
      profile.about?.gender,
      profile.about?.age,
      profile.about?.nationality,
      profile.about?.location,
      profile.imageUrl || profile.image_url,
    ];
    
    const completedFields = fields.filter(Boolean).length;
    return Math.round((completedFields / fields.length) * 100);
  };

  // Check if this is the current user's profile and if it's incomplete
  const isCurrentUserProfile = isCurrentUser && currentUser && userProfile.id === currentUser.id;
  const shouldShowCompletionBanner = Boolean(isCurrentUserProfile && profileCompleteness < 100);

  // Update profile completeness when userProfile changes
  useEffect(() => {
    const completeness = calculateProfileCompleteness(userProfile);
    setProfileCompleteness(completeness);
  }, [userProfile]);

  const handleProfileUpdated = (updatedProfile: any) => {
    setUserProfile(updatedProfile);
  };

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Loading...</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Error</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            setError(null);
            setIsLoading(true);
            // Re-trigger the useEffect by updating the profile ID
            setUserProfile(profile);
          }}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
        <Text style={styles.title}>{userProfile.name}</Text>
        {isCurrentUser && onLogout ? (
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Ionicons name="log-out" size={24} color="#ff4444" />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Completion Banner */}
        <ProfileCompletionBanner
          completionPercentage={profileCompleteness}
          onCompleteProfile={() => onNavigate?.('profileCompletion', userProfile)}
          isVisible={shouldShowCompletionBanner}
        />
        
        <View style={styles.hero}>
          {userProfile.imageUrl || userProfile.image_url ? (
            <Image 
              source={{ uri: userProfile.imageUrl || userProfile.image_url }} 
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.heroInitials}>{getInitials(userProfile.name)}</Text>
          )}
        </View>
        <View style={styles.profileContainer}>
          <View style={styles.nameRow}> 
            <Text style={styles.name}>{userProfile.name}</Text>
            <Ionicons name={userProfile.about?.gender?.toLowerCase() === 'female' ? 'woman' : 'man'} size={18} color="#fff" />
          </View>
          <Text style={styles.lastSeen}>{userProfile.onlineStatus || userProfile.online_last_seen || 'Last seen recently'}</Text>

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaLight]}
              onPress={() => onAddToTeam(userProfile)}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.ctaText}>My Team</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaDark]}
              onPress={() => onAssignToProject(userProfile)}
            >
              <Text style={styles.ctaText}>Add to Crew</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{userProfile.stats?.followers || '0'}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{userProfile.stats?.projects || '0'}</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{userProfile.stats?.likes || '0'}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>

          <View style={styles.bioContainer}>
            <Text style={styles.sectionHeader}>About</Text>
            <Text style={styles.bio}>{userProfile.bio || 'No bio available'}</Text>
          </View>

          {/* Portfolio Section */}
          {userProfile.portfolio && userProfile.portfolio.length > 0 && (
            <View style={styles.portfolioContainer}>
              <Text style={styles.sectionHeader}>Portfolio</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioScroll}>
                {userProfile.portfolio.map((item: any, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.portfolioItem}
                    onPress={() => onMediaSelect?.(item)}
                  >
                    <View style={styles.portfolioItemHeader}>
                      <Text style={styles.portfolioItemType}>
                        {item.kind === 'image' ? '📷' : '🎥'}
                      </Text>
                    </View>
                    
                    {/* Show image preview if it's an image */}
                    {item.kind === 'image' && item.url ? (
                      <Image 
                        source={{ uri: item.url }} 
                        style={styles.portfolioItemImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.portfolioItemUrl} numberOfLines={2}>
                        {item.url}
                      </Text>
                    )}
                    
                    {item.caption && (
                      <Text style={styles.portfolioItemCaption} numberOfLines={2}>
                        {item.caption}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Social Media Links */}
          {userProfile.social_links && userProfile.social_links.length > 0 && (
            <View style={styles.socialLinksContainer}>
              <Text style={styles.sectionHeader}>Social Media & Links</Text>
              <View style={styles.socialLinksList}>
                {userProfile.social_links.map((link: any, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.socialLinkItem}
                    onPress={() => Linking.openURL(link.url)}
                  >
                    <View style={styles.socialLinkHeader}>
                      <Text style={styles.socialLinkPlatform}>
                        {link.platform === 'instagram' ? '📷 Instagram' :
                         link.platform === 'twitter' ? '🐦 Twitter' :
                         link.platform === 'facebook' ? '📘 Facebook' :
                         link.platform === 'linkedin' ? '💼 LinkedIn' :
                         link.platform === 'youtube' ? '📺 YouTube' :
                         link.platform === 'tiktok' ? '🎵 TikTok' :
                         link.platform === 'website' ? '🌐 Website' : '🔗 Other'}
                      </Text>
                      <Ionicons name="open-outline" size={16} color="#6b7280" />
                    </View>
                    <Text style={styles.socialLinkUrl} numberOfLines={1}>
                      {link.url}
                    </Text>
                    {link.username && (
                      <Text style={styles.socialLinkUsername} numberOfLines={1}>
                        @{link.username}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Talent Profile Details */}
          {userProfile.category === 'talent' && userProfile.about && (
            <View style={styles.talentDetailsContainer}>
              <Text style={styles.sectionTitle}>Talent Details</Text>
              <View style={styles.talentDetailsGrid}>
                {userProfile.about.height_cm && (
                  <View style={styles.detailItem}>
                    <Ionicons name="resize" size={16} color="#8b5cf6" />
                    <Text style={styles.detailLabel}>Height</Text>
                    <Text style={styles.detailValue}>{userProfile.about.height_cm} cm</Text>
                  </View>
                )}
                {userProfile.about.weight_kg && (
                  <View style={styles.detailItem}>
                    <Ionicons name="fitness" size={16} color="#8b5cf6" />
                    <Text style={styles.detailLabel}>Weight</Text>
                    <Text style={styles.detailValue}>{userProfile.about.weight_kg} kg</Text>
                  </View>
                )}
                {userProfile.about.eye_color && (
                  <View style={styles.detailItem}>
                    <Ionicons name="eye" size={16} color="#8b5cf6" />
                    <Text style={styles.detailLabel}>Eye Color</Text>
                    <Text style={styles.detailValue}>{userProfile.about.eye_color}</Text>
                  </View>
                )}
                {(userProfile.about.hair_color || userProfile.about.hair_colors?.name) && (
                  <View style={styles.detailItem}>
                    <Ionicons name="cut" size={16} color="#8b5cf6" />
                    <Text style={styles.detailLabel}>Hair Color</Text>
                    <Text style={styles.detailValue}>
                      {userProfile.about.hair_colors?.name || userProfile.about.hair_color}
                    </Text>
                  </View>
                )}
                {(userProfile.about.skin_tone || userProfile.about.skin_tones?.name) && (
                  <View style={styles.detailItem}>
                    <Ionicons name="color-palette" size={16} color="#8b5cf6" />
                    <Text style={styles.detailLabel}>Skin Tone</Text>
                    <Text style={styles.detailValue}>
                      {userProfile.about.skin_tones?.name || userProfile.about.skin_tone}
                    </Text>
                  </View>
                )}
                {userProfile.about.age && (
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar" size={16} color="#8b5cf6" />
                    <Text style={styles.detailLabel}>Age</Text>
                    <Text style={styles.detailValue}>{userProfile.about.age} years</Text>
                  </View>
                )}
                {userProfile.about.nationality && (
                  <View style={styles.detailItem}>
                    <Ionicons name="flag" size={16} color="#8b5cf6" />
                    <Text style={styles.detailLabel}>Nationality</Text>
                    <Text style={styles.detailValue}>{userProfile.about.nationality}</Text>
                  </View>
                )}
                {userProfile.about.location && (
                  <View style={styles.detailItem}>
                    <Ionicons name="location" size={16} color="#8b5cf6" />
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{userProfile.about.location}</Text>
                  </View>
                )}
                <View style={styles.detailItem}>
                  <Ionicons name="airplane" size={16} color="#8b5cf6" />
                  <Text style={styles.detailLabel}>Travel Ready</Text>
                  <Text style={[styles.detailValue, { color: userProfile.about.travel_ready ? '#10b981' : '#ef4444' }]}>
                    {userProfile.about.travel_ready ? 'Yes' : 'No'}
                  </Text>
                </View>
                {userProfile.about.dialects && userProfile.about.dialects.length > 0 && (
                  <View style={styles.detailItem}>
                    <Ionicons name="chatbubbles" size={16} color="#8b5cf6" />
                    <Text style={styles.detailLabel}>Dialects</Text>
                    <Text style={styles.detailValue}>{userProfile.about.dialects.join(', ')}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Body Measurements */}
          {userProfile.category === 'talent' && userProfile.about && (
            (userProfile.about.chest_cm || userProfile.about.waist_cm || userProfile.about.hips_cm || userProfile.about.shoe_size_eu) && (
              <View style={styles.talentDetailsContainer}>
                <Text style={styles.sectionTitle}>Body Measurements</Text>
                <View style={styles.talentDetailsGrid}>
                  {userProfile.about.chest_cm && (
                    <View style={styles.detailItem}>
                      <Ionicons name="body" size={16} color="#8b5cf6" />
                      <Text style={styles.detailLabel}>Chest</Text>
                      <Text style={styles.detailValue}>{userProfile.about.chest_cm} cm</Text>
                    </View>
                  )}
                  {userProfile.about.waist_cm && (
                    <View style={styles.detailItem}>
                      <Ionicons name="resize" size={16} color="#8b5cf6" />
                      <Text style={styles.detailLabel}>Waist</Text>
                      <Text style={styles.detailValue}>{userProfile.about.waist_cm} cm</Text>
                    </View>
                  )}
                  {userProfile.about.hips_cm && (
                    <View style={styles.detailItem}>
                      <Ionicons name="ellipse" size={16} color="#8b5cf6" />
                      <Text style={styles.detailLabel}>Hips</Text>
                      <Text style={styles.detailValue}>{userProfile.about.hips_cm} cm</Text>
                    </View>
                  )}
                  {userProfile.about.shoe_size_eu && (
                    <View style={styles.detailItem}>
                      <Ionicons name="footsteps" size={16} color="#8b5cf6" />
                      <Text style={styles.detailLabel}>Shoe Size</Text>
                      <Text style={styles.detailValue}>EU {userProfile.about.shoe_size_eu}</Text>
                    </View>
                  )}
                </View>
              </View>
            )
          )}

          {/* Professional Details */}
          {userProfile.category === 'talent' && userProfile.about && (
            (userProfile.about.reel_url || userProfile.about.union_member !== undefined) && (
              <View style={styles.talentDetailsContainer}>
                <Text style={styles.sectionTitle}>Professional Details</Text>
                <View style={styles.talentDetailsGrid}>
                  {userProfile.about.reel_url && (
                    <View style={[styles.detailItem, { minWidth: '100%' }]}>
                      <Ionicons name="videocam" size={16} color="#8b5cf6" />
                      <Text style={styles.detailLabel}>Reel/Portfolio</Text>
                      <TouchableOpacity onPress={() => Linking.openURL(userProfile.about.reel_url)}>
                        <Text style={[styles.detailValue, { color: '#3b82f6', textDecorationLine: 'underline' }]}>
                          View Portfolio
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={styles.detailItem}>
                    <Ionicons name="ribbon" size={16} color="#8b5cf6" />
                    <Text style={styles.detailLabel}>Union Member</Text>
                    <Text style={[styles.detailValue, { color: userProfile.about.union_member ? '#10b981' : '#ef4444' }]}>
                      {userProfile.about.union_member ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </View>
              </View>
            )
          )}

          <View style={styles.skillsContainer}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsList}>
              {(userProfile.skills || []).map((skill: string, index: number) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.actionsContainer}>
            {isCurrentUser ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeProfileButton]}
                onPress={() => onNavigate?.('profileCompletion', userProfile)}
              >
                <Ionicons name="person-add" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {profileCompleteness < 100 ? 'Complete Profile' : 'Edit Profile'}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={onStartChat}
                >
                  <Ionicons name="chatbubble" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, isInTeam ? styles.removeButton : styles.addButton]}
                  onPress={() => onAddToTeam(profile)}
                >
                  <Ionicons name={isInTeam ? "remove" : "add"} size={20} color="#fff" />
                  <Text style={styles.secondaryButtonText}>
                    {isInTeam ? "Remove from Team" : "Add to Team"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.assignButton]}
                  onPress={() => onAssignToProject(profile)}
                >
                  <Ionicons name="briefcase" size={20} color="#fff" />
                  <Text style={styles.secondaryButtonText}>Assign to Project</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
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
  hero: {
    height: 360,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInitials: {
    fontSize: 220,
    fontWeight: '800',
    color: '#9ca3af',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  profileContainer: {
    padding: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  lastSeen: {
    fontSize: 14,
    color: '#d1d5db',
    marginBottom: 16,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  ctaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  ctaLight: {
    backgroundColor: '#1f2937',
  },
  ctaDark: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bioContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  bio: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  talentDetailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  talentDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
    marginRight: 8,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '600',
    flex: 1,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    borderWidth: 2,
    borderColor: '#111111',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
  },
  skillsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    backgroundColor: '#f4f4f5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffe6e6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  addButton: {
    backgroundColor: '#10b981',
  },
  removeButton: {
    backgroundColor: '#ef4444',
  },
  assignButton: {
    backgroundColor: '#f59e0b',
  },
  completeProfileButton: {
    backgroundColor: '#8b5cf6',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#71717a',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Portfolio styles
  portfolioContainer: {
    marginBottom: 24,
  },
  portfolioScroll: {
    marginTop: 12,
  },
  portfolioItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 150,
    maxWidth: 200,
  },
  portfolioItemImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  portfolioItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  portfolioItemType: {
    fontSize: 16,
  },
  portfolioItemUrl: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  portfolioItemCaption: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  // Social media styles
  socialLinksContainer: {
    marginBottom: 24,
  },
  socialLinksList: {
    marginTop: 12,
    gap: 8,
  },
  socialLinkItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  socialLinkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  socialLinkPlatform: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  socialLinkUrl: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  socialLinkUsername: {
    fontSize: 11,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});

export default ProfileDetailPage;
