import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Linking, Modal, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { ProfileDetailPageProps } from '../types';
import { getInitials } from '../data/mockData';
import { useApi } from '../contexts/ApiContext';
import ProfileCompletionBanner from '../components/ProfileCompletionBanner';
import SignUpPromptModal from '../components/SignUpPromptModal';
import CertificationCard from '../components/CertificationCard';
import { UserCertification } from '../types';
import { spacing, semanticSpacing } from '../constants/spacing';
import SkeletonProfilePage from '../components/SkeletonProfilePage';

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
    getUserSocialLinks,
    switchToCompanyProfile,
    switchToUserProfile,
    currentProfileType,
    activeCompany,
    getUserCertifications,
    getBaseUrl,
    getMyOwnerProjects,
    getUserProfilePictures,
    socialLinksRefreshTrigger,
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
  const [certifications, setCertifications] = useState<UserCertification[]>([]);
  const [loadingCertifications, setLoadingCertifications] = useState(false);
  const [socialLinks, setSocialLinks] = useState<any[]>([]);
  const [loadingSocialLinks, setLoadingSocialLinks] = useState(false);
  const [showProjectSelectionModal, setShowProjectSelectionModal] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [currentCoverImageIndex, setCurrentCoverImageIndex] = useState(0);
  const coverImageScrollRef = useRef<ScrollView>(null);
  const [profilePictures, setProfilePictures] = useState<Array<{
    id: string;
    image_url: string;
    is_main: boolean;
    sort_order: number;
  }>>([]);
  const [loadingProfilePictures, setLoadingProfilePictures] = useState(false);
  const debugLog = (...args: any[]) => {
    // Avoid expensive logging in production builds (it can noticeably slow down profile load on devices)
    if (__DEV__) console.log(...args);
  };

  // Load projects for selection - only owner projects (server-side filtered)
  const loadProjects = async (): Promise<any[]> => {
    if (loadingProjects) {
      console.log('⏳ Projects already loading, skipping...');
      return availableProjects;
    }
    
    console.log('🔄 Starting to load owner projects (server-side filtered)...');
    setLoadingProjects(true);
    try {
      // Use server-side filtering - only owner projects
      const ownerProjects = await getMyOwnerProjects({ minimal: true });
      console.log('✅ Owner projects loaded:', ownerProjects?.length || 0);
      
      setAvailableProjects(ownerProjects || []);
      return ownerProjects || [];
    } catch (error) {
      console.error('❌ Failed to load owner projects:', error);
      Alert.alert('Error', 'Failed to load projects. Please try again.');
      return [];
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fetch fresh user data if we have a user ID
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!profile?.id || profile.id === '' || profile.id === 'undefined') {
        debugLog('⚠️ No valid profile ID provided, skipping fetch', profile?.id);
        return;
      }
      
      // Skip fetch if we already have complete profile data
      // Check for both basic profile data and talent-specific data
      const hasBasicData = profile.bio && profile.skills && profile.stats;
      const hasTalentData = profile.category !== 'talent' || (profile.about && profile.about.height_cm);
      
      if (hasBasicData && hasTalentData) {
        debugLog('✅ Profile data already complete, skipping fetch');
        setUserProfile(profile);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        debugLog('👤 Fetching user profile for ID:', profile.id);

        // Check if viewing own profile - only fetch authenticated data for own profile
        const isViewingOwnProfile = isAuthenticated && !isGuest && currentUser && profile.id === currentUser.id;
        const accessToken = isViewingOwnProfile
          ? ((api as any).auth?.authToken || (api as any).auth?.getAuthToken?.())
          : null;

        // Fetch basic user profile (with fallback) + other profile data in parallel where possible
        const userPromise = (async () => {
          try {
            return await api.getUserByIdDirect(profile.id);
          } catch (e) {
            debugLog('⚠️ getUserByIdDirect failed, falling back to getUserById:', (e as any)?.message);
            return await api.getUserById(profile.id);
          }
        })();

        const userDetailsPromise = api.getUserDetails(profile.id).catch((detailsError: any) => {
          // 404 is expected if user details don't exist yet
          if (detailsError?.message?.includes('404') || detailsError?.message?.toLowerCase?.().includes('not found')) {
            debugLog('ℹ️ User details not created yet, continuing without details');
            return null;
          }
          debugLog('⚠️ Error fetching user details:', detailsError?.message);
          return null;
        });

        const talentProfilePromise = (isViewingOwnProfile && accessToken)
          ? fetch(`${getBaseUrl()}/api/talent/profile`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
            })
              .then(async (res) => (res.ok ? res.json() : null))
              .catch((talentError: any) => {
                debugLog('⚠️ Talent profile fetch failed, continuing without details:', talentError?.message);
                return null;
              })
          : Promise.resolve(null);

        const userSkillsPromise = (isViewingOwnProfile)
          ? api.getUserSkills().catch((skillsError: any) => {
              debugLog('ℹ️ User skills not accessible:', skillsError?.message);
              return null;
            })
          : Promise.resolve(null);

        const [userResponse, userDetailsResponse, talentProfileResponse, userSkillsResponse] = await Promise.all([
          userPromise,
          userDetailsPromise,
          talentProfilePromise,
          userSkillsPromise,
        ]);

        const skillsFromApi = (userSkillsResponse as any)?.data || [];
        const normalizedSkillNames = Array.isArray(skillsFromApi)
          ? skillsFromApi.map((skillObj: any) => {
              if (typeof skillObj === 'string') return skillObj;
              return (
                skillObj?.skill_name ||
                skillObj?.name ||
                skillObj?.skills?.name ||
                skillObj?.skills?.skill_name ||
                String(skillObj?.skill_id || skillObj?.id || '')
              );
            })
          : [];

        const response = {
          success: true,
          data: {
            ...(userResponse as any)?.data,
            skills: normalizedSkillNames,
            about: {
              ...(userDetailsResponse as any)?.data,
              ...(talentProfileResponse as any)?.data,
            },
          },
        };
        
        if (response.success && response.data) {
          // Transform the data to match expected format
          const rawSkills = (response.data as any).skills || [];
          
          const transformedSkills = Array.isArray(rawSkills) 
            ? rawSkills.map((skill: any) => {
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
            abilities: (response.data as any).abilities || (response.data as any).user_abilities?.map((ability: any) => ability.ability_name || ability.name || ability) || [],
            // Note: Cover images are now loaded separately via getUserProfilePictures API
          };

          setUserProfile(transformedProfile);
        } else {
          console.error('Failed to fetch user profile:', (response as any).error);
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

  // Load certifications for the user
  useEffect(() => {
    const loadCertifications = async () => {
      // Always prioritize the profile being viewed (profile?.id), not the current user's ID
      // This ensures we fetch certifications for the correct user, not the logged-in user
      const userIdToFetch = profile?.id || userProfile?.id || (isCurrentUser ? currentUser?.id : undefined);
      
      if (userIdToFetch) {
        try {
          setLoadingCertifications(true);
          const certs = await getUserCertifications(userIdToFetch);
          setCertifications(Array.isArray(certs) ? certs : []);
        } catch (err) {
          console.error('Failed to load certifications:', err);
          setCertifications([]);
        } finally {
          setLoadingCertifications(false);
        }
      }
    };
    loadCertifications();
  }, [profile?.id, userProfile?.id, isCurrentUser, currentUser?.id, getUserCertifications]);

  // Load social links from API
  useEffect(() => {
    const loadSocialLinks = async () => {
      // Always prioritize the profile being viewed (profile?.id), not the current user's ID
      // This ensures we fetch social links for the correct user, not the logged-in user
      const userIdToFetch = profile?.id || userProfile?.id || (isCurrentUser ? currentUser?.id : undefined);
      
      // Skip if no user ID available
      if (!userIdToFetch) {
        setSocialLinks(userProfile?.social_links || []);
        return;
      }

      // For guests, try to use data from userProfile if available
      if (isGuest) {
        setSocialLinks(userProfile?.social_links || []);
        return;
      }

      try {
        setLoadingSocialLinks(true);
        // CRITICAL: Log the userId being fetched to debug the issue
        console.log('🔗 [ProfileDetailPage] Fetching social links for userId:', userIdToFetch, {
          profileId: profile?.id,
          userProfileId: userProfile?.id,
          currentUserId: currentUser?.id,
          isCurrentUser,
        });
        
        // Fetch social links for the specific user (current user or other user)
        const response = await getUserSocialLinks(userIdToFetch);
        if (response.success && response.data) {
          const links = Array.isArray(response.data) ? response.data : response.data.data || [];
          console.log('✅ [ProfileDetailPage] Social links loaded:', links.length, 'links for userId:', userIdToFetch);
          setSocialLinks(links);
        } else {
          console.warn('⚠️ [ProfileDetailPage] No social links in response, using fallback');
          // Fallback to userProfile data if available
          setSocialLinks(userProfile?.social_links || []);
        }
      } catch (error) {
        console.error('❌ [ProfileDetailPage] Failed to load social links for userId:', userIdToFetch, error);
        // Fallback to userProfile data if available
        setSocialLinks(userProfile?.social_links || []);
      } finally {
        setLoadingSocialLinks(false);
      }
    };

    loadSocialLinks();
  }, [isCurrentUser, currentUser?.id, getUserSocialLinks, isGuest, profile?.id, userProfile?.id, socialLinksRefreshTrigger]);

  // Load profile pictures from API
  useEffect(() => {
    const loadProfilePictures = async () => {
      const userIdToFetch = profile?.id || userProfile?.id;
      if (!userIdToFetch) return;

      try {
        setLoadingProfilePictures(true);
        const response = await getUserProfilePictures(userIdToFetch);
        if (response.success && response.data) {
          const pictures = Array.isArray(response.data) ? response.data : [];
          // Sort: main first, then by sort_order, then by created_at
          const sortedPictures = pictures.sort((a: any, b: any) => {
            if (a.is_main && !b.is_main) return -1;
            if (!a.is_main && b.is_main) return 1;
            if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          setProfilePictures(sortedPictures);
          console.log('🖼️ Profile pictures loaded:', sortedPictures.length, 'pictures');
        }
      } catch (error) {
        console.error('Failed to load profile pictures:', error);
        // Don't show error to user, just log it
      } finally {
        setLoadingProfilePictures(false);
      }
    };

    loadProfilePictures();
  }, [profile?.id, userProfile?.id, getUserProfilePictures]);

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
    return <SkeletonProfilePage isDark={false} />;
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
        <View style={styles.placeholder} />
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
          {/* Display profile pictures from API */}
          {(() => {
            // Use profile pictures from API if available, otherwise fallback to single imageUrl
            const allCoverImages = profilePictures.length > 0
              ? profilePictures.map((p: any) => p.image_url)
              : (userProfile.imageUrl || userProfile.image_url ? [userProfile.imageUrl || userProfile.image_url] : []);
            
            if (loadingProfilePictures) {
              return (
                <View style={styles.heroLoadingContainer}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              );
            }
            
            if (allCoverImages.length === 0) {
              return (
                <Text style={styles.heroInitials}>{getInitials(userProfile.name)}</Text>
              );
            }
            
            // If only one image, display it directly
            if (allCoverImages.length === 1) {
              return (
                <>
                  <Image 
                    source={{ uri: allCoverImages[0] }} 
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
                  {/* Calendar Icon - Top Right */}
                  <TouchableOpacity style={styles.heroCalendarIcon}>
                    <View style={styles.calendarIconCircle}>
                      <Ionicons name="calendar-outline" size={18} color="#000" />
                    </View>
                  </TouchableOpacity>
                </>
              );
            }
            
            // Multiple cover images - show carousel
            return (
              <>
                <ScrollView
                  ref={coverImageScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={(event) => {
                    const scrollPosition = event.nativeEvent.contentOffset.x;
                    const index = Math.round(scrollPosition / Dimensions.get('window').width);
                    setCurrentCoverImageIndex(index);
                  }}
                  scrollEventThrottle={16}
                  style={styles.heroScrollView}
                >
                  {allCoverImages.map((imageUrl: string, index: number) => (
                    <View key={index} style={styles.heroImageContainer}>
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.heroImage}
                        resizeMode="cover"
                      />
                    </View>
                  ))}
                </ScrollView>
                
                {/* Pagination Indicators */}
                {allCoverImages.length > 1 && (
                  <View style={styles.coverImagePagination}>
                    {allCoverImages.map((_, index: number) => (
                      <View
                        key={index}
                        style={[
                          styles.coverImageDot,
                          index === currentCoverImageIndex && styles.coverImageDotActive,
                        ]}
                      />
                    ))}
                  </View>
                )}
                
                {/* Calendar Icon - Top Right */}
                <TouchableOpacity style={styles.heroCalendarIcon}>
                  <View style={styles.calendarIconCircle}>
                    <Ionicons name="calendar-outline" size={18} color="#000" />
                  </View>
                </TouchableOpacity>
              </>
            );
          })()}
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

          {/* Note: Account switching is now available via the top bar (Instagram-style) */}
          {/* Only show a simple indicator if viewing company profile */}
          {isCurrentUser && !isGuest && currentProfileType === 'company' && activeCompany && (
            <View style={styles.profileTypeIndicator}>
              <Ionicons name="business" size={16} color="#71717a" />
              <Text style={styles.profileTypeText}>
                Viewing as {activeCompany.name}
              </Text>
            </View>
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
              onPress={async () => {
                console.log('🔘 Add to Project button pressed');
                if (isGuest) {
                  setPromptAction('assign users to projects');
                  setShowSignUpPrompt(true);
                } else {
                  console.log('📋 Loading projects and showing modal...');
                  // Show project selection modal first (will show loading state)
                  setShowProjectSelectionModal(true);
                  // Then load projects - state will update automatically
                  await loadProjects();
                  console.log('✅ Projects loaded, state updated');
                }
              }}
            >
              <Text style={styles.ctaText}>Add to Project</Text>
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
            <View style={styles.sectionTitleRow}>
              <Text style={styles.infoSectionTitle}>About</Text>
              {isCurrentUser && (
                <TouchableOpacity
                  style={styles.editSectionButton}
                  onPress={() => {
                    if (isGuest) {
                      setPromptAction('edit your profile');
                      setShowSignUpPrompt(true);
                    } else {
                      onNavigate?.('profileCompletion', { ...userProfile, initialSection: 'basic-info' });
                    }
                  }}
                >
                  <Ionicons name="create-outline" size={16} color="#3b82f6" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.aboutText}>{userProfile.bio || 'No bio available'}</Text>
          </View>

          {/* Personal Information Grid */}
          {userProfile.about && (
            <View style={styles.infoCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.infoSectionTitle}>Personal Information</Text>
                {isCurrentUser && (
                  <TouchableOpacity
                    style={styles.editSectionButton}
                    onPress={() => {
                      if (isGuest) {
                        setPromptAction('edit your profile');
                        setShowSignUpPrompt(true);
                      } else {
                        onNavigate?.('profileCompletion', { ...userProfile, initialSection: 'details-info' });
                      }
                    }}
                  >
                    <Ionicons name="create-outline" size={16} color="#3b82f6" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.personalInfoGrid}>
                {userProfile.about.gender && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Gender</Text>
                    <Text style={styles.infoTagValue}>{userProfile.about.gender}</Text>
                  </View>
                )}
                {userProfile.about.birthday && (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagLabel}>Date of Birth</Text>
                    <Text style={styles.infoTagValue}>
                      {(() => {
                          const dob = new Date(userProfile.about.birthday);
                          return dob.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                        })()}
                    </Text>
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

          {/* Certificates Section */}
          <View style={styles.infoCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="document-text-outline" size={20} color="#000" />
              <Text style={styles.infoSectionTitle}>Certificates</Text>
            </View>
            {loadingCertifications ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3b82f6" />
              </View>
            ) : certifications.length > 0 ? (
              <View style={styles.certificatesGrid}>
                {certifications.slice(0, 3).map((certification, index) => {
                  // Get icon based on index or certification type
                  const icons = ['document-text-outline', 'document-outline', 'checkmark-circle-outline'];
                  const iconName = icons[index % icons.length] as any;
                  
                  // Extract year from issued_at or use a default
                  const year = certification.issued_at 
                    ? new Date(certification.issued_at).getFullYear().toString()
                    : new Date().getFullYear().toString();
                  
                  // Get certification name
                  const certName = certification.certification_template?.name || 'Certification';
                  
                  return (
                    <View key={certification.id} style={styles.certificateCard}>
                      <Ionicons name={iconName} size={24} color="#fff" />
                      <Text style={styles.certificateTitle}>{certName}</Text>
                      <Text style={styles.certificateYear}>{year}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={32} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No certificates yet</Text>
              </View>
            )}
          </View>

          {/* Awards Section */}
          <View style={styles.infoCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="trophy-outline" size={20} color="#000" />
              <Text style={styles.infoSectionTitle}>Awards</Text>
            </View>
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={32} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No awards yet</Text>
            </View>
          </View>

          {/* Gallery/Portfolio Section */}
          {((userProfile.portfolio && userProfile.portfolio.length > 0) || userProfile.category === 'talent') && (
            <View style={styles.infoCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.infoSectionTitle}>Gallery</Text>
                {isCurrentUser && (
                  <TouchableOpacity
                    style={styles.editSectionButton}
                    onPress={() => {
                      if (isGuest) {
                        setPromptAction('edit your profile');
                        setShowSignUpPrompt(true);
                      } else {
                        onNavigate?.('profileCompletion', { ...userProfile, initialSection: 'portfolio' });
                      }
                    }}
                  >
                    <Ionicons name="create-outline" size={16} color="#3b82f6" />
                  </TouchableOpacity>
                )}
              </View>
              
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
          <View style={styles.infoCard}>
            <View style={styles.sectionTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="globe-outline" size={20} color="#000" />
                <Text style={styles.infoSectionTitle}>Social Media</Text>
              </View>
              {isCurrentUser && (
                <TouchableOpacity
                  style={styles.editSectionButton}
                  onPress={() => {
                    if (isGuest) {
                      setPromptAction('add social media links');
                      setShowSignUpPrompt(true);
                    } else {
                      onNavigate?.('profileCompletion', userProfile);
                    }
                  }}
                >
                  <Ionicons name="create-outline" size={16} color="#3b82f6" />
                </TouchableOpacity>
              )}
            </View>
            
            {loadingSocialLinks ? (
              <View style={styles.emptySocialLinksContainer}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.emptySocialLinksText}>Loading social links...</Text>
              </View>
            ) : socialLinks && socialLinks.length > 0 ? (
              <View style={styles.socialMediaTable}>
                {socialLinks.map((link: any, index: number) => {
                  // Map platform to icon and display name
                  const platformMap: { [key: string]: { icon: string; name: string } } = {
                    'facebook': { icon: 'logo-facebook', name: 'Facebook' },
                    'twitter': { icon: 'logo-twitter', name: 'Twitter' },
                    'instagram': { icon: 'logo-instagram', name: 'Instagram' },
                    'linkedin': { icon: 'logo-linkedin', name: 'Linkedin' },
                    'youtube': { icon: 'logo-youtube', name: 'YouTube' },
                    'tiktok': { icon: 'musical-notes', name: 'TikTok' },
                    'website': { icon: 'globe-outline', name: 'Website' },
                    'other': { icon: 'link-outline', name: 'Other' },
                  };
                  
                  const platformInfo = platformMap[link.platform] || platformMap['other'];
                  
                  return (
                    <TouchableOpacity
                      key={link.id || index}
                      style={styles.socialMediaTableRow}
                      onPress={() => {
                        try {
                          Linking.openURL(link.url);
                        } catch (error) {
                          console.error('Failed to open URL:', error);
                        }
                      }}
                    >
                      <View style={styles.socialMediaTableIcon}>
                        <Ionicons name={platformInfo.icon as any} size={16} color="#000" />
                      </View>
                      <Text style={styles.socialMediaTableText} numberOfLines={1}>
                        {platformInfo.name}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptySocialLinksContainer}>
                <Ionicons name="share-social-outline" size={32} color="#9ca3af" />
                <Text style={styles.emptySocialLinksText}>
                  {isCurrentUser 
                    ? 'No social media links added yet. Tap the edit icon to add your profiles.'
                    : 'No social media links available'}
                </Text>
                {isCurrentUser && !isGuest && (
                  <TouchableOpacity
                    style={styles.addSocialLinksButton}
                    onPress={() => onNavigate?.('profileCompletion', userProfile)}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addSocialLinksButtonText}>Add Social Links</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

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
          {(userProfile.email || userProfile.phone || (userProfile as any).agent_phone) && (
            <View style={styles.infoCard}>
              <View style={styles.sectionTitleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="call-outline" size={20} color="#000" />
                  <Text style={styles.infoSectionTitle}>Contact</Text>
                </View>
                {isCurrentUser && (
                  <TouchableOpacity
                    style={styles.editSectionButton}
                    onPress={() => {
                      if (isGuest) {
                        setPromptAction('edit your profile');
                        setShowSignUpPrompt(true);
                      } else {
                        onNavigate?.('profileCompletion', { ...userProfile, initialSection: 'other' });
                      }
                    }}
                  >
                    <Ionicons name="create-outline" size={16} color="#3b82f6" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.contactInfo}>
                {(userProfile as any).agent_phone && (
                  <Text style={styles.contactText}>Agent: {(userProfile as any).agent_phone}</Text>
                )}
                {userProfile.phone && !(userProfile as any).agent_phone && (
                  <Text style={styles.contactText}>Agent: {userProfile.phone}</Text>
                )}
                {userProfile.email && (
                  <Text style={styles.contactText}>Email: {userProfile.email}</Text>
                )}
              </View>
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

      {/* Project Selection Modal */}
      <Modal
        visible={showProjectSelectionModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowProjectSelectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Project</Text>
              <TouchableOpacity onPress={() => setShowProjectSelectionModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            {loadingProjects ? (
              <View style={[styles.modalContent, { alignItems: 'center', justifyContent: 'center', minHeight: 200 }]}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading projects...</Text>
              </View>
            ) : availableProjects.length === 0 ? (
              <View style={[styles.modalContent, { alignItems: 'center', justifyContent: 'center', minHeight: 200 }]}>
                <Ionicons name="folder-outline" size={48} color="#9ca3af" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>No projects available</Text>
                <Text style={styles.emptySubtext}>Create a project first to add users</Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.modalContent}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={true}
              >
                {availableProjects.map((project) => {
                    console.log('📁 Rendering project in modal:', project.title, project.id);
                    return (
                      <TouchableOpacity
                        key={project.id}
                        style={styles.projectItem}
                        onPress={() => {
                          console.log('📁 Project selected:', project);
                          console.log('👤 Selected user:', userProfile);
                          setShowProjectSelectionModal(false);
                          // Navigate to project with user profile data
                          if (onNavigate) {
                            console.log('🚀 Navigating via onNavigate to projectDetail');
                            onNavigate('projectDetail', { 
                              project, 
                              selectedUser: userProfile,
                              addUserToTask: true 
                            });
                          } else {
                            console.log('⚠️ onNavigate not available, using onAssignToProject');
                            onAssignToProject(userProfile);
                          }
                        }}
                      >
                        <View style={styles.projectItemLeft}>
                          <Ionicons name="folder" size={24} color="#3b82f6" />
                          <View style={styles.projectItemInfo}>
                            <Text style={styles.projectItemName}>{project.title || project.name || 'Untitled Project'}</Text>
                            {project.description && (
                              <Text style={styles.projectItemDescription} numberOfLines={1}>
                                {project.description}
                              </Text>
                            )}
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
    padding: semanticSpacing.containerPadding,
    paddingTop: semanticSpacing.containerPaddingLarge,
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
  hero: {
    height: 360,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroLoadingContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroScrollView: {
    width: '100%',
    height: '100%',
  },
  heroImageContainer: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
  heroInitials: {
    fontSize: 180,
    fontWeight: '800',
    color: '#9ca3af',
    letterSpacing: 0,
  },
  heroImage: {
    width: Dimensions.get('window').width,
    height: '100%',
    borderRadius: 0,
  },
  coverImagePagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  coverImageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  coverImageDotActive: {
    width: 24,
    backgroundColor: '#fff',
  },
  heroCalendarIcon: {
    position: 'absolute',
    top: semanticSpacing.containerPaddingLarge,
    right: semanticSpacing.containerPaddingLarge,
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
    paddingBottom: semanticSpacing.containerPaddingLarge,
    backgroundColor: '#fff',
    paddingHorizontal: spacing.sm,
    paddingTop: semanticSpacing.containerPaddingLarge,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    marginBottom: semanticSpacing.containerPaddingLarge,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: semanticSpacing.containerPadding,
    marginBottom: semanticSpacing.containerPaddingLarge,
  },
  ctaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: spacing.sm,
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
    gap: spacing.sm,
  },
  infoTag: {
    backgroundColor: '#f4f4f5',
    borderRadius: spacing.sm,
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    minWidth: '45%',
  },
  infoTagLabel: {
    fontSize: 12,
    color: '#71717a',
    marginBottom: spacing.xs,
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
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  infoChip: {
    backgroundColor: '#f4f4f5',
    borderRadius: semanticSpacing.containerPaddingLarge,
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: semanticSpacing.tightPadding,
    flexDirection: 'row',
    alignItems: 'center',
    gap: semanticSpacing.tightGap,
  },
  chipIcon: {
    marginRight: semanticSpacing.iconPaddingSmall,
  },
  infoChipText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
  // Gallery Styles
  galleryContainer: {
    backgroundColor: '#fff',
    marginBottom: semanticSpacing.containerPaddingLarge,
    marginHorizontal: spacing.sm,
    borderRadius: 12,
    padding: semanticSpacing.containerPaddingLarge,
    borderWidth: 2,
    borderColor: '#d4d4d8',
    width: Dimensions.get('window').width - semanticSpacing.containerPaddingLarge, // Full width minus horizontal margins
  },
  galleryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    marginBottom: semanticSpacing.containerPadding,
  },
  galleryTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: semanticSpacing.containerPaddingLarge,
    alignItems: 'center',
    flexWrap: 'nowrap',
    width: '100%',
  },
  galleryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f4f4f5',
    gap: semanticSpacing.tightGap,
    minWidth: 0,
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
    marginTop: spacing.sm,
    alignItems: 'flex-start',
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: semanticSpacing.containerPadding,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  albumCard: {
    width: (Dimensions.get('window').width - 64) / 2,
    height: 200,
    backgroundColor: '#f4f4f5',
    borderRadius: 12,
    padding: semanticSpacing.containerPaddingLarge,
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
    marginBottom: spacing.sm,
    textAlign: 'left',
  },
  albumStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  albumStatText: {
    fontSize: 12,
    color: '#000',
    marginRight: spacing.sm,
    textAlign: 'left',
  },
  emptyGallery: {
    padding: spacing.xxl,
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
    gap: spacing.sm,
    marginBottom: semanticSpacing.containerPadding,
  },
  contactInfo: {
    gap: spacing.sm,
  },
  contactText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  talentDetailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: semanticSpacing.containerPaddingLarge,
    marginBottom: semanticSpacing.containerPaddingLarge,
    width: '100%',
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  talentDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: semanticSpacing.containerPadding,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: spacing.sm,
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: semanticSpacing.tightGap,
    marginRight: spacing.sm,
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
    marginBottom: spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: semanticSpacing.containerPadding,
    marginBottom: semanticSpacing.containerPaddingLarge,
    marginHorizontal: spacing.sm,
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
    marginTop: spacing.xs,
  },
  // Legacy styles - keeping for backward compatibility
  bioContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: semanticSpacing.containerPaddingLarge,
    marginBottom: semanticSpacing.containerPaddingLarge,
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
    padding: semanticSpacing.containerPaddingLarge,
    marginBottom: semanticSpacing.containerPaddingLarge,
    width: '100%',
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: semanticSpacing.containerPadding,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    backgroundColor: '#f4f4f5',
    borderRadius: semanticSpacing.containerPaddingLarge,
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: semanticSpacing.tightPadding,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  skillText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
  actionsContainer: {
    width: '100%',
    gap: semanticSpacing.containerPadding,
    marginHorizontal: spacing.sm,
    marginBottom: semanticSpacing.containerPaddingLarge,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editSectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
  },
  editSectionButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
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
  emptySocialLinksContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptySocialLinksText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  addSocialLinksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addSocialLinksButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Section Title Row (with icon)
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  // Certificates & Awards Styles
  certificatesGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  certificateCard: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  certificateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  certificateYear: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.8,
  },
  // Social Media Table Styles
  socialMediaTable: {
    marginTop: 8,
    gap: 0,
  },
  socialMediaTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  socialMediaTableIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  socialMediaTableText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  // Legacy Social Media Grid Styles (kept for backward compatibility)
  socialMediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  socialMediaButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  socialMediaButtonEmpty: {
    opacity: 0,
    borderWidth: 0,
  },
  socialMediaButtonText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
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
    width: '100%',
  },
  imageGridItem: {
    width: '31%', // 3 columns with gaps: approximately 31% per item to account for 8px gaps
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
  profileTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  profileTypeText: {
    fontSize: 14,
    color: '#71717a',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  modalContent: {
    padding: 16,
    maxHeight: 400,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  projectItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  projectItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  projectItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  projectItemDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
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
  // Certifications section styles
  certificationsList: {
    gap: 12,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default ProfileDetailPage;
