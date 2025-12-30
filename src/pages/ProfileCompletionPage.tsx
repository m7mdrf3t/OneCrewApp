import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useApi } from '../contexts/ApiContext';
import MediaPickerService, { MediaPickerResult } from '../services/MediaPickerService';
import DatePicker from '../components/DatePicker';
import UploadProgressBar from '../components/UploadProgressBar';
import ImageUploadWithProgress from '../components/ImageUploadWithProgress';

// Helper function to get initials
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Custom Dropdown Component
interface DropdownOption {
  id: string;
  name: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ options, value, onValueChange, placeholder, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonLayout, setButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const buttonRef = useRef<View>(null);

  const selectedOption = options.find(option => option.id === value);

  const handleButtonPress = () => {
    if (disabled) return;
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setButtonLayout({ x, y, width, height });
      setIsOpen(!isOpen);
    });
  };

  return (
    <View style={styles.dropdownContainer}>
      <View ref={buttonRef} collapsable={false}>
        <TouchableOpacity
          style={[styles.dropdownButton, disabled && styles.dropdownButtonDisabled]}
          onPress={handleButtonPress}
        >
          <Text style={[styles.dropdownButtonText, !selectedOption && styles.placeholderText]}>
            {selectedOption ? selectedOption.name : placeholder}
          </Text>
          <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
      
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={[
              styles.dropdownList,
              {
                position: 'absolute',
                top: buttonLayout.y + buttonLayout.height + 4,
                left: buttonLayout.x,
                width: buttonLayout.width,
              }
            ]}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.dropdownItem,
                    value === option.id && styles.dropdownItemSelected
                  ]}
                  onPress={() => {
                    onValueChange(option.id);
                    setIsOpen(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    value === option.id && styles.dropdownItemTextSelected
                  ]}>
                    {option.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// CollapsibleSection Component
interface CollapsibleSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  sectionRef?: React.RefObject<View | null>;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  id,
  title,
  children,
  isExpanded,
  onToggle,
  sectionRef,
}) => {
  return (
    <View ref={sectionRef} style={styles.collapsibleSection}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.collapsibleTitle}>{title}</Text>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#000"
        />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.collapsibleContent}>
          {children}
        </View>
      )}
    </View>
  );
};

interface ProfileFormData {
  bio: string;
  skills: string[];
  portfolio: Array<{
    kind: 'image' | 'video' | 'audio';
    url: string;
    caption?: string;
    sort_order?: number;
  }>;
  socialLinks: Array<{
    id?: string; // Backend ID (for updates/deletes)
    platform: 'instagram' | 'twitter' | 'facebook' | 'linkedin' | 'youtube' | 'tiktok' | 'website' | 'other';
    url: string;
    username?: string;
    is_custom?: boolean;
  }>;
  about: {
    gender: string;
    birthday: string | null;
    nationality: string;
    location: string;
    height: string;
    weight: string;
    skinTone: string;
    hairColor: string;
    eyeColor: string;
    chestCm: string;
    waistCm: string;
    hipsCm: string;
    shoeSizeEu: string;
    reelUrl: string;
    unionMember: boolean;
    dialects: string[];
    willingToTravel: boolean;
  };
  specialty: string;
  imageUrl: string;
}

interface ProfileCompletionPageProps {
  navigation: any;
  user: any;
  onProfileUpdated?: (updatedProfile: any) => void;
  visible?: boolean;
  onClose?: () => void;
  initialSection?: 'basic-info' | 'details-info' | 'portfolio' | 'social-media' | 'other';
}

