import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Linking, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { ProfileDetailPageProps } from '../types';
import { getInitials } from '../data/mockData';
import { useApi } from '../contexts/ApiContext';
import ProfileCompletionBanner from '../components/ProfileCompletionBanner';
import SignUpPromptModal from '../components/SignUpPromptModal';

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
  const { 
    api, 
    user: currentUser, 
    isGuest, 
    isAuthenticated,
    getUserCompanies,
    switchToCompanyProfile,
    switchToUserProfile,
    currentProfileType,
    activeCompany
  } = useApi();
  const [userProfile, setUserProfile] = useState(profile);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [isMediaModalVisible, setIsMediaModalVisible] = useState(false);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [promptAction, setPromptAction] = useState<string>('');
  const [galleryTab, setGalleryTab] = useState<'albums' | 'images' | 'videos' | 'audio'>('albums');
  const [showCompletionBanner, setShowCompletionBanner] = useState(true);
  const [userCompanies, setUserCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

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

          // Check if viewing own profile - only fetch authenticated data for own profile
          const isViewingOwnProfile = isAuthenticated && !isGuest && currentUser && profile.id === currentUser.id;

          // Get talent profile data (all other physical and professional details)
          let talentProfileResponse = null;
          // Only fetch talent profile if authenticated, not guest, and viewing own profile
          if (isViewingOwnProfile) {
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
          } else {
            console.log('ℹ️ Skipping talent profile fetch (guest mode or viewing other user profile)');
          }

          // Get user skills - only if authenticated and viewing own profile
          let userSkillsResponse = null;
          
          if (isViewingOwnProfile) {
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
          } else {
            console.log('ℹ️ Skipping user skills fetch (guest mode or viewing other user profile)');
          }
          
          // Combine the data: UserDetails + Talent Profile + Skills
          response = {
            success: true,
            data: {
              ...userResponse.data,
              skills: (userSkillsResponse?.data || []).map((skillObj: any) => {
                // Transform skill objects to skill names
                if (typeof skillObj === 'string') return skillObj;
                return skillObj?.skill_name || skillObj?.name || skillObj?.skills?.name || skillObj?.skills?.skill_name || String(skillObj?.skill_id || skillObj?.id || '');
              }), // Add skills data (transformed to names)
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
            
            // Try to get skills for fallback case too - only if viewing own profile
            const isViewingOwnProfileFallback = isAuthenticated && !isGuest && currentUser && profile.id === currentUser.id;
            if (isViewingOwnProfileFallback) {
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
            } else {
              console.log('ℹ️ Skipping skills fetch in fallback (guest mode or viewing other user profile)');
            }
          } catch (fallbackError: any) {
            console.log('❌ Fallback API method failed, trying regular method...', fallbackError.message);
            response = await api.getUserById(profile.id);
            console.log('✅ Regular API method succeeded');
            
            // Try to get skills for regular method too - only if viewing own profile
            const isViewingOwnProfileRegular = isAuthenticated && !isGuest && currentUser && profile.id === currentUser.id;
            if (isViewingOwnProfileRegular) {
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
            } else {
              console.log('ℹ️ Skipping skills fetch in regular method (guest mode or viewing other user profile)');
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
                // Handle different skill formats
                if (typeof skill === 'string') {
                  return skill;
                } else if (skill?.skill_name) {
                  return skill.skill_name;
                } else if (skill?.name) {
                  return skill.name;
                } else if (skill?.skills?.name) {
                  return skill.skills.name;
                } else if (skill?.skills?.skill_name) {
                  return skill.skills.skill_name;
                } else {
                  // Fallback: try to get name from nested structure
                  return String(skill?.skill_id || skill?.id || skill || '');
                }
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
            },
            // Map user_portfolios to portfolio for the UI
            portfolio: (response.data as any).user_portfolios || (response.data as any).portfolio || [],
            // Preserve languages and abilities
            languages: (response.data as any).languages || (response.data as any).user_languages?.map((lang: any) => lang.language_name || lang.name || lang) || [],
            abilities: (response.data as any).abilities || (response.data as any).user_abilities?.map((ability: any) => ability.ability_name || ability.name || ability) || []
          };
          
          console.log('🔍 Final transformed profile skills:', transformedProfile.skills);
          console.log('🔍 Portfolio data from API:', (response.data as any).user_portfolios);
          console.log('🔍 Mapped portfolio data:', transformedProfile.portfolio);
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

  // Fetch user companies - for both own profile and other users' profiles
  useEffect(() => {
    const loadUserCompanies = async () => {
      const userIdToFetch = isCurrentUser && currentUser?.id 
        ? currentUser.id 
        : (profile?.id || userProfile?.id);
      
      if (userIdToFetch && !isGuest && isAuthenticated) {
        try {
          setLoadingCompanies(true);
          const response = await getUserCompanies(userIdToFetch);
          if (response.success && response.data) {
            const companies = Array.isArray(response.data) ? response.data : (response.data.data || []);
            setUserCompanies(companies);
          }
        } catch (err) {
          console.error('Failed to load user companies:', err);
        } finally {
          setLoadingCompanies(false);
        }
      }
    };
    loadUserCompanies();
  }, [isCurrentUser, currentUser?.id, profile?.id, userProfile?.id, isGuest, isAuthenticated, getUserCompanies]);

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

  // Helper functions to separate images and videos
  const getImages = () => {
    return (userProfile.portfolio || []).filter((item: any) => item.kind === 'image');
  };

  const getVideos = () => {
    return (userProfile.portfolio || []).filter((item: any) => item.kind === 'video');
  };

  const openMediaModal = (media: any) => {
    setSelectedMedia(media);
    setIsMediaModalVisible(true);
  };

  const closeMediaModal = () => {
    setSelectedMedia(null);
    setIsMediaModalVisible(false);
  };

  // Format last seen time
  const formatLastSeen = (lastSeen: string) => {
    if (!lastSeen) return 'Last seen recently';
    
    try {
      const lastSeenDate = new Date(lastSeen);
      const now = new Date();
      const diffMs = now.getTime() - lastSeenDate.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMinutes < 1) {
        return 'Last seen just now';
      } else if (diffMinutes < 60) {
        return `Last seen ${diffMinutes}m ago`;
      } else if (diffHours < 24) {
        return `Last seen ${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `Last seen ${diffDays}d ago`;
      } else {
        return 'Last seen recently';
      }
    } catch (error) {
      return 'Last seen recently';
    }
  };

  // Format stat numbers (e.g., 10000 -> 10k)
  const formatStatNumber = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
    if (isNaN(num)) return '0';
    
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
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
          onCompleteProfile={() => {
            if (isGuest) {
              setPromptAction('complete your profile');
              setShowSignUpPrompt(true);
            } else {
              onNavigate?.('profileCompletion', userProfile);
            }
          }}
          onSkip={() => setShowCompletionBanner(false)}
          isVisible={shouldShowCompletionBanner && showCompletionBanner}
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
          {/* Calendar Icon - Top Right */}
          <TouchableOpacity style={styles.heroCalendarIcon}>
            <View style={styles.calendarIconCircle}>
              <Ionicons name="calendar-outline" size={18} color="#000" />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.profileContainer}>
          <View style={styles.nameRow}> 
            <Text style={styles.name}>{userProfile.name}</Text>
            <Ionicons 
              name={userProfile.about?.gender?.toLowerCase() === 'female' ? 'female' : 'male'} 
              size={18} 
              color="#000" 
            />
          </View>
          <Text style={styles.lastSeen}>
            {userProfile.onlineStatus || (userProfile.online_last_seen ? formatLastSeen(userProfile.online_last_seen) : 'Last seen recently')}
          </Text>

          {/* Switch to Company Profile Button */}
          {isCurrentUser && !isGuest && (
            <>
              {currentProfileType === 'company' && activeCompany ? (
                // Show switch back to user profile
                <TouchableOpacity
                  style={styles.switchToCompanyButton}
                  onPress={() => {
                    switchToUserProfile();
                    // Refresh the profile view
                    if (currentUser?.id) {
                      onNavigate?.('myProfile', currentUser);
                    }
                  }}
                >
                  <Ionicons name="person" size={20} color="#fff" />
                  <Text style={styles.switchToCompanyText}>
                    Switch to Personal Profile
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </TouchableOpacity>
              ) : userCompanies.length > 0 ? (
                // Show switch to company profile
                <TouchableOpacity
                  style={styles.switchToCompanyButton}
                  onPress={async () => {
                    try {
                      // Switch to the first company or active company
                      const companyToSwitch = activeCompany || userCompanies[0];
                      const companyId = companyToSwitch.id || companyToSwitch.company_id;
                      await switchToCompanyProfile(companyId);
                      onNavigate?.('companyProfile', { companyId });
                    } catch (error) {
                      console.error('Failed to switch to company profile:', error);
                    }
                  }}
                >
                  <Ionicons name="business" size={20} color="#fff" />
                  <Text style={styles.switchToCompanyText}>
                    {loadingCompanies ? 'Loading...' : `Switch to ${userCompanies[0]?.name || 'Company'} Profile`}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </TouchableOpacity>
              ) : null}
            </>
          )}

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaLight]}
              onPress={() => {
                if (isGuest) {
                  setPromptAction('add users to your team');
                  setShowSignUpPrompt(true);
                } else {
                  onAddToTeam(userProfile);
                }
              }}
            >
              {isInTeam && <Ionicons name="checkmark" size={16} color="#10b981" style={{ marginRight: 4 }} />}
              <Text style={styles.ctaTextLight}>My Team</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaDark]}
              onPress={() => {
                if (isGuest) {
                  setPromptAction('assign users to projects');
                  setShowSignUpPrompt(true);
                } else {
                  onAssignToProject(userProfile);
                }
              }}
            >
              <Text style={styles.ctaText}>Add to Crew</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{formatStatNumber(userProfile.stats?.followers || '0')}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{formatStatNumber(userProfile.stats?.projects || 0)}</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{formatStatNumber(userProfile.stats?.likes || '0')}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>

          {/* About Section */}
          <View style={styles.infoCard}>
            <Text style={styles.infoSectionTitle}>About</Text>
            <Text style={styles.aboutText}>{userProfile.bio || 'No bio available'}</Text>
          </View>

          {/* Personal Information Grid */}
          {userProfile.about && (
            <View style={styles.infoCard}>
              <Text style={styles.infoSectionTitle}>Personal Information</Text>
              <View style={styles.personalInfoGrid}>
                {userProfile.about.gender && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Gender</Text>
                    <Text style={styles.infoTagValue}>{userProfile.about.gender}</Text>
                  </View>
                )}
                {userProfile.about.age && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Age</Text>
                    <Text style={styles.infoTagValue}>{userProfile.about.age}</Text>
                  </View>
                )}
                {userProfile.about.nationality && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Nationality</Text>
                    <Text style={styles.infoTagValue}>{userProfile.about.nationality}</Text>
                  </View>
                )}
                {userProfile.about.location && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Location</Text>
                    <Text style={styles.infoTagValue}>{userProfile.about.location}</Text>
                  </View>
                )}
                {userProfile.about.height_cm && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Height</Text>
                    <Text style={styles.infoTagValue}>{userProfile.about.height_cm} cm</Text>
                  </View>
                )}
                {userProfile.about.weight_kg && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Weight</Text>
                    <Text style={styles.infoTagValue}>{userProfile.about.weight_kg} kg</Text>
                  </View>
                )}
                {(userProfile.about.skin_tone || userProfile.about.skin_tones?.name) && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Skin Tone</Text>
                    <Text style={styles.infoTagValue}>
                      {userProfile.about.skin_tones?.name || userProfile.about.skin_tone}
                    </Text>
                  </View>
                )}
                {(userProfile.about.hair_color || userProfile.about.hair_colors?.name) && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Hair Color</Text>
                    <Text style={styles.infoTagValue}>
                      {userProfile.about.hair_colors?.name || userProfile.about.hair_color}
                    </Text>
                  </View>
                )}
                {userProfile.about.eye_color && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Eye Color</Text>
                    <Text style={styles.infoTagValue}>{userProfile.about.eye_color}</Text>
                  </View>
                )}
                {userProfile.about.chest_cm && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Chest</Text>
                    <Text style={styles.infoTagValue}>{userProfile.about.chest_cm} cm</Text>
                  </View>
                )}
                {userProfile.about.waist_cm && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Waist</Text>
                    <Text style={styles.infoTagValue}>{userProfile.about.waist_cm} cm</Text>
                  </View>
                )}
                {userProfile.about.hips_cm && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Hips</Text>
                    <Text style={styles.infoTagValue}>{userProfile.about.hips_cm} cm</Text>
                  </View>
                )}
                {userProfile.about.shoe_size_eu && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Shoe Size</Text>
                    <Text style={styles.infoTagValue}>EU {userProfile.about.shoe_size_eu}</Text>
                  </View>
                )}
                {userProfile.about.reel_url && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Reel/Portfolio</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(userProfile.about.reel_url)}>
                      <Text style={[styles.infoTagValue, { color: '#3b82f6', textDecorationLine: 'underline' }]}>
                        View Link
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {userProfile.about.union_member !== undefined && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Union Member</Text>
                    <Text style={[styles.infoTagValue, { color: userProfile.about.union_member ? '#10b981' : '#ef4444' }]}>
                      {userProfile.about.union_member ? 'Yes' : 'No'}
                    </Text>
                  </View>
                )}
                {userProfile.primary_role && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Primary Role</Text>
                    <Text style={styles.infoTagValue}>{userProfile.primary_role}</Text>
                  </View>
                )}
                {userProfile.specialty && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Specialty</Text>
                    <Text style={styles.infoTagValue}>{userProfile.specialty}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Skills Section - Right after Personal Information */}
          {userProfile.skills && userProfile.skills.length > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.infoSectionTitle}>Skills</Text>
              <View style={styles.tagList}>
                {userProfile.skills.map((skill: any, index: number) => {
                  // Handle both string and object formats
                  let skillName = '';
                  if (typeof skill === 'string') {
                    skillName = skill;
                  } else if (skill?.skill_name) {
                    skillName = skill.skill_name;
                  } else if (skill?.name) {
                    skillName = skill.name;
                  } else if (skill?.skills?.name) {
                    skillName = skill.skills.name;
                  } else if (skill?.skills?.skill_name) {
                    skillName = skill.skills.skill_name;
                  } else {
                    skillName = String(skill?.skill_id || skill?.id || skill || 'Unknown');
                  }
                  
                  return (
                    <View key={index} style={styles.infoChip}>
                      <Text style={styles.infoChipText}>{skillName}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Gallery/Portfolio Section */}
          {((userProfile.portfolio && userProfile.portfolio.length > 0) || userProfile.category === 'talent') && (
            <View style={styles.galleryContainer}>
              <Text style={styles.galleryTitle}>Gallery</Text>
              
              {/* Gallery Tabs */}
              <View style={styles.galleryTabs}>
                <TouchableOpacity
                  style={[styles.galleryTab, galleryTab === 'albums' && styles.galleryTabActive]}
                  onPress={() => setGalleryTab('albums')}
                >
                  <Ionicons name="folder" size={18} color={galleryTab === 'albums' ? '#fff' : '#000'} />
                  <Text style={[styles.galleryTabText, galleryTab === 'albums' && styles.galleryTabTextActive]}>
                    Albums
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.galleryTab, galleryTab === 'images' && styles.galleryTabActive]}
                  onPress={() => setGalleryTab('images')}
                >
                  <Ionicons name="image" size={18} color={galleryTab === 'images' ? '#fff' : '#000'} />
                  <Text style={[styles.galleryTabText, galleryTab === 'images' && styles.galleryTabTextActive]}>
                    Images
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.galleryTab, galleryTab === 'videos' && styles.galleryTabActive]}
                  onPress={() => setGalleryTab('videos')}
                >
                  <Ionicons name="videocam" size={18} color={galleryTab === 'videos' ? '#fff' : '#000'} />
                  <Text style={[styles.galleryTabText, galleryTab === 'videos' && styles.galleryTabTextActive]}>
                    Videos
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.galleryTab, galleryTab === 'audio' && styles.galleryTabActive]}
                  onPress={() => setGalleryTab('audio')}
                >
                  <Ionicons name="musical-notes" size={18} color={galleryTab === 'audio' ? '#fff' : '#000'} />
                  <Text style={[styles.galleryTabText, galleryTab === 'audio' && styles.galleryTabTextActive]}>
                    Audio
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Gallery Content */}
              <View style={styles.galleryContent}>
                {galleryTab === 'albums' && (
                  <View style={styles.albumGrid}>
                    {/* For now, we'll show a single "All Portfolio" album */}
                    <TouchableOpacity style={styles.albumCard}>
                      <View style={styles.albumTitleLargeContainer}>
                        <Text style={styles.albumTitleLarge}>All Portfolio</Text>
                      </View>
                      <View style={styles.albumInfo}>
                        <Text style={styles.albumTitle}>All Portfolio</Text>
                        <View style={styles.albumStats}>
                          <Ionicons name="image" size={14} color="#000" />
                          <Text style={styles.albumStatText}>{getImages().length}</Text>
                          <Ionicons name="videocam" size={14} color="#000" />
                          <Text style={styles.albumStatText}>{getVideos().length}</Text>
                          <Ionicons name="musical-notes" size={14} color="#000" />
                          <Text style={styles.albumStatText}>0</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
                
                {galleryTab === 'images' && (
                  getImages().length > 0 ? (
                    <View style={styles.imageGrid}>
                      {getImages().map((item: any, index: number) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.imageGridItem}
                          onPress={() => openMediaModal(item)}
                        >
                          <Image 
                            source={{ uri: item.url }} 
                            style={styles.imageThumbnail}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyGallery}>
                      <Text style={styles.emptyGalleryText}>No images available</Text>
                    </View>
                  )
                )}

                {galleryTab === 'videos' && (
                  getVideos().length > 0 ? (
                    <View style={styles.videoGrid}>
                      {getVideos().map((item: any, index: number) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.videoGridItem}
                          onPress={() => openMediaModal(item)}
                        >
                          <View style={styles.videoThumbnailContainer}>
                            <Video
                              source={{ uri: item.url }}
                              style={styles.videoThumbnail}
                              shouldPlay={false}
                              isLooping={false}
                              isMuted={true}
                            />
                            <View style={styles.playButtonOverlay}>
                              <Ionicons name="play" size={32} color="#fff" />
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyGallery}>
                      <Text style={styles.emptyGalleryText}>No videos available</Text>
                    </View>
                  )
                )}

                {galleryTab === 'audio' && (
                  <View style={styles.emptyGallery}>
                    <Text style={styles.emptyGalleryText}>No audio files available</Text>
                  </View>
                )}
              </View>
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

          {/* Accent Section */}
          {userProfile.category === 'talent' && userProfile.about?.dialects && userProfile.about.dialects.length > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.infoSectionTitle}>Accent</Text>
              <View style={styles.tagList}>
                {userProfile.about.dialects.map((dialect: string, index: number) => (
                  <View key={index} style={styles.infoChip}>
                    <Text style={styles.infoChipText}>{dialect}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Availability Section */}
          {userProfile.category === 'talent' && userProfile.about && (
            <View style={styles.infoCard}>
              <Text style={styles.infoSectionTitle}>Availability</Text>
              <View style={styles.tagList}>
                {userProfile.about.travel_ready && (
                  <View style={styles.infoChip}>
                    <Ionicons name="airplane" size={14} color="#000" style={styles.chipIcon} />
                    <Text style={styles.infoChipText}>Willing to Travel</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Languages Section */}
          {userProfile.languages && userProfile.languages.length > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.infoSectionTitle}>Languages</Text>
              <View style={styles.tagList}>
                {userProfile.languages.map((language: any, index: number) => {
                  const langName = typeof language === 'string' ? language : (language.language_name || language.name || language);
                  return (
                    <View key={index} style={styles.infoChip}>
                      <Text style={styles.infoChipText}>{langName}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Abilities Section */}
          {userProfile.abilities && userProfile.abilities.length > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.infoSectionTitle}>Abilities</Text>
              <View style={styles.tagList}>
                {userProfile.abilities.map((ability: any, index: number) => {
                  const abilityName = typeof ability === 'string' ? ability : (ability.ability_name || ability.name || ability);
                  return (
                    <View key={index} style={styles.infoChip}>
                      <Text style={styles.infoChipText}>{abilityName}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Contact Section */}
          {userProfile.email && (
            <View style={styles.infoCard}>
              <View style={styles.contactHeader}>
                <Ionicons name="call" size={20} color="#000" />
                <Text style={styles.infoSectionTitle}>Contact</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactText}>Email: {userProfile.email}</Text>
              </View>
            </View>
          )}

          {/* Companies Section */}
          {(userCompanies.length > 0 || loadingCompanies) && (
            <View style={styles.infoCard}>
              <View style={styles.contactHeader}>
                <Ionicons name="business" size={20} color="#000" />
                <Text style={styles.infoSectionTitle}>Companies</Text>
              </View>
              {loadingCompanies ? (
                <View style={styles.loadingCompaniesContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.loadingCompaniesText}>Loading companies...</Text>
                </View>
              ) : userCompanies.length > 0 ? (
                <View style={styles.companiesList}>
                  {userCompanies.map((company: any) => {
                    const companyId = company.id || company.company_id;
                    const companyName = company.name || company.company_name || 'Unnamed Company';
                    const companyLogo = company.logo_url || company.logo;
                    // Try to get role from various possible locations in the API response
                    const memberRole = company.role 
                      || company.member?.role 
                      || company.company_member?.role
                      || company.membership?.role;
                    
                    return (
                      <TouchableOpacity
                        key={companyId}
                        style={styles.companyCard}
                        onPress={() => {
                          if (companyId && onNavigate) {
                            onNavigate('companyProfile', { companyId });
                          }
                        }}
                      >
                        <View style={styles.companyCardContent}>
                          {companyLogo ? (
                            <Image
                              source={{ uri: companyLogo }}
                              style={styles.companyLogo}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.companyLogoPlaceholder}>
                              <Text style={styles.companyLogoInitials}>
                                {companyName.substring(0, 2).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View style={styles.companyInfo}>
                            <Text style={styles.companyName} numberOfLines={1}>
                              {companyName}
                            </Text>
                            {company.company_type_info?.name && (
                              <Text style={styles.companyType} numberOfLines={1}>
                                {company.company_type_info.name}
                              </Text>
                            )}
                            {memberRole && (
                              <View style={styles.companyRoleBadge}>
                                <Text style={styles.companyRoleText}>
                                  {typeof memberRole === 'string' 
                                    ? memberRole.charAt(0).toUpperCase() + memberRole.slice(1)
                                    : String(memberRole)}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#71717a" />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.actionsContainer}>
            {isCurrentUser ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeProfileButton]}
                onPress={() => {
                  if (isGuest) {
                    setPromptAction('complete your profile');
                    setShowSignUpPrompt(true);
                  } else {
                    onNavigate?.('profileCompletion', userProfile);
                  }
                }}
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
                  onPress={() => {
                    if (isGuest) {
                      setPromptAction('start a chat');
                      setShowSignUpPrompt(true);
                    } else {
                      onStartChat?.(userProfile);
                    }
                  }}
                >
                  <Ionicons name="chatbubble" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, isInTeam ? styles.removeButton : styles.addButton]}
                  onPress={() => {
                    if (isGuest) {
                      setPromptAction('add users to your team');
                      setShowSignUpPrompt(true);
                    } else {
                      onAddToTeam(profile);
                    }
                  }}
                >
                  <Ionicons name={isInTeam ? "remove" : "add"} size={20} color="#fff" />
                  <Text style={styles.secondaryButtonText}>
                    {isInTeam ? "Remove from Team" : "Add to Team"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.assignButton]}
                  onPress={() => {
                    if (isGuest) {
                      setPromptAction('assign users to projects');
                      setShowSignUpPrompt(true);
                    } else {
                      onAssignToProject(profile);
                    }
                  }}
                >
                  <Ionicons name="briefcase" size={20} color="#fff" />
                  <Text style={styles.secondaryButtonText}>Assign to Project</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Media Modal */}
      <Modal
        visible={isMediaModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMediaModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={closeMediaModal}>
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            
            {selectedMedia && (
              <>
                {selectedMedia.kind === 'image' ? (
                  <Image
                    source={{ uri: selectedMedia.url }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Video
                    source={{ uri: selectedMedia.url }}
                    style={styles.modalVideo}
                    shouldPlay={true}
                    isLooping={true}
                    isMuted={false}
                  />
                )}
                
                {selectedMedia.caption && (
                  <View style={styles.modalCaptionContainer}>
                    <Text style={styles.modalCaption}>{selectedMedia.caption}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Sign Up Prompt Modal */}
      <SignUpPromptModal
        visible={showSignUpPrompt}
        onClose={() => setShowSignUpPrompt(false)}
        onSignUp={() => {
          setShowSignUpPrompt(false);
          onNavigate?.('signup', null);
        }}
        onSignIn={() => {
          setShowSignUpPrompt(false);
          onNavigate?.('login', null);
        }}
        action={promptAction}
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
    position: 'relative',
  },
  heroInitials: {
    fontSize: 180,
    fontWeight: '800',
    color: '#9ca3af',
    letterSpacing: 0,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  heroCalendarIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  calendarIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileContainer: {
    padding: 0,
    paddingBottom: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    marginBottom: 2,
  },
  lastSeen: {
    fontSize: 14,
    color: '#71717a',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
  },
  ctaDark: {
    backgroundColor: '#1f2937',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ctaTextLight: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  // Info Card Styles (matching reference design)
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  personalInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoTag: {
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    minWidth: '45%',
  },
  infoTagLabel: {
    fontSize: 12,
    color: '#71717a',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoTagValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '700',
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  infoChip: {
    backgroundColor: '#f4f4f5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipIcon: {
    marginRight: 2,
  },
  infoChipText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
  // Gallery Styles
  galleryContainer: {
    backgroundColor: '#fff',
    marginBottom: 16,
    marginHorizontal: 8,
    borderRadius: 12,
    padding: 16,
    paddingTop: 20,
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  galleryTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 16,
  },
  galleryTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  galleryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f4f4f5',
    gap: 6,
  },
  galleryTabActive: {
    backgroundColor: '#000',
  },
  galleryTabText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  galleryTabTextActive: {
    color: '#fff',
  },
  galleryContent: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  albumCard: {
    width: (Dimensions.get('window').width - 64) / 2,
    height: 200,
    backgroundColor: '#f4f4f5',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'flex-end',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  albumTitleLargeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  albumTitleLarge: {
    fontSize: 64,
    fontWeight: '800',
    color: '#d1d5db',
    opacity: 0.3,
    textAlign: 'center',
  },
  albumInfo: {
    alignItems: 'flex-start',
    width: '100%',
    zIndex: 1,
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'left',
  },
  albumStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  albumStatText: {
    fontSize: 12,
    color: '#000',
    marginRight: 8,
    textAlign: 'left',
  },
  emptyGallery: {
    padding: 40,
    alignItems: 'center',
  },
  emptyGalleryText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  // Contact Section Styles
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  contactInfo: {
    gap: 8,
  },
  contactText: {
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
    marginHorizontal: 8,
    width: 'auto',
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
  // Legacy styles - keeping for backward compatibility
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
    marginHorizontal: 8,
    marginBottom: 16,
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
  // Media sections styles
  mediaContainer: {
    marginBottom: 24,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  imageGridItem: {
    width: (Dimensions.get('window').width - 64 - 16) / 3, // 3 columns with gaps, accounting for gallery padding
    aspectRatio: 1,
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
  },
  imageCaption: {
    fontSize: 10,
    color: '#6b7280',
    padding: 4,
    textAlign: 'center',
  },
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  videoGridItem: {
    width: (Dimensions.get('window').width - 64 - 8) / 2, // 2 columns for videos, accounting for gallery padding
    aspectRatio: 16/9,
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  videoThumbnailContainer: {
    flex: 1,
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCaption: {
    fontSize: 10,
    color: '#6b7280',
    padding: 4,
    textAlign: 'center',
  },
  switchToCompanyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  switchToCompanyText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    height: '80%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalVideo: {
    width: '100%',
    height: '100%',
  },
  modalCaptionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
  },
  modalCaption: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  // Companies section styles
  loadingCompaniesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingCompaniesText: {
    fontSize: 14,
    color: '#71717a',
  },
  companiesList: {
    gap: 12,
    marginTop: 8,
  },
  companyCard: {
    backgroundColor: '#f4f4f5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  companyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  companyLogo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f4f4f5',
  },
  companyLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#e4e4e7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyLogoInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#71717a',
  },
  companyInfo: {
    flex: 1,
    marginLeft: 4,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  companyType: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 4,
  },
  companyRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  companyRoleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
  },
});

export default ProfileDetailPage;