const ProfileCompletionPage: React.FC<ProfileCompletionPageProps> = ({
  navigation,
  user: userProp,
  onProfileUpdated,
  visible = true,
  onClose,
  initialSection,
}) => {
  // Get route params if available (when used as a screen)
  const route = useRoute();
  const navigationHook = useNavigation(); // Use hook as fallback
  const routeParams = (route.params as any) || {};
  
  // Use navigation prop if provided, otherwise use hook
  const nav = navigation || navigationHook;
  
  const { api, updateProfile, isLoading, getSkinTones, getHairColors, getSkills, getAbilities, getLanguages, getRoles, uploadFile, getAccessToken, getBaseUrl, getUserSocialLinks, addSocialLink, updateSocialLink, deleteSocialLink, getUserProfilePictures, uploadProfilePicture, setMainProfilePicture, deleteProfilePicture, getUserPortfolio, user: currentUser, isAuthenticated, isGuest } = useApi();
  
  // Merge user from multiple sources: currentUser (most up-to-date) > route params > prop
  // This ensures we always have the latest user data
  const user = currentUser || routeParams.user || userProp;
  
  // Check if user is a talent - only show talent-specific fields if category is 'talent'
  const isTalent = user?.category === 'talent' || user?.category === 'Talent';
  const mediaPicker = MediaPickerService.getInstance();
  
  const [formData, setFormData] = useState<ProfileFormData>({
    bio: '',
    skills: [],
    portfolio: [],
    socialLinks: [],
    about: {
      gender: '',
      birthday: null,
      nationality: '',
      location: '',
      height: '',
      weight: '',
      skinTone: '',
      hairColor: '',
      eyeColor: '',
      chestCm: '',
      waistCm: '',
      hipsCm: '',
      shoeSizeEu: '',
      reelUrl: '',
      unionMember: false,
      dialects: [],
      willingToTravel: false,
    },
    specialty: '',
    imageUrl: '',
  });
  
  // Profile pictures state (using proper API structure)
  const [profilePictures, setProfilePictures] = useState<Array<{
    id: string;
    image_url: string;
    is_main: boolean;
    sort_order: number;
  }>>([]);
  const [loadingProfilePictures, setLoadingProfilePictures] = useState(false);
  
  const [currentSkill, setCurrentSkill] = useState('');
  const [currentDialect, setCurrentDialect] = useState('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Roles autocomplete state
  const [availableRoles, setAvailableRoles] = useState<Array<{ id: string; name: string; category?: string }>>([]);
  const [filteredRoles, setFilteredRoles] = useState<Array<{ id: string; name: string; category?: string }>>([]);
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [specialtyInputLayout, setSpecialtyInputLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const specialtyInputRef = useRef<View>(null);
  
  // Social media links state - new card-based approach
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [platformInputs, setPlatformInputs] = useState<{ [key: string]: string }>({});
  const [platformLoading, setPlatformLoading] = useState<{ [key: string]: boolean }>({});
  
  // Portfolio state
  const [portfolioType, setPortfolioType] = useState<'image' | 'video' | 'audio'>('image');
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);
  
  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState<{
    visible: boolean;
    progress?: number;
    label: string;
  }>({
    visible: false,
    progress: undefined,
    label: 'Uploading...',
  });
  
  // Track which image is being uploaded
  const [uploadingImage, setUploadingImage] = useState<{
    type: 'profile' | 'cover' | 'portfolio' | null;
    progress?: number;
  }>({
    type: null,
    progress: undefined,
  });
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionRefs = {
    'basic-info': useRef<View>(null),
    'details-info': useRef<View>(null),
    'portfolio': useRef<View>(null),
    'social-media': useRef<View>(null),
    'other': useRef<View>(null),
  };
  
  // Reference data state
  const [skinTones, setSkinTones] = useState<Array<{id: string, name: string}>>([]);
  const [hairColors, setHairColors] = useState<Array<{id: string, name: string}>>([]);
  const [availableSkills, setAvailableSkills] = useState<Array<{id: string, name: string}>>([]);
  const [abilities, setAbilities] = useState<Array<{id: string, name: string}>>([]);
  const [languages, setLanguages] = useState<Array<{id: string, name: string}>>([]);
  const [loadingReferences, setLoadingReferences] = useState(false);

  // Refs to track API-loaded state (fixes stale closure and race conditions)
  const apiLoadedStateRef = useRef<{
    portfolio: boolean;
    socialLinks: boolean;
    profilePictures: boolean;
  }>({
    portfolio: false,
    socialLinks: false,
    profilePictures: false,
  });

  // Constants for magic numbers
  const FILE_SIZE_LIMITS = {
    IMAGE_MB: 20,
    VIDEO_MB: 100,
    AUDIO_MB: 50,
    PROFILE_IMAGE_MB: 10,
  } as const;

  const VIDEO_DURATION_LIMIT_SECONDS = 300; // 5 minutes
  const IMAGE_DIMENSIONS = {
    PROFILE_MAX: 1024,
    PORTFOLIO_MAX: 1920,
    COVER_MAX: 1920,
    COVER_HEIGHT: 1080,
  } as const;

  // Load social links from API
  useEffect(() => {
    const loadSocialLinks = async () => {
      if (!user?.id || isGuest || !isAuthenticated) return;
      try {
        const response = await getUserSocialLinks();
        if (response.success && response.data) {
          const links = Array.isArray(response.data) ? response.data : response.data.data || [];
          // Map backend UserSocialLink to form format
          const mappedLinks = links.map((link: any) => ({
            id: link.id,
            platform: link.platform,
            url: link.url,
            username: undefined, // Backend doesn't store username separately
            is_custom: link.is_custom || false,
          }));
          setFormData(prev => ({
            ...prev,
            socialLinks: mappedLinks,
          }));
          // Mark as API-loaded
          apiLoadedStateRef.current.socialLinks = true;
        }
      } catch (error) {
        console.error('Failed to load social links:', error);
        // Don't throw - just log, user can still add links
      }
    };

    // Load social links when component mounts or when visible (for modal) or when user changes
    // Note: visible can be undefined when used as navigation screen, so check for user?.id instead
    if (user?.id && (visible !== false)) {
      loadSocialLinks();
    }
  }, [visible, user?.id, isGuest, isAuthenticated]);

  // Load portfolio items from API
  useEffect(() => {
    const loadPortfolio = async () => {
      if (!user?.id || isGuest || !isAuthenticated) return;
      try {
        const response = await getUserPortfolio();
        
        if (response.success && response.data) {
          // Handle both array and paginated response formats
          const portfolioItems = Array.isArray(response.data) 
            ? response.data 
            : (response.data.data || response.data.items || []);
          
          // Map backend portfolio items to form format
          const mappedPortfolio = portfolioItems.map((item: any) => ({
            kind: item.kind || 'image',
            url: item.url,
            caption: item.caption || '',
            sort_order: item.sort_order || 0,
            id: item.id, // Store backend ID for updates/deletes
          }));
          
          // Sort portfolio items by sort_order
          const sortedPortfolio = mappedPortfolio.sort((a: { sort_order?: number }, b: { sort_order?: number }) => (a.sort_order || 0) - (b.sort_order || 0));
          
          setFormData(prev => ({
            ...prev,
            portfolio: sortedPortfolio,
          }));
          
          // Mark as API-loaded
          apiLoadedStateRef.current.portfolio = true;
          
          // Auto-expand portfolio section if items are loaded
          if (sortedPortfolio.length > 0) {
            setExpandedSections(prev => new Set(prev).add('portfolio'));
          }
        }
      } catch (error) {
        console.error('❌ [ProfileCompletionPage] Failed to load portfolio:', error);
        // Don't throw - just log, user can still add portfolio items
      }
    };

    // Load portfolio when component mounts or when visible (for modal) or when user changes
    // Note: visible can be undefined when used as navigation screen, so check for user?.id instead
    if (user?.id && (visible !== false)) {
      loadPortfolio();
    }
  }, [visible, user?.id, isGuest, isAuthenticated]);

  // Helper function to refresh profile pictures (with cache busting)
  const refreshProfilePictures = async (userIdToFetch?: string) => {
    const userId = userIdToFetch || currentUser?.id || user?.id;
    if (!userId || isGuest || !isAuthenticated) return;
    
    try {
      // Wait a bit to ensure cache is cleared
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const response = await getUserProfilePictures(userId);
      if (response.success && response.data) {
        const pictures = Array.isArray(response.data) ? response.data : [];
        setProfilePictures(pictures);
        
        // Set main image URL from the main picture
        const mainPicture = pictures.find((p: any) => p.is_main);
        if (mainPicture) {
          setFormData(prev => ({
            ...prev,
            imageUrl: mainPicture.image_url,
          }));
        } else {
          // If no main picture, clear imageUrl
          setFormData(prev => ({
            ...prev,
            imageUrl: '',
          }));
        }
        return pictures;
      }
    } catch (error) {
      console.error('Failed to refresh profile pictures:', error);
      throw error;
    }
  };

  // Load profile pictures from API
  useEffect(() => {
    const loadProfilePictures = async () => {
      const userIdToFetch = currentUser?.id || user?.id;
      if (!userIdToFetch || isGuest || !isAuthenticated) return;
      
      try {
        setLoadingProfilePictures(true);
        await refreshProfilePictures(userIdToFetch);
        // Mark as API-loaded
        apiLoadedStateRef.current.profilePictures = true;
      } catch (error) {
        console.error('Failed to load profile pictures:', error);
        // Don't throw - just log, user can still add pictures
      } finally {
        setLoadingProfilePictures(false);
      }
    };

    // Load profile pictures when component mounts or when visible (for modal) or when user changes
    // Note: visible can be undefined when used as a navigation screen, so check for user?.id instead
    if ((currentUser?.id || user?.id) && (visible !== false)) {
      loadProfilePictures();
    }
  }, [visible, currentUser?.id, user?.id, isGuest, isAuthenticated]);

  // Track last user data hash to detect updates
  const lastUserDataHashRef = useRef<string>('');
  const lastVisibleRef = useRef<boolean>(false);
  
  // State to store fetched user details and talent profile
  const [fetchedUserDetails, setFetchedUserDetails] = useState<any>(null);
  const [fetchedTalentProfile, setFetchedTalentProfile] = useState<any>(null);
  const [loadingUserData, setLoadingUserData] = useState(false);
  
  // Reset fetched data when modal closes
  useEffect(() => {
    if (!visible) {
      setFetchedUserDetails(null);
      setFetchedTalentProfile(null);
    }
  }, [visible]);
  
  // Fetch user details and talent profile when modal opens
  useEffect(() => {
    const fetchUserData = async () => {
      const userToUse = currentUser || routeParams.user || userProp;
      if (!userToUse?.id || !visible || isGuest || !isAuthenticated) {
        return;
      }
      
      // Only fetch if modal just became visible (and we don't already have data)
      if (visible && !lastVisibleRef.current && !fetchedUserDetails && !fetchedTalentProfile) {
        setLoadingUserData(true);
        try {
          const accessToken = getAccessToken();
          const baseUrl = getBaseUrl();
          
          // Fetch user details
          try {
            const userDetailsResponse = await fetch(`${baseUrl}/api/user-details`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
            });
            
            if (userDetailsResponse.ok) {
              const detailsData = await userDetailsResponse.json();
              setFetchedUserDetails(detailsData.data || detailsData);
            }
          } catch (error) {
            console.error('Failed to fetch user details:', error);
          }
          
          // Fetch talent profile if user is talent
          if (userToUse.category === 'talent' || userToUse.category === 'Talent') {
            try {
              const talentResponse = await fetch(`${baseUrl}/api/talent/profile`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
              });
              
              if (talentResponse.ok) {
                const talentData = await talentResponse.json();
                setFetchedTalentProfile(talentData.data || talentData);
              }
            } catch (error) {
              console.error('Failed to fetch talent profile:', error);
            }
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
        } finally {
          setLoadingUserData(false);
        }
      }
    };
    
    fetchUserData();
  }, [visible, currentUser?.id, routeParams.user?.id, userProp?.id, isGuest, isAuthenticated, getAccessToken, getBaseUrl, fetchedUserDetails, fetchedTalentProfile]);
  
  // Initialize form data when user changes or when fetched data is available
  useEffect(() => {
    const userToUse = currentUser || routeParams.user || userProp;
    if (userToUse) {
      // Create a hash of key user fields to detect changes
      const userDataHash = JSON.stringify({
        id: userToUse.id,
        bio: userToUse.bio,
        specialty: userToUse.specialty,
        skills: userToUse.skills || userToUse.user_skills,
        imageUrl: userToUse.imageUrl || userToUse.image_url,
        fetchedUserDetails: fetchedUserDetails,
        fetchedTalentProfile: fetchedTalentProfile,
      });
      
      // Force update when modal becomes visible (to catch any data updates)
      const justBecameVisible = visible && !lastVisibleRef.current;
      lastVisibleRef.current = visible;
      
      // Update if user data has changed OR if modal just became visible OR if fetched data is available
      if (lastUserDataHashRef.current !== userDataHash || justBecameVisible || fetchedUserDetails || fetchedTalentProfile) {
        lastUserDataHashRef.current = userDataHash;
        
        // Merge user data with fetched details and talent profile
        // Priority: fetched data > user.about > user.userDetails
        const aboutData = fetchedTalentProfile || userToUse.about || {};
        const userDetails = fetchedUserDetails || userToUse.userDetails || {};
        
        // Handle skills - they might be stored as IDs or names
        let userSkills = userToUse.skills || userToUse.user_skills || [];
        
        // If skills are stored as objects with skill_name, extract the names
        // Otherwise, use them as-is (could be names or IDs)
        const normalizedSkills = userSkills.map((skill: any) => {
          if (typeof skill === 'string') {
            return skill; // Already a string (name or ID)
          } else if (skill?.skill_name) {
            return skill.skill_name; // Extract name from object
          } else if (skill?.name) {
            return skill.name; // Extract name from object
          }
          return String(skill); // Fallback to string conversion
        });
        
        // Use refs to check if API has loaded data (fixes stale closure issue)
        // Preserve portfolio if it has been loaded from API, otherwise use user data
        setFormData(prev => {
          const portfolioToUse = apiLoadedStateRef.current.portfolio 
            ? prev.portfolio 
            : (userToUse.portfolio || userToUse.user_portfolios || []);
          
          // Preserve social links if already loaded from API
          const socialLinksToUse = apiLoadedStateRef.current.socialLinks 
            ? prev.socialLinks 
            : [];
          
          return {
            bio: userToUse.bio || '',
            skills: normalizedSkills,
            portfolio: portfolioToUse,
            socialLinks: socialLinksToUse,
            about: {
              gender: userDetails.gender || aboutData.gender || '',
              birthday: userDetails.birthday || aboutData.birthday || null,
              nationality: userDetails.nationality || aboutData.nationality || '',
              location: userToUse.location_text || userDetails.location || userDetails.location_text || aboutData.location || aboutData.location_text || '',
              height: aboutData.height_cm?.toString() || userDetails.height_cm?.toString() || '',
              weight: aboutData.weight_kg?.toString() || userDetails.weight_kg?.toString() || '',
              skinTone: aboutData.skin_tone_id || aboutData.skin_tone || userDetails.skin_tone_id || userDetails.skin_tone || '',
              hairColor: aboutData.hair_color_id || aboutData.hair_color || userDetails.hair_color_id || userDetails.hair_color || '',
              eyeColor: aboutData.eye_color || userDetails.eye_color || '',
              chestCm: aboutData.chest_cm?.toString() || '',
              waistCm: aboutData.waist_cm?.toString() || '',
              hipsCm: aboutData.hips_cm?.toString() || '',
              shoeSizeEu: aboutData.shoe_size_eu?.toString() || '',
              reelUrl: aboutData.reel_url || '',
              unionMember: aboutData.union_member || false,
              dialects: aboutData.dialects || [],
              willingToTravel: aboutData.travel_ready || aboutData.willing_to_travel || userDetails.willing_to_travel || false,
            },
            specialty: userToUse.specialty || '',
            imageUrl: userToUse.imageUrl || userToUse.image_url || '',
          };
        });
      }
    }
  }, [currentUser, routeParams.user, userProp, visible, fetchedUserDetails, fetchedTalentProfile]);

  // Auto-expand section when initialSection is provided
  useEffect(() => {
    if (initialSection && visible) {
      setExpandedSections(prev => new Set(prev).add(initialSection));
      
      // Scroll to section after a brief delay to ensure it's rendered
      const timeoutId = setTimeout(() => {
        const sectionRef = sectionRefs[initialSection];
        if (sectionRef?.current && scrollViewRef.current) {
          sectionRef.current.measureLayout(
            scrollViewRef.current as any,
            (x, y) => {
              scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
            },
            () => {
              // Fallback: try to scroll after a longer delay
              const fallbackTimeoutId = setTimeout(() => {
                if (sectionRef?.current) {
                  sectionRef.current.measureLayout(
                    scrollViewRef.current as any,
                    (x, y) => {
                      scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
                    },
                    () => {
                      console.warn('Could not measure section layout');
                    }
                  );
                }
              }, 200);
              
              // Cleanup fallback timeout
              return () => clearTimeout(fallbackTimeoutId);
            }
          );
        }
      }, 300);
      
      // Cleanup timeout on unmount
      return () => clearTimeout(timeoutId);
    }
  }, [initialSection, visible]);

  // Load reference data when component mounts
  useEffect(() => {
    const loadReferenceData = async () => {
      setLoadingReferences(true);
      try {
        
        const [skinTonesRes, hairColorsRes, skillsRes, abilitiesRes, languagesRes, rolesRes] = await Promise.all([
          getSkinTones(),
          getHairColors(),
          getSkills(),
          getAbilities(),
          getLanguages(),
          getRoles(),
        ]);

        setSkinTones(skinTonesRes.data || []);
        setHairColors(hairColorsRes.data || []);
        setAvailableSkills(skillsRes.data || []);
        setAbilities(abilitiesRes.data || []);
        setLanguages(languagesRes.data || []);
        
        // Load roles for autocomplete
        if (rolesRes.success && rolesRes.data) {
          const rolesData = Array.isArray(rolesRes.data) ? rolesRes.data : [];
          setAvailableRoles(rolesData);
        }
        
      } catch (error) {
        console.error('Error loading reference data:', error);
      } finally {
        setLoadingReferences(false);
      }
    };

    loadReferenceData();
  }, []);

  // Filter roles based on specialty input
  useEffect(() => {
    if (formData.specialty.trim().length > 0) {
      const query = formData.specialty.toLowerCase().trim();
      const filtered = availableRoles.filter(role => 
        role.name.toLowerCase().includes(query)
      );
      setFilteredRoles(filtered);
      setShowRoleSuggestions(filtered.length > 0 && formData.specialty.trim().length > 0);
    } else {
      setFilteredRoles([]);
      setShowRoleSuggestions(false);
    }
  }, [formData.specialty, availableRoles]);

  // Handle specialty input change
  const handleSpecialtyChange = (text: string) => {
    handleInputChange('specialty', text);
    // Measure input position for suggestions positioning
    specialtyInputRef.current?.measureInWindow((x, y, width, height) => {
      setSpecialtyInputLayout({ x, y, width, height });
    });
  };

  // Handle role selection from suggestions
  const handleRoleSelect = (roleName: string) => {
    handleInputChange('specialty', roleName);
    setShowRoleSuggestions(false);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.bio.trim()) {
      errors.bio = 'Bio is required';
    }

    // Note: specialty, gender, birthday, nationality, and location are now optional

    // Validate image URL if provided (but don't require it - user can upload via picker)
    // Only validate format if a URL is manually entered
    if (formData.imageUrl && formData.imageUrl.trim()) {
      const urlPattern = /^https?:\/\/.+\..+/;
      if (!urlPattern.test(formData.imageUrl.trim())) {
        errors.imageUrl = 'Please enter a valid URL (must start with http:// or https://)';
      }
    }
    // Note: imageUrl is optional - user can upload via image picker instead

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('about.')) {
      const aboutField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        about: {
          ...prev.about,
          [aboutField]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    // Clear error when user starts typing/selecting
    const errorField = field.includes('.') ? field.split('.').pop() : field;
    if (formErrors[errorField || field]) {
      setFormErrors(prev => ({ ...prev, [errorField || field]: '' }));
    }
  };

  const addSkill = () => {
    if (currentSkill.trim() && !formData.skills.includes(currentSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, currentSkill.trim()],
      }));
      setCurrentSkill('');
    }
  };

  const addSkillFromDropdown = (skillId: string) => {
    if (skillId && !formData.skills.includes(skillId)) {
      // Find the skill name for display
      const skill = availableSkills.find(s => s.id === skillId);
      const skillName = skill?.name || skillId;
      
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillName], // Store name for API matching
      }));
      setCurrentSkill(''); // Reset dropdown selection
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove),
    }));
  };

  const addDialect = () => {
    if (currentDialect.trim() && !formData.about.dialects.includes(currentDialect.trim())) {
      setFormData(prev => ({
        ...prev,
        about: {
          ...prev.about,
          dialects: [...prev.about.dialects, currentDialect.trim()],
        },
      }));
      setCurrentDialect('');
    }
  };

  const removeDialect = (dialectToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      about: {
        ...prev.about,
        dialects: prev.about.dialects.filter(dialect => dialect !== dialectToRemove),
      },
    }));
  };

  // Helper function to normalize URL (add https:// if missing)
  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    
    // If it already starts with http:// or https://, return as is
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    
    // Otherwise, add https://
    return `https://${trimmed}`;
  };

  // Platform configuration
  const platformConfig = {
    instagram: { 
      icon: 'logo-instagram', 
      name: 'Instagram', 
      color: '#E4405F',
      placeholder: 'Enter username (e.g., username or @username)',
      formatUrl: (input: string) => {
        const cleaned = input.replace(/^@/, '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/^instagram\.com\//i, '').replace(/\/.*$/, '').trim();
        return cleaned ? `https://instagram.com/${cleaned}` : '';
      }
    },
    twitter: { 
      icon: 'logo-twitter', 
      name: 'Twitter', 
      color: '#1DA1F2',
      placeholder: 'Enter username (e.g., username or @username)',
      formatUrl: (input: string) => {
        const cleaned = input.replace(/^@/, '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/^(twitter\.com|x\.com)\//i, '').replace(/\/.*$/, '').trim();
        return cleaned ? `https://twitter.com/${cleaned}` : '';
      }
    },
    facebook: { 
      icon: 'logo-facebook', 
      name: 'Facebook', 
      color: '#1877F2',
      placeholder: 'Enter username or page name',
      formatUrl: (input: string) => {
        const cleaned = input.replace(/^@/, '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/^facebook\.com\//i, '').replace(/\/.*$/, '').trim();
        return cleaned ? `https://facebook.com/${cleaned}` : '';
      }
    },
    linkedin: { 
      icon: 'logo-linkedin', 
      name: 'LinkedIn', 
      color: '#0077B5',
      placeholder: 'Enter profile URL or username',
      formatUrl: (input: string) => {
        const cleaned = input.replace(/^https?:\/\//i, '').replace(/^www\./i, '').trim();
        if (cleaned.includes('linkedin.com')) {
          return `https://${cleaned}`;
        } else if (cleaned.match(/^[a-zA-Z0-9-]+$/)) {
          return `https://linkedin.com/in/${cleaned}`;
        }
        return cleaned ? `https://${cleaned}` : '';
      }
    },
    youtube: { 
      icon: 'logo-youtube', 
      name: 'YouTube', 
      color: '#FF0000',
      placeholder: 'Enter channel URL or channel ID',
      formatUrl: (input: string) => {
        const cleaned = input.replace(/^https?:\/\//i, '').replace(/^www\./i, '').trim();
        if (cleaned.includes('youtube.com') || cleaned.includes('youtu.be')) {
          return `https://${cleaned}`;
        }
        return cleaned ? `https://youtube.com/${cleaned}` : '';
      }
    },
    tiktok: { 
      icon: 'musical-notes', 
      name: 'TikTok', 
      color: '#000000',
      placeholder: 'Enter username (e.g., username or @username)',
      formatUrl: (input: string) => {
        const cleaned = input.replace(/^@/, '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/^tiktok\.com\//i, '').replace(/\/.*$/, '').trim();
        return cleaned ? `https://tiktok.com/@${cleaned}` : '';
      }
    },
    website: { 
      icon: 'globe-outline', 
      name: 'Website', 
      color: '#6366f1',
      placeholder: 'Enter full website URL',
      formatUrl: (input: string) => {
        return normalizeUrl(input);
      }
    },
    other: { 
      icon: 'link-outline', 
      name: 'Other', 
      color: '#6b7280',
      placeholder: 'Enter full URL',
      formatUrl: (input: string) => {
        return normalizeUrl(input);
      }
    },
  };

  // Detect platform from URL and extract username
  const detectPlatformFromUrl = (url: string): { platform: string; username: string } | null => {
    if (!url || !url.trim()) return null;
    
    const normalized = normalizeUrl(url);
    const lowerUrl = normalized.toLowerCase();
    
    // Instagram
    if (lowerUrl.includes('instagram.com')) {
      const match = normalized.match(/instagram\.com\/([^\/\?]+)/i);
      return match ? { platform: 'instagram', username: match[1] } : null;
    }
    
    // Twitter/X
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
      const match = normalized.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/i);
      return match ? { platform: 'twitter', username: match[1] } : null;
    }
    
    // Facebook
    if (lowerUrl.includes('facebook.com')) {
      const match = normalized.match(/facebook\.com\/([^\/\?]+)/i);
      return match ? { platform: 'facebook', username: match[1] } : null;
    }
    
    // LinkedIn
    if (lowerUrl.includes('linkedin.com')) {
      const match = normalized.match(/linkedin\.com\/in\/([^\/\?]+)/i);
      return match ? { platform: 'linkedin', username: match[1] } : null;
    }
    
    // YouTube
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      return { platform: 'youtube', username: normalized };
    }
    
    // TikTok
    if (lowerUrl.includes('tiktok.com')) {
      const match = normalized.match(/tiktok\.com\/@([^\/\?]+)/i);
      return match ? { platform: 'tiktok', username: match[1] } : null;
    }
    
    return null;
  };

  // Format social URL based on platform
  const formatSocialUrl = (platform: string, input: string): string => {
    if (!input || !input.trim()) return '';
    
    const config = platformConfig[platform as keyof typeof platformConfig];
    if (!config) return normalizeUrl(input);
    
    return config.formatUrl(input);
  };

  // Get existing link for a platform
  const getLinkForPlatform = (platform: string) => {
    return formData.socialLinks.find(link => link.platform === platform);
  };

  // Handle platform card tap - open input for that platform
  const handlePlatformCardTap = (platform: string) => {
    const existingLink = getLinkForPlatform(platform);
    if (existingLink) {
      // Extract username from URL for display
      const detected = detectPlatformFromUrl(existingLink.url);
      setPlatformInputs(prev => ({
        ...prev,
        [platform]: detected?.username || existingLink.url,
      }));
    } else {
      setPlatformInputs(prev => ({
        ...prev,
        [platform]: '',
      }));
    }
    setEditingPlatform(platform);
  };

  // Handle input change for platform
  const handlePlatformInputChange = (platform: string, value: string) => {
    setPlatformInputs(prev => ({
      ...prev,
      [platform]: value,
    }));
  };

  // Handle save for platform
  const handleSavePlatformLink = async (platform: string) => {
    const input = platformInputs[platform]?.trim() || '';
    if (!input) {
      Alert.alert('Error', 'Please enter a value for this platform');
      return;
    }

    // Check if URL was pasted - detect platform
    const detected = detectPlatformFromUrl(input);
    const finalPlatform = (detected?.platform || platform) as ProfileFormData['socialLinks'][number]['platform'];
    const finalInput = detected?.username || input;

    // Format URL
    const formattedUrl = formatSocialUrl(finalPlatform, finalInput);
    
    if (!formattedUrl) {
      Alert.alert('Error', 'Please enter a valid URL or username');
      return;
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/.+\..+/;
    if (!urlPattern.test(formattedUrl)) {
      Alert.alert('Error', 'Please enter a valid URL or username');
      return;
    }

    setPlatformLoading(prev => ({ ...prev, [platform]: true }));

    try {
      const existingLink = getLinkForPlatform(finalPlatform);
      
      if (existingLink && existingLink.id) {
        // Update existing link
        await updateSocialLink(existingLink.id, {
          platform: finalPlatform,
          url: formattedUrl,
          is_custom: finalPlatform === 'other',
        });
        
        // Update local state
        setFormData(prev => ({
          ...prev,
          socialLinks: prev.socialLinks.map(link =>
            link.platform === finalPlatform
              ? { ...link, platform: finalPlatform, url: formattedUrl }
              : link
          ),
        }));
      } else {
        // Add new link
        const response = await addSocialLink({
          platform: finalPlatform,
          url: formattedUrl,
          is_custom: finalPlatform === 'other',
        });
        
        if (response.data) {
          setFormData(prev => ({
            ...prev,
            socialLinks: [...prev.socialLinks.filter(link => link.platform !== finalPlatform), {
              id: response.data.id,
              platform: finalPlatform,
              url: formattedUrl,
              is_custom: finalPlatform === 'other',
            }],
          }));
        }
      }

      // Close input
      setEditingPlatform(null);
      setPlatformInputs(prev => {
        const updated = { ...prev };
        delete updated[platform];
        return updated;
      });
    } catch (error: any) {
      console.error('Failed to save social link:', error);
      Alert.alert('Error', error.message || 'Failed to save social link. Please try again.');
    } finally {
      setPlatformLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

  // Handle delete for platform
  const handleDeletePlatformLink = async (platform: string) => {
    const link = getLinkForPlatform(platform);
    if (!link || !link.id) return;

    Alert.alert(
      'Delete Link',
      `Are you sure you want to remove your ${platformConfig[platform as keyof typeof platformConfig]?.name || platform} link?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSocialLink(link.id!);
              setFormData(prev => ({
                ...prev,
                socialLinks: prev.socialLinks.filter(l => l.platform !== platform),
              }));
              setEditingPlatform(null);
              setPlatformInputs(prev => {
                const updated = { ...prev };
                delete updated[platform];
                return updated;
              });
            } catch (error: any) {
              console.error('Failed to delete social link:', error);
              Alert.alert('Error', error.message || 'Failed to delete social link. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Handle cancel edit
  const handleCancelPlatformEdit = (platform: string) => {
    setEditingPlatform(null);
    setPlatformInputs(prev => {
      const updated = { ...prev };
      delete updated[platform];
      return updated;
    });
  };

  // Portfolio management functions
  const addPortfolioItem = async (url: string, kind: 'image' | 'video' | 'audio', caption?: string) => {
    if (!url || !url.trim()) {
      Alert.alert('Error', 'Invalid URL for the portfolio item');
      return;
    }

    const newItem: {
      kind: 'image' | 'video';
      url: string;
      caption?: string;
      sort_order: number;
      id?: string;
    } = {
      kind: kind === 'audio' ? 'image' : kind, // Convert audio to image for API compatibility
      url: url.trim(),
      caption: caption?.trim() || undefined,
      sort_order: formData.portfolio.length,
    };

    // Only try to save to API if it's a proper URL (not a local file path)
    const isLocalFile = url.startsWith('file://') || url.startsWith('/');
    
    if (!isLocalFile) {
      try {
        // Try to save to API first
        const response = await api.addPortfolioItem(newItem);
        
        // If API returns an ID, use it
        if (response?.data?.id) {
          newItem.id = response.data.id;
        }
        
        // Add to local state only after API success
        setFormData(prev => ({
          ...prev,
          portfolio: [...prev.portfolio, newItem],
        }));
      } catch (apiError: any) {
        console.error('API error adding portfolio item:', apiError);
        Alert.alert(
          'Upload Failed',
          apiError.message || 'Failed to save portfolio item to server. Please try again.'
        );
        throw apiError; // Re-throw to prevent adding to UI
      }
    } else {
      // For local files, add to state immediately (will be uploaded later)
      setFormData(prev => ({
        ...prev,
        portfolio: [...prev.portfolio, newItem],
      }));
    }
  };

  const removePortfolioItem = async (index: number) => {
    const item = formData.portfolio[index];
    if (!item) return;

    const itemId = (item as any).id;
    const previousPortfolio = [...formData.portfolio];

    try {
      // Optimistically remove from local state
      setFormData(prev => ({
        ...prev,
        portfolio: prev.portfolio.filter((_, i) => i !== index),
      }));

      // Try to remove from API if item has an ID
      if (itemId) {
        try {
          await api.removePortfolioItem(itemId);
        } catch (apiError: any) {
          // Revert optimistic update on error
          setFormData(prev => ({
            ...prev,
            portfolio: previousPortfolio,
          }));
          console.error('API error removing portfolio item:', apiError);
          Alert.alert(
            'Error',
            apiError.message || 'Failed to remove portfolio item from server. Please try again.'
          );
          return;
        }
      }
      // Success - no alert needed for better UX
    } catch (error: any) {
      // Revert optimistic update on error
      setFormData(prev => ({
        ...prev,
        portfolio: previousPortfolio,
      }));
      console.error('Error removing portfolio item:', error);
      Alert.alert('Error', error.message || 'Failed to remove portfolio item. Please try again.');
    }
  };

  const pickPortfolioImage = async () => {
    try {
      const result = await mediaPicker.pickImage({
        allowsEditing: true,
        quality: 0.8,
        maxWidth: IMAGE_DIMENSIONS.PORTFOLIO_MAX,
        maxHeight: IMAGE_DIMENSIONS.PORTFOLIO_MAX,
      });

      if (result) {
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, FILE_SIZE_LIMITS.IMAGE_MB)) {
          Alert.alert('File Too Large', `Please select an image smaller than ${FILE_SIZE_LIMITS.IMAGE_MB}MB.`);
          return;
        }

        // Upload the file to Supabase and get the URL
        setIsUploadingPortfolio(true);
        setUploadingImage({ type: 'portfolio', progress: undefined });
        try {
          const uploadResult = await uploadFile({
            uri: result.uri,
            type: 'image/jpeg',
            name: result.fileName || `portfolio_image_${Date.now()}.jpg`,
          });

          setUploadingImage({ type: null });
          if (uploadResult.data?.url) {
            // Directly add to portfolio after upload
            await addPortfolioItem(uploadResult.data.url, 'image');
          } else {
            throw new Error('Upload failed - no URL returned');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          setUploadingImage({ type: null });
          Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
        } finally {
          setIsUploadingPortfolio(false);
        }
      }
    } catch (error: any) {
      console.error('Error picking portfolio image:', error);
      Alert.alert('Error', error.message || 'Failed to pick portfolio image. Please try again.');
    }
  };

  const takePortfolioPhoto = async () => {
    try {
      const result = await mediaPicker.takePhoto({
        allowsEditing: true,
        quality: 0.8,
        maxWidth: IMAGE_DIMENSIONS.PORTFOLIO_MAX,
        maxHeight: IMAGE_DIMENSIONS.PORTFOLIO_MAX,
      });

      if (result) {
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, FILE_SIZE_LIMITS.IMAGE_MB)) {
          Alert.alert('File Too Large', `Please take a photo smaller than ${FILE_SIZE_LIMITS.IMAGE_MB}MB.`);
          return;
        }

        // Upload the file to Supabase and get the URL
        setIsUploadingPortfolio(true);
        setUploadingImage({ type: 'portfolio', progress: undefined });
        try {
          const uploadResult = await uploadFile({
            uri: result.uri,
            type: 'image/jpeg',
            name: result.fileName || `portfolio_photo_${Date.now()}.jpg`,
          });

          setUploadingImage({ type: null });
          if (uploadResult.data?.url) {
            // Directly add to portfolio after upload
            await addPortfolioItem(uploadResult.data.url, 'image');
          } else {
            throw new Error('Upload failed - no URL returned');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          setUploadingImage({ type: null });
          Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
        } finally {
          setIsUploadingPortfolio(false);
        }
      }
    } catch (error: any) {
      console.error('Error taking portfolio photo:', error);
      Alert.alert('Error', error.message || 'Failed to take portfolio photo. Please try again.');
    }
  };

  const pickPortfolioVideo = async () => {
    try {
      const result = await mediaPicker.pickVideo({
        quality: 0.8,
      });

      if (result) {
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, FILE_SIZE_LIMITS.VIDEO_MB)) {
          Alert.alert('File Too Large', `Please select a video smaller than ${FILE_SIZE_LIMITS.VIDEO_MB}MB.`);
          return;
        }

        // Handle duration validation - check if it's in seconds or milliseconds
        if (result.duration) {
          let durationInSeconds = result.duration;
          
          // If duration is larger than 100 (likely milliseconds), convert to seconds
          // Most video durations in seconds would be reasonable numbers, but milliseconds are typically much larger
          if (result.duration > 100) {
            durationInSeconds = result.duration / 1000;
          }
          
          if (durationInSeconds > VIDEO_DURATION_LIMIT_SECONDS) {
            const minutes = Math.floor(VIDEO_DURATION_LIMIT_SECONDS / 60);
            Alert.alert('Video Too Long', `Please select a video shorter than ${minutes} minutes.`);
            return;
          }
        }

        // Upload the file to Supabase and get the URL
        setIsUploadingPortfolio(true);
        setUploadingImage({ type: 'portfolio', progress: undefined });
        try {
          const uploadResult = await uploadFile({
            uri: result.uri,
            type: 'video/mp4',
            name: result.fileName || `portfolio_video_${Date.now()}.mp4`,
          });

          setUploadingImage({ type: null });
          if (uploadResult.data?.url) {
            // Directly add to portfolio after upload
            await addPortfolioItem(uploadResult.data.url, 'video');
          } else {
            throw new Error('Upload failed - no URL returned');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          setUploadingImage({ type: null });
          Alert.alert('Upload Failed', 'Failed to upload video. Please try again.');
        } finally {
          setIsUploadingPortfolio(false);
        }
      }
    } catch (error: any) {
      console.error('Error picking portfolio video:', error);
      Alert.alert('Error', error.message || 'Failed to pick portfolio video. Please try again.');
    }
  };

  const recordPortfolioVideo = async () => {
    try {
      const result = await mediaPicker.recordVideo({
        quality: 0.8,
      });

      if (result) {
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, FILE_SIZE_LIMITS.VIDEO_MB)) {
          Alert.alert('File Too Large', `Please record a video smaller than ${FILE_SIZE_LIMITS.VIDEO_MB}MB.`);
          return;
        }

        // Handle duration validation - check if it's in seconds or milliseconds
        if (result.duration) {
          let durationInSeconds = result.duration;
          
          // If duration is larger than 100 (likely milliseconds), convert to seconds
          // Most video durations in seconds would be reasonable numbers, but milliseconds are typically much larger
          if (result.duration > 100) {
            durationInSeconds = result.duration / 1000;
          }
          
          if (durationInSeconds > VIDEO_DURATION_LIMIT_SECONDS) {
            const minutes = Math.floor(VIDEO_DURATION_LIMIT_SECONDS / 60);
            Alert.alert('Video Too Long', `Please record a video shorter than ${minutes} minutes.`);
            return;
          }
        }

        // Upload the file to Supabase and get the URL
        setIsUploadingPortfolio(true);
        setUploadingImage({ type: 'portfolio', progress: undefined });
        try {
          const uploadResult = await uploadFile({
            uri: result.uri,
            type: 'video/mp4',
            name: result.fileName || `portfolio_recorded_${Date.now()}.mp4`,
          });

          setUploadingImage({ type: null });
          if (uploadResult.data?.url) {
            // Directly add to portfolio after upload
            await addPortfolioItem(uploadResult.data.url, 'video');
          } else {
            throw new Error('Upload failed - no URL returned');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          setUploadingImage({ type: null });
          Alert.alert('Upload Failed', 'Failed to upload video. Please try again.');
        } finally {
          setIsUploadingPortfolio(false);
        }
      }
    } catch (error: any) {
      console.error('Error recording portfolio video:', error);
      Alert.alert('Error', error.message || 'Failed to record portfolio video. Please try again.');
    }
  };

  // Audio upload function (for future implementation)
  const pickPortfolioAudio = async () => {
    try {
      // For now, show alert that audio upload is coming soon
      // When audio picker is implemented, uncomment and use this code:
      /*
      const result = await mediaPicker.pickAudio({
        quality: 0.8,
      });

      if (result) {
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, 50)) {
          Alert.alert('File Too Large', 'Please select an audio file smaller than 50MB.');
          return;
        }

        // Upload the file to Supabase and get the URL
        setIsUploadingPortfolio(true);
        setUploadProgress({
          visible: true,
          progress: undefined,
          label: 'Uploading portfolio audio...',
        });
        try {
          const uploadResult = await uploadFile({
            uri: result.uri,
            type: 'audio/mpeg',
            name: result.fileName || `portfolio_audio_${Date.now()}.mp3`,
          });

          setUploadProgress({ visible: false, label: '' });
          if (uploadResult.data?.url) {
            setCurrentPortfolioUrl(uploadResult.data.url);
            setPortfolioType('audio');
            Alert.alert('Success', 'Portfolio audio uploaded! Add a caption and click "Add to Portfolio".');
          } else {
            throw new Error('Upload failed - no URL returned');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          setUploadProgress({ visible: false, label: '' });
          Alert.alert('Upload Failed', 'Failed to upload audio. Please try again.');
        } finally {
          setIsUploadingPortfolio(false);
        }
      }
      */
      Alert.alert('Coming Soon', 'Audio upload will be available soon!');
    } catch (error: any) {
      console.error('Error picking portfolio audio:', error);
      Alert.alert('Error', error.message || 'Failed to pick portfolio audio. Please try again.');
    }
  };

  // Image picker functions
  const pickImage = async () => {
    // Check if mediaPicker is available
    if (!mediaPicker) {
      Alert.alert('Error', 'Image picker is not available. Please try again.');
      return;
    }

    try {
      const result = await mediaPicker.pickImage({
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
        maxWidth: IMAGE_DIMENSIONS.PROFILE_MAX,
        maxHeight: IMAGE_DIMENSIONS.PROFILE_MAX,
      });

      if (!result) {
        // User cancelled - no error needed
        return;
      }

      // Validate file size
      if (result.fileSize && mediaPicker.validateFileSize && !mediaPicker.validateFileSize(result.fileSize, FILE_SIZE_LIMITS.PROFILE_IMAGE_MB)) {
        Alert.alert('File Too Large', `Please select an image smaller than ${FILE_SIZE_LIMITS.PROFILE_IMAGE_MB}MB.`);
        return;
      }

      // Upload using profile pictures API
      try {
        const userId = currentUser?.id || user?.id;
        if (!userId) {
          Alert.alert('Error', 'User ID not available. Please log in again.');
          return;
        }

        // Check if this should be main (if no main picture exists)
        const hasMainPicture = profilePictures.some((p: any) => p.is_main);
        const shouldBeMain = !hasMainPicture;
        
        // Create file object for API
        // Determine MIME type from file extension or default to image/jpeg
        const fileName = result.fileName || `profile_picture_${Date.now()}.jpg`;
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        const mimeType = fileExtension === 'png' ? 'image/png' : 
                        fileExtension === 'gif' ? 'image/gif' : 
                        'image/jpeg';
        
        const file = {
          uri: result.uri,
          type: mimeType,
          name: fileName,
        };

        // Show upload progress on image placeholder
        setUploadingImage({ type: 'profile', progress: undefined });

        const uploadResult = await uploadProfilePicture(file, shouldBeMain);
        
        // Hide progress
        setUploadingImage({ type: null });
        
        if (uploadResult.success && uploadResult.data) {
          // Refresh profile pictures gallery
          try {
            await refreshProfilePictures(userId);
          } catch (reloadError) {
            console.error('Failed to reload profile pictures:', reloadError);
            // Don't show error - image was uploaded successfully
          }
          Alert.alert('Success', 'Profile picture uploaded and updated!');
        } else {
          throw new Error(uploadResult.error || 'Upload failed');
        }
      } catch (uploadError: any) {
        console.error('Upload error:', uploadError);
        setUploadingImage({ type: null });
        const errorMessage = uploadError.message || uploadError.toString() || 'Failed to upload profile picture. Please try again.';
        Alert.alert('Upload Failed', errorMessage);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      // Don't show alert if user cancelled
      if (error.code !== 'E_PICKER_CANCELLED' && error.message !== 'User cancelled image picker') {
        const errorMessage = error.message || error.toString() || 'Failed to pick image. Please try again.';
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const takePhoto = async () => {
    try {
      const result = await mediaPicker.takePhoto({
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
        maxWidth: IMAGE_DIMENSIONS.PROFILE_MAX,
        maxHeight: IMAGE_DIMENSIONS.PROFILE_MAX,
      });

      if (result) {
        // Validate file size
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, FILE_SIZE_LIMITS.PROFILE_IMAGE_MB)) {
          Alert.alert('File Too Large', `Please take a photo smaller than ${FILE_SIZE_LIMITS.PROFILE_IMAGE_MB}MB.`);
          return;
        }

        // Upload using profile pictures API
        try {
          const userId = currentUser?.id || user?.id;
          if (!userId) {
            Alert.alert('Error', 'User ID not available.');
            return;
          }

          // Check if this should be main (if no main picture exists)
          const hasMainPicture = profilePictures.some((p: any) => p.is_main);
          const shouldBeMain = !hasMainPicture;
          
          // Create file object for API
          const file = {
            uri: result.uri,
            type: 'image/jpeg',
            name: result.fileName || `profile_photo_${Date.now()}.jpg`,
          };

          setUploadingImage({ type: 'profile', progress: undefined });

          const uploadResult = await uploadProfilePicture(file, shouldBeMain);
          
          setUploadingImage({ type: null });
          if (uploadResult.success) {
            // Refresh profile pictures gallery
            await refreshProfilePictures(userId);
            Alert.alert('Success', 'Profile photo uploaded and updated!');
          } else {
            throw new Error(uploadResult.error || 'Upload failed');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          setUploadingImage({ type: null });
          Alert.alert('Upload Failed', uploadError.message || 'Failed to upload profile photo. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', error.message || 'Failed to take photo. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // 1. Prepare basic profile data (bio, specialty, skills, imageUrl, location_text, coverImages)
      // Note: social_links are handled separately via dedicated endpoints
      // Get imageUrl from formData or from main profile picture
      let finalImageUrl = formData.imageUrl.trim();
      if (!finalImageUrl && profilePictures.length > 0) {
        const mainPicture = profilePictures.find((p: any) => p.is_main);
        if (mainPicture && mainPicture.image_url) {
          finalImageUrl = mainPicture.image_url;
        } else if (profilePictures[0] && profilePictures[0].image_url) {
          // Use first picture if no main picture is set
          finalImageUrl = profilePictures[0].image_url;
        }
      }

      const basicProfileData = {
        bio: formData.bio.trim(),
        specialty: formData.specialty.trim() || undefined, // Optional field
        skills: formData.skills,
        imageUrl: finalImageUrl, // This will be mapped to image_url in ApiContext
        location_text: formData.about.location.trim() || undefined, // Location stored in users table, optional
        // Note: Cover images are managed separately via profile pictures API
      };

      // 2. Prepare UserDetails data (age, nationality, gender only)
      // Map form gender to valid enum values
      const genderMapping: { [key: string]: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | 'other' } = {
        'male': 'male',
        'female': 'female',
        'Male': 'male',
        'Female': 'female',
        'MALE': 'male',
        'FEMALE': 'female',
        'other': 'other',
        'Other': 'other',
        'OTHER': 'other',
        'non_binary': 'non_binary',
        'Non Binary': 'non_binary',
        'Non-Binary': 'non_binary',
        'NON_BINARY': 'non_binary',
        'prefer_not_to_say': 'prefer_not_to_say',
        'Prefer Not To Say': 'prefer_not_to_say',
        'Prefer not to say': 'prefer_not_to_say',
        'PREFER_NOT_TO_SAY': 'prefer_not_to_say',
      };

      const userDetailsData = {
        gender: formData.about.gender ? (genderMapping[formData.about.gender] || 'prefer_not_to_say') : undefined, // Optional field
        birthday: formData.about.birthday || undefined,
        nationality: formData.about.nationality && formData.about.nationality.trim() ? formData.about.nationality.trim() : undefined, // Optional field
        // Note: location is stored in users table as location_text, not in userDetails
      };


      // 3. Prepare Talent Profile data (all other physical and professional details)
      // Only prepare if user is a talent
      let cleanedTalentData: any = {};
      
      if (isTalent) {
        // Find the IDs for hair color and skin tone from reference data
        const selectedHairColor = hairColors.find(color => color.id === formData.about.hairColor);
        const selectedSkinTone = skinTones.find(tone => tone.id === formData.about.skinTone);

        const talentProfileData = {
          height_cm: Number(formData.about.height) || undefined,
          weight_kg: Number(formData.about.weight) || undefined,
          skin_tone_id: selectedSkinTone?.id || undefined,
          hair_color_id: selectedHairColor?.id || undefined,
          eye_color: formData.about.eyeColor || undefined,
          // Note: location is stored in users table as location_text, not in talent profile
          chest_cm: Number(formData.about.chestCm) || undefined,
          waist_cm: Number(formData.about.waistCm) || undefined,
          hips_cm: Number(formData.about.hipsCm) || undefined,
          shoe_size_eu: Number(formData.about.shoeSizeEu) || undefined,
          reel_url: formData.about.reelUrl || undefined,
          union_member: formData.about.unionMember,
          dialects: formData.about.dialects || [],
          travel_ready: formData.about.willingToTravel,
        };

        // Clean the talent profile data - remove undefined values
        cleanedTalentData = Object.fromEntries(
          Object.entries(talentProfileData).filter(([_, value]) => value !== undefined && value !== null && value !== '')
        );
      }


      // Update basic profile
      const profileResponse = await updateProfile(basicProfileData);

      // Update or create user details (age, nationality, gender, location)
      let userDetailsResponse;
      try {
        userDetailsResponse = await api.updateUserDetails(userDetailsData);
      } catch (updateError: any) {
        // If update fails (404 - user details don't exist), create new ones
        if (updateError?.response?.status === 404 || updateError?.status === 404) {
          try {
            userDetailsResponse = await api.createUserDetails(userDetailsData);
          } catch (createError: any) {
            console.error('❌ Failed to create user details:', createError);
            throw new Error(createError.message || 'Failed to save user details. Please try again.');
          }
        } else {
          // For other errors, throw to show user
          console.error('❌ Failed to update user details:', updateError);
          throw new Error(updateError.message || 'Failed to update user details. Please try again.');
        }
      }

      // Update talent profile (physical details) using direct API call
      // Note: The updateProfile function already tries to update talent profile,
      // but we need to do it separately here to get proper error handling
      let talentResult: any = { data: {} };
      
      // Only try to update if user is talent and there's actual talent data
      if (isTalent && Object.keys(cleanedTalentData).length > 0) {
        let accessToken: string;
        try {
          accessToken = getAccessToken();
        } catch (tokenError: any) {
          console.error(' Failed to get access token:', tokenError);
          throw new Error('Access token required for talent profile update. Please log in again.');
        }

        // Try PUT first (update existing), if it fails with 404 or permission error, try POST (create new)
        let talentResponse = await fetch(`${getBaseUrl()}/api/talent/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(cleanedTalentData),
        });

        talentResult = await talentResponse.json();
        
        // If PUT fails with 404 (not found) or 403 (permission), try POST to create
        if (!talentResponse.ok && (talentResponse.status === 404 || talentResponse.status === 403)) {
          
          talentResponse = await fetch(`${getBaseUrl()}/api/talent/profile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(cleanedTalentData),
          });

          talentResult = await talentResponse.json();
        }
        
        if (!talentResponse.ok) {
          console.error('❌ Talent profile update/create failed:', talentResult);
          
          // Check if it's a permissions error
          if (talentResult.error === 'Insufficient permissions' || talentResponse.status === 403) {
            console.error('❌ Permission denied. This might mean:');
            console.error('   1. The user is not classified as "talent" in the system (current category: ' + (user?.category || 'unknown') + ')');
            console.error('   2. The token does not have permission to access talent endpoints');
            console.error('   3. The API requires the user to have category="talent" before accessing talent endpoints');
            
            // Show user-friendly message but don't block other updates
            Alert.alert(
              'Talent Profile Update Skipped',
              'Your basic profile was updated, but talent-specific details could not be saved. This may be because your account category is not set to "talent" yet. You can update these details later.',
              [{ text: 'OK' }]
            );
          } else {
            // For other errors, show warning but continue
            const errorMessage = talentResult.error || talentResult.message || 'Unknown error';
            console.warn('⚠️ Talent profile update failed, but continuing with other updates:', errorMessage);
            Alert.alert(
              'Partial Update',
              `Your basic profile was updated, but there was an issue saving talent-specific details: ${errorMessage}. You can try updating these details again later.`,
              [{ text: 'OK' }]
            );
          }
        }
      }

      // Combine all responses
      const combinedData = {
        ...profileResponse.data,
        about: {
          ...userDetailsResponse?.data,  // age, nationality, gender
          ...talentResult.data  // height, weight, skin_tone, etc.
        }
      };

      // Refresh user data and profile pictures after update
      try {
        const userId = currentUser?.id || user?.id;
        if (userId) {
          // Refresh profile pictures to show updated gallery
          await refreshProfilePictures(userId);
          
          // Refresh user details and talent profile data
          const accessToken = getAccessToken();
          const baseUrl = getBaseUrl();
          
          // Refresh user details
          try {
            const userDetailsResponse = await fetch(`${baseUrl}/api/user-details`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
            });
            
            if (userDetailsResponse.ok) {
              const detailsData = await userDetailsResponse.json();
              setFetchedUserDetails(detailsData.data || detailsData);
            }
          } catch (error) {
            console.error('Failed to refresh user details:', error);
          }
          
          // Refresh talent profile if user is talent
          if (isTalent) {
            try {
              const talentResponse = await fetch(`${baseUrl}/api/talent/profile`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
              });
              
              if (talentResponse.ok) {
                const talentData = await talentResponse.json();
                setFetchedTalentProfile(talentData.data || talentData);
              }
            } catch (error) {
              console.error('Failed to refresh talent profile:', error);
            }
          }
        }
      } catch (refreshError) {
        console.error('Failed to refresh data after update:', refreshError);
        // Don't block success message if refresh fails
      }

      Alert.alert(
        'Success',
        'Your profile has been updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // If used as a modal, close it
              if (visible !== undefined && onClose) {
                onClose();
              } else if (visible === undefined) {
              // If used as a screen, navigate back to profile page
              // Check if we can go back, otherwise navigate to myProfile
              if (nav.canGoBack()) {
                nav.goBack();
              } else {
                // Fallback: navigate to myProfile if we can't go back
                const userToNavigate = currentUser || user;
                if (userToNavigate?.id) {
                  (nav as any).navigate('myProfile', { user: userToNavigate });
                } else {
                  (nav as any).navigate('spot');
                }
              }
              }
            }
          }
        ]
      );
      onProfileUpdated?.(combinedData);
      
    } catch (error: any) {
      console.error('❌ Profile update error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const calculateCompletionPercentage = () => {
    const fields = [
      formData.bio,
      formData.specialty,
      formData.skills.length > 0,
      formData.about.gender,
      formData.about.birthday,
      formData.about.nationality,
      formData.about.location,
    ];
    
    const completedFields = fields.filter(Boolean).length;
    return Math.round((completedFields / fields.length) * 100);
  };

  const completionPercentage = calculateCompletionPercentage();

  const content = (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose || (() => navigation?.goBack())} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Complete Your Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        {/* Upload Progress Bar */}
        {uploadProgress.visible && (
          <UploadProgressBar
            progress={uploadProgress.progress}
            label={uploadProgress.label}
            visible={uploadProgress.visible}
          />
        )}
        
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Profile Completion: {completionPercentage}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
          </View>
        </View>

        {/* Basic Information Section */}
        <CollapsibleSection
          id="basic-info"
          title="Basic Information"
          isExpanded={expandedSections.has('basic-info')}
          onToggle={() => toggleSection('basic-info')}
          sectionRef={sectionRefs['basic-info']}
        >
          {/* Profile Picture Preview */}
          <View style={styles.profilePictureContainer}>
            <Text style={styles.sectionTitle}>Profile Picture</Text>
            <TouchableOpacity
              onPress={async () => {
                try {
                  if (pickImage) {
                    await pickImage();
                  } else {
                    Alert.alert('Error', 'Image picker is not available.');
                  }
                } catch (error: any) {
                  console.error('Error in pickImage handler:', error);
                  // Only show alert if it's not a cancellation
                  if (error.code !== 'E_PICKER_CANCELLED' && error.message !== 'User cancelled image picker') {
                    Alert.alert('Error', 'Failed to open image picker. Please try again.');
                  }
                }
              }}
              disabled={isSubmitting || uploadingImage.type === 'profile'}
              activeOpacity={0.7}
            >
              <ImageUploadWithProgress
                imageUrl={formData.imageUrl}
                placeholderSize={{ width: 120, height: 120 }}
                borderRadius={60}
                isUploading={uploadingImage.type === 'profile'}
                uploadProgress={uploadingImage.progress}
                uploadLabel="Uploading profile picture..."
                disabled={isSubmitting || uploadingImage.type === 'profile'}
              >
                <View style={styles.profilePicturePlaceholder}>
                  <Ionicons name="camera-outline" size={32} color="#9ca3af" />
                  <Text style={styles.profilePictureInitials}>
                    {getInitials(user?.name || 'User')}
                  </Text>
                </View>
                {!uploadingImage.type && (
                  <View style={styles.profilePictureOverlay}>
                    <Ionicons name="camera" size={24} color="#fff" />
                    <Text style={styles.profilePictureOverlayText}>Tap to upload</Text>
                  </View>
                )}
              </ImageUploadWithProgress>
            </TouchableOpacity>
            
            <Text style={styles.profilePictureHint}>
              Tap the image to choose from gallery or add an image URL below
            </Text>
          </View>

          {/* Cover Images Section - Using Profile Pictures API */}
          <View style={styles.profilePictureContainer}>
            <Text style={styles.sectionTitle}>Cover Images</Text>
            <Text style={styles.helpText}>
              Add multiple cover images that will be displayed at the top of your profile. These images will be shown in a swipeable carousel. The first image will be set as your main profile picture.
            </Text>
            
            {loadingProfilePictures ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading profile pictures...</Text>
              </View>
            ) : (
              <>
                {/* Profile Pictures Grid */}
                {profilePictures.length > 0 && (
                  <View style={styles.coverImagesGrid}>
                    {profilePictures.map((picture) => (
                      <View key={picture.id} style={styles.coverImageItem}>
                        <ImageUploadWithProgress
                          imageUrl={picture.image_url}
                          placeholderSize={{ width: 150, height: 100 }}
                          borderRadius={12}
                          isUploading={false}
                        >
                          <View style={styles.coverImagePlaceholder}>
                            <Ionicons name="image-outline" size={28} color="#9ca3af" />
                          </View>
                        </ImageUploadWithProgress>
                        {/* Main Badge - Top Left */}
                        {picture.is_main && (
                          <View style={styles.mainImageBadge}>
                            <Ionicons name="star" size={14} color="#fff" />
                            <Text style={styles.mainImageBadgeText}>Main</Text>
                          </View>
                        )}
                        
                        {/* Delete Button - Top Right */}
                        <TouchableOpacity
                          style={styles.removeCoverImageButton}
                          onPress={async () => {
                            try {
                              const userId = currentUser?.id || user?.id;
                              if (!userId) return;
                              await deleteProfilePicture(userId, picture.id);
                              // Refresh profile pictures gallery
                              await refreshProfilePictures(userId);
                              Alert.alert('Success', 'Profile picture deleted!');
                            } catch (error: any) {
                              console.error('Failed to delete picture:', error);
                              Alert.alert('Error', error.message || 'Failed to delete picture.');
                            }
                          }}
                          disabled={isSubmitting}
                        >
                          <Ionicons name="close-circle" size={20} color="#ef4444" />
                        </TouchableOpacity>
                        
                        {/* Set Main Button - Bottom Right (only for non-main images) */}
                        {!picture.is_main && (
                          <TouchableOpacity
                            style={styles.setMainButton}
                            onPress={async () => {
                              const userId = currentUser?.id || user?.id;
                              if (!userId) return;
                              
                              // Capture previous state before optimistic update
                              const previousPictures = [...profilePictures];
                              
                              try {
                                // Optimistically update the state immediately
                                const updatedPictures = profilePictures.map((p) => ({
                                  ...p,
                                  is_main: p.id === picture.id,
                                }));
                                setProfilePictures(updatedPictures);
                                
                                // Update form data with the new main picture
                                setFormData(prev => ({
                                  ...prev,
                                  imageUrl: picture.image_url,
                                }));
                                
                                // Call the API
                                await setMainProfilePicture(userId, picture.id);
                                
                                // Refresh profile pictures gallery
                                await refreshProfilePictures(userId);
                                
                                Alert.alert('Success', 'Main profile picture updated!');
                              } catch (error: any) {
                                console.error('Failed to set main picture:', error);
                                // Revert optimistic update on error
                                try {
                                  await refreshProfilePictures(userId);
                                } catch (refreshError) {
                                  // If refresh fails, revert to previous state
                                  setProfilePictures(previousPictures);
                                }
                                Alert.alert('Error', error.message || 'Failed to set main picture.');
                              }
                            }}
                            disabled={isSubmitting}
                          >
                            <Ionicons name="star-outline" size={18} color="#3b82f6" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Show uploading placeholder for cover images */}
                {uploadingImage.type === 'cover' && (
                  <View style={styles.coverImagesGrid}>
                    <View style={styles.coverImageItem}>
                      <ImageUploadWithProgress
                        imageUrl={undefined}
                        placeholderSize={{ width: 150, height: 100 }}
                        borderRadius={12}
                        isUploading={true}
                        uploadProgress={uploadingImage.progress}
                        uploadLabel="Uploading cover image..."
                      >
                        <View style={styles.coverImagePlaceholder}>
                          <Ionicons name="image-outline" size={28} color="#9ca3af" />
                        </View>
                      </ImageUploadWithProgress>
                    </View>
                  </View>
                )}
                
                {/* Add Cover Image Buttons */}
                <View style={styles.imageSelectionContainer}>
                  <TouchableOpacity
                    style={[styles.imageSelectionButton, styles.imageSelectionButtonPrimary]}
                    onPress={async () => {
                      try {
                        const result = await mediaPicker.pickImage({
                          allowsEditing: true,
                          quality: 0.8,
                          maxWidth: IMAGE_DIMENSIONS.COVER_MAX,
                          maxHeight: IMAGE_DIMENSIONS.COVER_HEIGHT,
                        });

                        if (result) {
                          if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, FILE_SIZE_LIMITS.IMAGE_MB)) {
                            Alert.alert('File Too Large', `Please select an image smaller than ${FILE_SIZE_LIMITS.IMAGE_MB}MB.`);
                            return;
                          }

                          try {
                            const userId = currentUser?.id || user?.id;
                            if (!userId) {
                              Alert.alert('Error', 'User ID not available.');
                              return;
                            }

                            // Check if this is the first picture (should be main)
                            const isFirstPicture = profilePictures.length === 0;
                            
                            // Create file object for API
                            const file = {
                              uri: result.uri,
                              type: 'image/jpeg',
                              name: result.fileName || `cover_image_${Date.now()}.jpg`,
                            };

                            setUploadingImage({ type: 'cover', progress: undefined });

                            const uploadResult = await uploadProfilePicture(file, isFirstPicture);
                            
                            setUploadingImage({ type: null });
                            if (uploadResult.success) {
                              // Refresh profile pictures gallery
                              await refreshProfilePictures(userId);
                              Alert.alert('Success', 'Cover image uploaded!');
                            } else {
                              throw new Error(uploadResult.error || 'Upload failed');
                            }
                          } catch (uploadError: any) {
                            console.error('Upload error:', uploadError);
                            setUploadingImage({ type: null });
                            Alert.alert('Upload Failed', uploadError.message || 'Failed to upload cover image. Please try again.');
                          }
                        }
                      } catch (error: any) {
                        console.error('Error picking cover image:', error);
                        Alert.alert('Error', error.message || 'Failed to pick cover image. Please try again.');
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    <View style={styles.imageSelectionButtonIcon}>
                      <Ionicons name="images-outline" size={22} color="#fff" />
                    </View>
                    <Text style={styles.imageSelectionTextPrimary}>From Gallery</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.imageSelectionButton, styles.imageSelectionButtonSecondary]}
                    onPress={async () => {
                      try {
                        const result = await mediaPicker.takePhoto({
                          allowsEditing: true,
                          quality: 0.8,
                          maxWidth: IMAGE_DIMENSIONS.COVER_MAX,
                          maxHeight: IMAGE_DIMENSIONS.COVER_HEIGHT,
                        });

                        if (result) {
                          if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, FILE_SIZE_LIMITS.IMAGE_MB)) {
                            Alert.alert('File Too Large', `Please take a photo smaller than ${FILE_SIZE_LIMITS.IMAGE_MB}MB.`);
                            return;
                          }

                          try {
                            const userId = currentUser?.id || user?.id;
                            if (!userId) {
                              Alert.alert('Error', 'User ID not available.');
                              return;
                            }

                            // Check if this is the first picture (should be main)
                            const isFirstPicture = profilePictures.length === 0;
                            
                            // Create file object for API
                            const file = {
                              uri: result.uri,
                              type: 'image/jpeg',
                              name: result.fileName || `cover_photo_${Date.now()}.jpg`,
                            };

                            setUploadingImage({ type: 'cover', progress: undefined });

                            const uploadResult = await uploadProfilePicture(file, isFirstPicture);
                            
                            setUploadingImage({ type: null });
                            if (uploadResult.success) {
                              // Refresh profile pictures gallery
                              await refreshProfilePictures(userId);
                              Alert.alert('Success', 'Cover photo uploaded!');
                            } else {
                              throw new Error(uploadResult.error || 'Upload failed');
                            }
                          } catch (uploadError: any) {
                            console.error('Upload error:', uploadError);
                            setUploadingImage({ type: null });
                            Alert.alert('Upload Failed', uploadError.message || 'Failed to upload cover photo. Please try again.');
                          }
                        }
                      } catch (error: any) {
                        console.error('Error taking cover photo:', error);
                        Alert.alert('Error', error.message || 'Failed to take cover photo. Please try again.');
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    <View style={styles.imageSelectionButtonIconSecondary}>
                      <Ionicons name="camera-outline" size={22} color="#3b82f6" />
                    </View>
                    <Text style={styles.imageSelectionTextSecondary}>Take Photo</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Bio */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Bio *</Text>
            <TextInput
              style={[styles.textArea, formErrors.bio && styles.inputError]}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#9ca3af"
              value={formData.bio}
              onChangeText={(text) => handleInputChange('bio', text)}
              multiline
              numberOfLines={4}
              editable={!isSubmitting}
            />
            {formErrors.bio && <Text style={styles.fieldError}>{formErrors.bio}</Text>}
          </View>

          {/* Specialty */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Specialty</Text>
            <View ref={specialtyInputRef} style={styles.autocompleteContainer} collapsable={false}>
              <TextInput
                style={[styles.input, formErrors.specialty && styles.inputError]}
                placeholder="e.g., Character Actor, Voice Actor, etc."
                placeholderTextColor="#9ca3af"
                value={formData.specialty}
                onChangeText={handleSpecialtyChange}
                onFocus={() => {
                  specialtyInputRef.current?.measureInWindow((x, y, width, height) => {
                    setSpecialtyInputLayout({ x, y, width, height });
                    if (formData.specialty.trim().length > 0 && filteredRoles.length > 0) {
                      setShowRoleSuggestions(true);
                    }
                  });
                }}
                onBlur={() => {
                  // Delay hiding suggestions to allow for selection
                  setTimeout(() => setShowRoleSuggestions(false), 200);
                }}
                editable={!isSubmitting}
              />
            </View>
            <Modal
              visible={showRoleSuggestions && filteredRoles.length > 0}
              transparent={true}
              animationType="none"
              onRequestClose={() => setShowRoleSuggestions(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowRoleSuggestions(false)}
              >
                <View
                  style={[
                    styles.suggestionsContainer,
                    {
                      position: 'absolute',
                      top: specialtyInputLayout.y + specialtyInputLayout.height + 4,
                      left: specialtyInputLayout.x,
                      width: specialtyInputLayout.width,
                    }
                  ]}
                  onStartShouldSetResponder={() => true}
                >
                  <ScrollView 
                    style={styles.suggestionsList}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                  >
                    {filteredRoles.slice(0, 10).map((role) => (
                      <TouchableOpacity
                        key={role.id}
                        style={styles.suggestionItem}
                        onPress={() => handleRoleSelect(role.name)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color="#3b82f6" style={styles.suggestionIcon} />
                        <Text style={styles.suggestionText}>{role.name}</Text>
                        {role.category && (
                          <Text style={styles.suggestionCategory}>{role.category}</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
            {formErrors.specialty && <Text style={styles.fieldError}>{formErrors.specialty}</Text>}
          </View>

          {/* Skills */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Skills *</Text>
            {loadingReferences ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading skills...</Text>
              </View>
            ) : (
              <CustomDropdown
                options={availableSkills}
                value={currentSkill}
                onValueChange={(value: string) => {
                  setCurrentSkill(value);
                  if (value && !formData.skills.includes(value)) {
                    addSkillFromDropdown(value);
                  }
                }}
                placeholder="Select a skill to add"
                disabled={isSubmitting}
              />
            )}
            <View style={styles.skillsList}>
              {formData.skills.map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                  <TouchableOpacity onPress={() => removeSkill(skill)} disabled={isSubmitting}>
                    <Ionicons name="close" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            {formErrors.skills && <Text style={styles.fieldError}>{formErrors.skills}</Text>}
          </View>
        </CollapsibleSection>

        {/* Portfolio Section */}
        <CollapsibleSection
          id="portfolio"
          title="Portfolio"
          isExpanded={expandedSections.has('portfolio')}
          onToggle={() => toggleSection('portfolio')}
          sectionRef={sectionRefs['portfolio']}
        >
          {/* Portfolio Type Selector - Clickable to Upload */}
        <View style={styles.portfolioTypeSelector}>
          <TouchableOpacity
            style={[styles.portfolioTypeButton, portfolioType === 'image' && styles.portfolioTypeButtonActive]}
            onPress={async () => {
              setPortfolioType('image');
              await pickPortfolioImage();
            }}
            disabled={isSubmitting || isUploadingPortfolio}
          >
            <Text style={[styles.portfolioTypeButtonText, portfolioType === 'image' && styles.portfolioTypeButtonTextActive]}>
              📷 Image
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.portfolioTypeButton, portfolioType === 'video' && styles.portfolioTypeButtonActive]}
            onPress={async () => {
              setPortfolioType('video');
              await pickPortfolioVideo();
            }}
            disabled={isSubmitting || isUploadingPortfolio}
          >
            <Text style={[styles.portfolioTypeButtonText, portfolioType === 'video' && styles.portfolioTypeButtonTextActive]}>
              🎥 Video
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.portfolioTypeButton, portfolioType === 'audio' && styles.portfolioTypeButtonActive]}
            onPress={async () => {
              setPortfolioType('audio');
              await pickPortfolioAudio();
            }}
            disabled={isSubmitting || isUploadingPortfolio}
          >
            <Text style={[styles.portfolioTypeButtonText, portfolioType === 'audio' && styles.portfolioTypeButtonTextActive]}>
              🎵 Audio
            </Text>
          </TouchableOpacity>
        </View>
              
        {/* Portfolio Items List */}
        {formData.portfolio.length > 0 && (
          <View style={styles.portfolioList}>
            <Text style={styles.portfolioListTitle}>Your Portfolio ({formData.portfolio.length} items)</Text>
            <View style={styles.portfolioGrid}>
              {formData.portfolio.map((item, index) => (
                <View key={index} style={styles.portfolioThumbnailContainer}>
                  {item.kind === 'image' ? (
                    <Image 
                      source={{ uri: item.url }} 
                      style={styles.portfolioThumbnail}
                      resizeMode="cover"
                    />
                  ) : item.kind === 'video' ? (
                    <View style={styles.portfolioThumbnail}>
                      <Ionicons name="videocam" size={32} color="#fff" />
                      <View style={styles.portfolioVideoOverlay} />
                    </View>
                  ) : (
                    <View style={styles.portfolioThumbnail}>
                      <Ionicons name="musical-notes" size={32} color="#fff" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removePortfolioThumbnailButton}
                    onPress={() => removePortfolioItem(index)}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                  {item.caption && (
                    <Text style={styles.portfolioThumbnailCaption} numberOfLines={1}>
                      {item.caption}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
        </CollapsibleSection>

        {/* Social Media Section */}
        <CollapsibleSection
          id="social-media"
          title="Social Media"
          isExpanded={expandedSections.has('social-media')}
          onToggle={() => toggleSection('social-media')}
          sectionRef={sectionRefs['social-media']}
        >
          <Text style={styles.socialMediaDescription}>
            Add your social media profiles to showcase your work and connect with others.
          </Text>

          {/* Platform Icons Row */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.platformIconsRow}
          >
            {(Object.keys(platformConfig) as Array<keyof typeof platformConfig>).map((platformKey) => {
              const platform = platformKey as string;
              const config = platformConfig[platformKey];
              const existingLink = getLinkForPlatform(platform);
              const isEditing = editingPlatform === platform;
              const isLoading = platformLoading[platform] || false;

              return (
                <View key={platform} style={styles.platformIconWrapper}>
                  {!isEditing ? (
                    <TouchableOpacity
                      style={[
                        styles.platformIconButton,
                        existingLink && styles.platformIconButtonAdded,
                      ]}
                      onPress={() => handlePlatformCardTap(platform)}
                      disabled={isSubmitting || isLoading}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={config.icon as any} size={24} color={config.color} />
                      {existingLink && (
                        <View style={styles.platformIconBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.platformIconEditingContainer}>
                      <View style={[styles.platformIconButton, styles.platformIconButtonEditing]}>
                        <Ionicons name={config.icon as any} size={24} color={config.color} />
                      </View>
                      <View style={styles.platformIconInputContainer}>
                        <TextInput
                          style={styles.platformIconInput}
                          placeholder={config.placeholder}
                          placeholderTextColor="#9ca3af"
                          value={platformInputs[platform] || ''}
                          onChangeText={(text) => handlePlatformInputChange(platform, text)}
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType={platform === 'website' || platform === 'other' ? 'url' : 'default'}
                          editable={!isLoading && !isSubmitting}
                          autoFocus={true}
                        />
                        <View style={styles.platformIconInputActions}>
                          <TouchableOpacity
                            style={[styles.platformIconActionButton, styles.platformIconSaveButton]}
                            onPress={() => handleSavePlatformLink(platform)}
                            disabled={isLoading || isSubmitting || !platformInputs[platform]?.trim()}
                          >
                            {isLoading ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Ionicons name="checkmark" size={18} color="#fff" />
                            )}
                          </TouchableOpacity>
                          {existingLink && (
                            <TouchableOpacity
                              style={[styles.platformIconActionButton, styles.platformIconDeleteButton]}
                              onPress={() => handleDeletePlatformLink(platform)}
                              disabled={isLoading || isSubmitting}
                            >
                              <Ionicons name="trash-outline" size={16} color="#fff" />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.platformIconActionButton, styles.platformIconCancelButton]}
                            onPress={() => handleCancelPlatformEdit(platform)}
                            disabled={isLoading || isSubmitting}
                          >
                            <Ionicons name="close" size={16} color="#6b7280" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Summary of Added Links */}
          {formData.socialLinks.length > 0 && (
            <View style={styles.socialLinksSummary}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.socialLinksSummaryTitle}>
                {formData.socialLinks.length} {formData.socialLinks.length === 1 ? 'profile' : 'profiles'} connected
              </Text>
            </View>
          )}
        </CollapsibleSection>

        {/* Personal Details Section */}
        <CollapsibleSection
          id="details-info"
          title="Personal Details"
          isExpanded={expandedSections.has('details-info')}
          onToggle={() => toggleSection('details-info')}
          sectionRef={sectionRefs['details-info']}
        >
          {/* Personal Information */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

        <View style={styles.row}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Gender</Text>
            <CustomDropdown
              options={[
                { id: 'male', name: 'Male' },
                { id: 'female', name: 'Female' },
                { id: 'non_binary', name: 'Non Binary' },
                { id: 'other', name: 'Other' },
                { id: 'prefer_not_to_say', name: 'Prefer Not To Say' },
              ]}
              value={formData.about.gender}
              onValueChange={(value: string) => handleInputChange('about.gender', value)}
              placeholder="Select gender"
                disabled={isSubmitting}
            />
            {formErrors.gender && <Text style={styles.fieldError}>{formErrors.gender}</Text>}
            </View>

          <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
            <DatePicker
              label="Date of Birth"
              value={formData.about.birthday}
              onChange={(date) => handleInputChange('about.birthday', date)}
              placeholder="Select your birthday"
              mode="date"
              maximumDate={new Date()} // Can't be in the future
              minimumDate={new Date(1900, 0, 1)} // Reasonable minimum date
              disabled={isSubmitting}
              required={false}
              error={formErrors.birthday}
              style={{ marginBottom: 0 }}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Nationality</Text>
            <TextInput
              style={[styles.input, formErrors.nationality && styles.inputError]}
              placeholder="Egyptian"
              placeholderTextColor="#9ca3af"
              value={formData.about.nationality}
              onChangeText={(text) => handleInputChange('about.nationality', text)}
              editable={!isSubmitting}
            />
            {formErrors.nationality && <Text style={styles.fieldError}>{formErrors.nationality}</Text>}
        </View>

          <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={[styles.input, formErrors.location && styles.inputError]}
              placeholder="Cairo, EG"
              placeholderTextColor="#9ca3af"
              value={formData.about.location}
              onChangeText={(text) => handleInputChange('about.location', text)}
              editable={!isSubmitting}
            />
            {formErrors.location && <Text style={styles.fieldError}>{formErrors.location}</Text>}
          </View>
        </View>

        {/* Talent-specific physical details - only show if user is talent */}
        {isTalent && (
          <>
            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="170"
                  placeholderTextColor="#9ca3af"
                  value={formData.about.height}
                  onChangeText={(text) => handleInputChange('about.height', text)}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                />
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="70"
                  placeholderTextColor="#9ca3af"
                  value={formData.about.weight}
                  onChangeText={(text) => handleInputChange('about.weight', text)}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Skin Tone</Text>
                {loadingReferences ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#3b82f6" />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
              ) : (
                  <CustomDropdown
                    options={skinTones}
                    value={formData.about.skinTone}
                    onValueChange={(value: string) => handleInputChange('about.skinTone', value)}
                    placeholder="Select skin tone"
                          disabled={isSubmitting}
                  />
                      )}
                    </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Hair Color</Text>
                {loadingReferences ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#3b82f6" />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
                ) : (
                  <CustomDropdown
                    options={hairColors}
                    value={formData.about.hairColor}
                    onValueChange={(value: string) => handleInputChange('about.hairColor', value)}
                    placeholder="Select hair color"
                    disabled={isSubmitting}
                  />
                )}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Eye Color</Text>
              <TextInput
                style={styles.input}
                placeholder="Brown/Blue/Green/Hazel"
                placeholderTextColor="#9ca3af"
                value={formData.about.eyeColor}
                onChangeText={(text) => handleInputChange('about.eyeColor', text)}
                editable={!isSubmitting}
              />
                    </View>

            {/* Body Measurements */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Body Measurements</Text>
                  </View>
                  
            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Chest (cm)</Text>
                    <TextInput
                  style={styles.input}
                  placeholder="90"
                      placeholderTextColor="#9ca3af"
                  value={formData.about.chestCm}
                  onChangeText={(text) => handleInputChange('about.chestCm', text)}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                />
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Waist (cm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="75"
                  placeholderTextColor="#9ca3af"
                  value={formData.about.waistCm}
                  onChangeText={(text) => handleInputChange('about.waistCm', text)}
                  keyboardType="numeric"
                      editable={!isSubmitting}
                    />
                  </View>
                </View>
                
            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Hips (cm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="95"
                  placeholderTextColor="#9ca3af"
                  value={formData.about.hipsCm}
                  onChangeText={(text) => handleInputChange('about.hipsCm', text)}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                />
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Shoe Size (EU)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="42"
                  placeholderTextColor="#9ca3af"
                  value={formData.about.shoeSizeEu}
                  onChangeText={(text) => handleInputChange('about.shoeSizeEu', text)}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                />
              </View>
            </View>
          </>
        )}
        </CollapsibleSection>

        {/* Additional Information Section */}
        <CollapsibleSection
          id="other"
          title="Additional Information"
          isExpanded={expandedSections.has('other')}
          onToggle={() => toggleSection('other')}
          sectionRef={sectionRefs['other']}
        >
          {/* Professional Details - only show if user is talent */}
          {isTalent && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Professional Details</Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Reel/Portfolio URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/reel"
                  placeholderTextColor="#9ca3af"
                  value={formData.about.reelUrl}
                  onChangeText={(text) => handleInputChange('about.reelUrl', text)}
                  keyboardType="url"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.checkboxContainer}>
                    <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => handleInputChange('about.unionMember', !formData.about.unionMember)}
                      disabled={isSubmitting}
                    >
                    <Ionicons
                      name={formData.about.unionMember ? "checkbox" : "square-outline"}
                      size={20}
                      color={formData.about.unionMember ? "#8b5cf6" : "#9ca3af"}
                    />
                    <Text style={styles.checkboxLabel}>Union Member</Text>
                    </TouchableOpacity>
                </View>
              </View>

              {/* Dialects */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Dialects/Languages</Text>
                <View style={styles.skillInputContainer}>
                <TextInput
                    style={styles.skillInput}
                    placeholder="Add a dialect or language..."
                  placeholderTextColor="#9ca3af"
                    value={currentDialect}
                    onChangeText={setCurrentDialect}
                    onSubmitEditing={addDialect}
                  editable={!isSubmitting}
                />
                  <TouchableOpacity style={styles.addButton} onPress={addDialect} disabled={isSubmitting}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.skillsList}>
                  {formData.about.dialects.map((dialect, index) => (
                    <View key={index} style={styles.skillTag}>
                      <Text style={styles.skillText}>{dialect}</Text>
                      <TouchableOpacity onPress={() => removeDialect(dialect)} disabled={isSubmitting}>
                        <Ionicons name="close" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>

              {/* Willing to Travel */}
              <View style={styles.inputContainer}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => handleInputChange('about.willingToTravel', !formData.about.willingToTravel)}
                  disabled={isSubmitting}
                >
                  <View style={[styles.checkbox, formData.about.willingToTravel && styles.checkboxChecked]}>
                    {formData.about.willingToTravel && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>Willing to travel for work</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </CollapsibleSection>
      </ScrollView>

      <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
            <Text style={styles.submitButtonText}>Complete Profile</Text>
            )}
          </TouchableOpacity>
        </View>
    </View>
  );

  // If visible prop is provided, render as modal, otherwise render as page
  if (visible !== undefined) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        {content}
      </Modal>
    );
  }

  return content;
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
    padding: 16,
    paddingTop: 20,
  },
  closeButton: {
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
    padding: 16,
  },
  progressContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  profilePictureContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  profilePictureWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  profilePicture: {
    width: '100%',
    height: '100%',
  },
  profilePicturePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  profilePictureInitials: {
    fontSize: 36,
    fontWeight: '800',
    color: '#9ca3af',
  },
  profilePictureOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  profilePictureOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  multipleImagesContainer: {
    marginTop: 16,
    width: '100%',
  },
  multipleImagesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  multipleImagesScroll: {
    flexDirection: 'row',
  },
  multipleImageItem: {
    marginRight: 12,
    position: 'relative',
  },
  multipleImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  removeMultipleImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addMultipleImageButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addMultipleImageText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  profilePictureHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  // Cover Images Styles
  coverImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  coverImageItem: {
    position: 'relative',
    width: 150,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coverImageThumbnail: {
    width: '100%',
    height: '100%',
  },
  coverImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeCoverImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 18,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 20,
  },
  mainImageBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 20,
  },
  mainImageBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  setMainButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 20,
  },
  imageSelectionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  imageSelectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
    minHeight: 52,
  },
  imageSelectionButtonPrimary: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  imageSelectionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  imageSelectionButtonIcon: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageSelectionButtonIconSecondary: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  imageSelectionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  imageSelectionTextPrimary: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  imageSelectionTextSecondary: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  inputContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  collapsibleSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  collapsibleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  collapsibleContent: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputWrapper: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  skillInputContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  skillInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skillText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Dropdown styles
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    maxHeight: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemSelected: {
    backgroundColor: '#f0f9ff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#000',
  },
  dropdownItemTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Autocomplete styles
  autocompleteContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    maxHeight: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionIcon: {
    marginRight: 8,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  suggestionCategory: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  // Portfolio styles
  portfolioTypeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  portfolioTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  portfolioTypeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  portfolioTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  portfolioTypeButtonTextActive: {
    color: '#ffffff',
  },
  mediaButtonsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  mediaButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  mediaButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  addPortfolioButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  addPortfolioButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  addPortfolioButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  portfolioThumbnailContainer: {
    width: 100,
    position: 'relative',
  },
  portfolioThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  portfolioVideoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  portfolioThumbnailCaption: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  removePortfolioThumbnailButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    zIndex: 1,
  },
  portfolioList: {
    marginTop: 16,
  },
  portfolioListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  portfolioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  portfolioItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  portfolioItemType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  portfolioItemUrl: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  portfolioItemCaption: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  removePortfolioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePortfolioButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Social media links styles - Icon-only horizontal design
  socialMediaDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  platformIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  platformIconWrapper: {
    position: 'relative',
  },
  platformIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  platformIconButtonAdded: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  platformIconButtonEditing: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  platformIconBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  platformIconEditingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 280,
  },
  platformIconInputContainer: {
    flex: 1,
    gap: 6,
  },
  platformIconInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  platformIconInputActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  platformIconActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformIconSaveButton: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  platformIconDeleteButton: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  platformIconCancelButton: {
    backgroundColor: '#f3f4f6',
  },
  socialLinksSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  socialLinksSummaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  // Debug styles
  debugContainer: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
});

export default ProfileCompletionPage;