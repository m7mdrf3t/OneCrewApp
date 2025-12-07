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
import { useApi } from '../contexts/ApiContext';
import MediaPickerService, { MediaPickerResult } from '../services/MediaPickerService';
import DatePicker from '../components/DatePicker';

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

  const selectedOption = options.find(option => option.id === value);

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={[styles.dropdownButton, disabled && styles.dropdownButtonDisabled]}
        onPress={() => !disabled && setIsOpen(!isOpen)}
      >
        <Text style={[styles.dropdownButtonText, !selectedOption && styles.placeholderText]}>
          {selectedOption ? selectedOption.name : placeholder}
        </Text>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#6b7280" />
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.dropdownList}>
          <ScrollView style={{ maxHeight: 200 }}>
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
      )}
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
  user,
  onProfileUpdated,
  visible = true,
  onClose,
  initialSection,
}) => {
  const { api, updateProfile, isLoading, getSkinTones, getHairColors, getSkills, getAbilities, getLanguages, uploadFile, getAccessToken, getBaseUrl, getUserSocialLinks, addSocialLink, updateSocialLink, deleteSocialLink, getUserProfilePictures, uploadProfilePicture, setMainProfilePicture, deleteProfilePicture, user: currentUser, isAuthenticated, isGuest } = useApi();
  
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
  
  // Social media links state
  const [editingSocialLinkIndex, setEditingSocialLinkIndex] = useState<number | null>(null);
  const [newSocialLink, setNewSocialLink] = useState({
    platform: 'instagram' as 'instagram' | 'twitter' | 'facebook' | 'linkedin' | 'youtube' | 'tiktok' | 'website' | 'other',
    url: '',
    username: '',
  });
  
  // Portfolio state
  const [currentPortfolioUrl, setCurrentPortfolioUrl] = useState('');
  const [currentPortfolioCaption, setCurrentPortfolioCaption] = useState('');
  const [portfolioType, setPortfolioType] = useState<'image' | 'video' | 'audio'>('image');
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);
  
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
        }
      } catch (error) {
        console.error('Failed to load social links:', error);
        // Don't throw - just log, user can still add links
      }
    };

    if (visible && user?.id) {
      loadSocialLinks();
    }
  }, [visible, user?.id, getUserSocialLinks, isGuest, isAuthenticated]);

  // Load profile pictures from API
  useEffect(() => {
    const loadProfilePictures = async () => {
      const userIdToFetch = currentUser?.id || user?.id;
      if (!userIdToFetch || isGuest || !isAuthenticated) return;
      
      try {
        setLoadingProfilePictures(true);
        const response = await getUserProfilePictures(userIdToFetch);
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
          }
        }
      } catch (error) {
        console.error('Failed to load profile pictures:', error);
        // Don't throw - just log, user can still add pictures
      } finally {
        setLoadingProfilePictures(false);
      }
    };

    if (visible && (currentUser?.id || user?.id)) {
      loadProfilePictures();
    }
  }, [visible, currentUser?.id, user?.id, getUserProfilePictures, isGuest, isAuthenticated]);

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      
      // The user object is already the direct user data (not nested under 'data')
      const aboutData = user.about || {};
      
      // Check if user has separate user details (age, gender, nationality)
      const userDetails = user.userDetails || {};
      
      // Handle skills - they might be stored as IDs or names
      let userSkills = user.skills || user.user_skills || [];
      
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
      
      
      const newFormData = {
        bio: user.bio || '',
        skills: normalizedSkills,
        portfolio: user.portfolio || user.user_portfolios || [],
        socialLinks: [], // Will be loaded separately from API
        about: {
          gender: aboutData.gender || userDetails.gender || '',
          birthday: aboutData.birthday || userDetails.birthday || null,
          nationality: aboutData.nationality || userDetails.nationality || '',
          location: aboutData.location || aboutData.location_text || user.location_text || userDetails.location || userDetails.location_text || '',
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
        specialty: user.specialty || '',
        imageUrl: user.imageUrl || user.image_url || '',
      };
      
      
      setFormData(newFormData);
    }
  }, [user]);

  // Auto-expand section when initialSection is provided
  useEffect(() => {
    if (initialSection && visible) {
      setExpandedSections(prev => new Set(prev).add(initialSection));
      
      // Scroll to section after a brief delay to ensure it's rendered
      setTimeout(() => {
        const sectionRef = sectionRefs[initialSection];
        if (sectionRef?.current && scrollViewRef.current) {
          sectionRef.current.measureLayout(
            scrollViewRef.current as any,
            (x, y) => {
              scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
            },
            () => {
              // Fallback: try to scroll after a longer delay
              setTimeout(() => {
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
            }
          );
        }
      }, 300);
    }
  }, [initialSection, visible]);

  // Load reference data when component mounts
  useEffect(() => {
    const loadReferenceData = async () => {
      setLoadingReferences(true);
      try {
        
        const [skinTonesRes, hairColorsRes, skillsRes, abilitiesRes, languagesRes] = await Promise.all([
          getSkinTones(),
          getHairColors(),
          getSkills(),
          getAbilities(),
          getLanguages(),
        ]);

        setSkinTones(skinTonesRes.data || []);
        setHairColors(hairColorsRes.data || []);
        setAvailableSkills(skillsRes.data || []);
        setAbilities(abilitiesRes.data || []);
        setLanguages(languagesRes.data || []);
        
      } catch (error) {
        console.error('Error loading reference data:', error);
      } finally {
        setLoadingReferences(false);
      }
    };

    loadReferenceData();
  }, []);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.bio.trim()) {
      errors.bio = 'Bio is required';
    }

    if (!formData.specialty.trim()) {
      errors.specialty = 'Specialty is required';
    }

    if (!formData.about.gender) {
      errors.gender = 'Gender is required';
    }

    if (!formData.about.birthday) {
      errors.birthday = 'Date of birth is required';
    }

    if (!formData.about.nationality) {
      errors.nationality = 'Nationality is required';
    }

    if (!formData.about.location) {
      errors.location = 'Location is required';
    }

    // Validate image URL if provided
    if (formData.imageUrl && formData.imageUrl.trim()) {
      const urlPattern = /^https?:\/\/.+\..+/;
      if (!urlPattern.test(formData.imageUrl.trim())) {
        errors.imageUrl = 'Please enter a valid URL (must start with http:// or https://)';
      }
    }

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

  // Social media links management functions
  const handleAddSocialLink = async () => {
    if (!newSocialLink.url.trim()) {
      Alert.alert('Error', 'Please enter a URL for the social media link');
      return;
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/.+\..+/;
    if (!urlPattern.test(newSocialLink.url.trim())) {
      Alert.alert('Error', 'Please enter a valid URL (must start with http:// or https://)');
      return;
    }

    try {
      if (editingSocialLinkIndex !== null) {
        // Update existing link via API
        const linkToUpdate = formData.socialLinks[editingSocialLinkIndex];
        if (linkToUpdate.id) {
          await updateSocialLink(linkToUpdate.id, {
            platform: newSocialLink.platform,
            url: newSocialLink.url.trim(),
            is_custom: newSocialLink.platform === 'other',
          });
          
          // Update local state
          setFormData(prev => ({
            ...prev,
            socialLinks: prev.socialLinks.map((link, index) =>
              index === editingSocialLinkIndex
                ? { ...link, platform: newSocialLink.platform, url: newSocialLink.url.trim() }
                : link
            ),
          }));
          setEditingSocialLinkIndex(null);
          Alert.alert('Success', 'Social link updated successfully!');
        }
      } else {
        // Add new link via API
        const response = await addSocialLink({
          platform: newSocialLink.platform,
          url: newSocialLink.url.trim(),
          is_custom: newSocialLink.platform === 'other',
        });
        
        // Add to local state with the ID from response
        if (response.data) {
          setFormData(prev => ({
            ...prev,
            socialLinks: [...prev.socialLinks, {
              id: response.data.id,
              platform: newSocialLink.platform,
              url: newSocialLink.url.trim(),
              is_custom: newSocialLink.platform === 'other',
            }],
          }));
          Alert.alert('Success', 'Social link added successfully!');
        }
      }

      // Reset form
      setNewSocialLink({
        platform: 'instagram',
        url: '',
        username: '',
      });
    } catch (error: any) {
      console.error('Failed to save social link:', error);
      Alert.alert('Error', error.message || 'Failed to save social link. Please try again.');
    }
  };

  const handleEditSocialLink = (index: number) => {
    const link = formData.socialLinks[index];
    setNewSocialLink({
      platform: link.platform as any,
      url: link.url,
      username: link.username || '',
    });
    setEditingSocialLinkIndex(index);
  };

  const handleRemoveSocialLink = async (index: number) => {
    const link = formData.socialLinks[index];
    
    if (link.id) {
      // Delete from API
      try {
        await deleteSocialLink(link.id);
        // Remove from local state
        setFormData(prev => ({
          ...prev,
          socialLinks: prev.socialLinks.filter((_, i) => i !== index),
        }));
        if (editingSocialLinkIndex === index) {
          setEditingSocialLinkIndex(null);
          setNewSocialLink({
            platform: 'instagram',
            url: '',
            username: '',
          });
        }
        Alert.alert('Success', 'Social link removed successfully!');
      } catch (error: any) {
        console.error('Failed to delete social link:', error);
        Alert.alert('Error', error.message || 'Failed to delete social link. Please try again.');
      }
    } else {
      // If no ID, just remove from local state (newly added but not saved)
      setFormData(prev => ({
        ...prev,
        socialLinks: prev.socialLinks.filter((_, i) => i !== index),
      }));
    }
  };

  const cancelEditSocialLink = () => {
    setEditingSocialLinkIndex(null);
    setNewSocialLink({
      platform: 'instagram',
      url: '',
      username: '',
    });
  };

  // Portfolio management functions
  const addPortfolioItem = async () => {
    if (!currentPortfolioUrl.trim()) {
      Alert.alert('Error', 'Please enter a URL for the portfolio item');
      return;
    }

    setIsUploadingPortfolio(true);
    try {
      const newItem = {
        kind: portfolioType === 'audio' ? 'image' : portfolioType, // Convert audio to image for API compatibility
        url: currentPortfolioUrl.trim(),
        caption: currentPortfolioCaption.trim() || undefined,
        sort_order: formData.portfolio.length,
      };

      // Add to local state first
      setFormData(prev => ({
        ...prev,
        portfolio: [...prev.portfolio, newItem],
      }));

      // Only try to save to API if it's a proper URL (not a local file path)
      const isLocalFile = currentPortfolioUrl.startsWith('file://') || currentPortfolioUrl.startsWith('/');
      
      if (!isLocalFile) {
        try {
          await api.addPortfolioItem(newItem);
        } catch (apiError) {
        }
      } else {
      }

      // Clear form
      setCurrentPortfolioUrl('');
      setCurrentPortfolioCaption('');
      setPortfolioType('image');

      Alert.alert('Success', 'Portfolio item added successfully!');
    } catch (error: any) {
      console.error('Error adding portfolio item:', error);
      Alert.alert('Error', 'Failed to add portfolio item. Please try again.');
    } finally {
      setIsUploadingPortfolio(false);
    }
  };

  const removePortfolioItem = async (index: number) => {
    const item = formData.portfolio[index];
    if (!item) return;

    try {
      // Remove from local state
    setFormData(prev => ({
      ...prev,
        portfolio: prev.portfolio.filter((_, i) => i !== index),
      }));

      // Try to remove from API if item has an ID
      if ((item as any).id) {
        try {
          await api.removePortfolioItem((item as any).id);
        } catch (apiError) {
        }
      }

      Alert.alert('Success', 'Portfolio item removed successfully!');
    } catch (error: any) {
      console.error('Error removing portfolio item:', error);
      Alert.alert('Error', 'Failed to remove portfolio item. Please try again.');
    }
  };

  const pickPortfolioImage = async () => {
    try {
      const result = await mediaPicker.pickImage({
        allowsEditing: true,
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
      });

      if (result) {
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, 20)) {
          Alert.alert('File Too Large', 'Please select an image smaller than 20MB.');
          return;
        }

        // Upload the file to Supabase and get the URL
        setIsUploadingPortfolio(true);
        try {
          const uploadResult = await uploadFile({
            uri: result.uri,
            type: 'image/jpeg',
            name: result.fileName || `portfolio_image_${Date.now()}.jpg`,
          });

          if (uploadResult.data?.url) {
            setCurrentPortfolioUrl(uploadResult.data.url);
            setPortfolioType('image');
            Alert.alert('Success', 'Portfolio image uploaded! Add a caption and click "Add to Portfolio".');
          } else {
            throw new Error('Upload failed - no URL returned');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
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
        maxWidth: 1920,
        maxHeight: 1920,
      });

      if (result) {
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, 20)) {
          Alert.alert('File Too Large', 'Please take a photo smaller than 20MB.');
          return;
        }

        // Upload the file to Supabase and get the URL
        setIsUploadingPortfolio(true);
        try {
          const uploadResult = await uploadFile({
            uri: result.uri,
            type: 'image/jpeg',
            name: result.fileName || `portfolio_photo_${Date.now()}.jpg`,
          });

          if (uploadResult.data?.url) {
            setCurrentPortfolioUrl(uploadResult.data.url);
            setPortfolioType('image');
            Alert.alert('Success', 'Portfolio photo uploaded! Add a caption and click "Add to Portfolio".');
          } else {
            throw new Error('Upload failed - no URL returned');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
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
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, 100)) {
          Alert.alert('File Too Large', 'Please select a video smaller than 100MB.');
          return;
        }

        // Debug: Log the actual duration value
        
        // Handle duration validation - check if it's in seconds or milliseconds
        if (result.duration) {
          let durationInSeconds = result.duration;
          
          // If duration is larger than 100 (likely milliseconds), convert to seconds
          // Most video durations in seconds would be reasonable numbers, but milliseconds are typically much larger
          if (result.duration > 100) {
            durationInSeconds = result.duration / 1000;
          }
          
          if (durationInSeconds > 300) {
            Alert.alert('Video Too Long', 'Please select a video shorter than 5 minutes.');
            return;
          }
        }

        // Upload the file to Supabase and get the URL
        setIsUploadingPortfolio(true);
        try {
          const uploadResult = await uploadFile({
            uri: result.uri,
            type: 'video/mp4',
            name: result.fileName || `portfolio_video_${Date.now()}.mp4`,
          });

          if (uploadResult.data?.url) {
            setCurrentPortfolioUrl(uploadResult.data.url);
            setPortfolioType('video');
            Alert.alert('Success', 'Portfolio video uploaded! Add a caption and click "Add to Portfolio".');
          } else {
            throw new Error('Upload failed - no URL returned');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
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
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, 100)) {
          Alert.alert('File Too Large', 'Please record a video smaller than 100MB.');
          return;
        }

        // Debug: Log the actual duration value
        
        // Handle duration validation - check if it's in seconds or milliseconds
        if (result.duration) {
          let durationInSeconds = result.duration;
          
          // If duration is larger than 100 (likely milliseconds), convert to seconds
          // Most video durations in seconds would be reasonable numbers, but milliseconds are typically much larger
          if (result.duration > 100) {
            durationInSeconds = result.duration / 1000;
          }
          
          if (durationInSeconds > 300) {
            Alert.alert('Video Too Long', 'Please record a video shorter than 5 minutes.');
            return;
          }
        }

        // Upload the file to Supabase and get the URL
        setIsUploadingPortfolio(true);
        try {
          const uploadResult = await uploadFile({
            uri: result.uri,
            type: 'video/mp4',
            name: result.fileName || `portfolio_recorded_${Date.now()}.mp4`,
          });

          if (uploadResult.data?.url) {
            setCurrentPortfolioUrl(uploadResult.data.url);
            setPortfolioType('video');
            Alert.alert('Success', 'Portfolio video uploaded! Add a caption and click "Add to Portfolio".');
          } else {
            throw new Error('Upload failed - no URL returned');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
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

  // Image picker functions
  const pickImage = async () => {
    try {
      const result = await mediaPicker.pickImage({
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (result) {
        // Validate file size (max 10MB)
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, 10)) {
          Alert.alert('File Too Large', 'Please select an image smaller than 10MB.');
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
            name: result.fileName || `profile_picture_${Date.now()}.jpg`,
          };

          const uploadResult = await uploadProfilePicture(file, shouldBeMain);
          
          if (uploadResult.success) {
            // Reload profile pictures
            const response = await getUserProfilePictures(userId);
            if (response.success && response.data) {
              const pictures = Array.isArray(response.data) ? response.data : [];
              setProfilePictures(pictures);
              const mainPicture = pictures.find((p: any) => p.is_main);
              if (mainPicture) {
                handleInputChange('imageUrl', mainPicture.image_url);
              }
            }
            Alert.alert('Success', 'Profile picture uploaded and updated!');
          } else {
            throw new Error(uploadResult.error || 'Upload failed');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          Alert.alert('Upload Failed', uploadError.message || 'Failed to upload profile picture. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', error.message || 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await mediaPicker.takePhoto({
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (result) {
        // Validate file size (max 10MB)
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, 10)) {
          Alert.alert('File Too Large', 'Please take a photo smaller than 10MB.');
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

          const uploadResult = await uploadProfilePicture(file, shouldBeMain);
          
          if (uploadResult.success) {
            // Reload profile pictures
            const response = await getUserProfilePictures(userId);
            if (response.success && response.data) {
              const pictures = Array.isArray(response.data) ? response.data : [];
              setProfilePictures(pictures);
              const mainPicture = pictures.find((p: any) => p.is_main);
              if (mainPicture) {
                handleInputChange('imageUrl', mainPicture.image_url);
              }
            }
            Alert.alert('Success', 'Profile photo uploaded and updated!');
          } else {
            throw new Error(uploadResult.error || 'Upload failed');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
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
      const basicProfileData = {
        bio: formData.bio.trim(),
        specialty: formData.specialty.trim(),
        skills: formData.skills,
        imageUrl: formData.imageUrl.trim(), // This will be mapped to image_url in ApiContext
        location_text: formData.about.location.trim(), // Location stored in users table
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
        gender: genderMapping[formData.about.gender] || 'prefer_not_to_say',
        birthday: formData.about.birthday || null,
        nationality: formData.about.nationality,
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
        userDetailsResponse = await api.createUserDetails(userDetailsData);
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
            
            // Don't throw error - just log warning like updateProfile does
            // This allows the profile update to complete even if talent profile fails
            console.warn('⚠️ Continuing without talent profile update - user can update it later when their category is set to "talent"');
          } else {
            // For other errors, log but don't block the profile update
            console.warn('⚠️ Talent profile update failed, but continuing with other updates:', talentResult.error);
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

      Alert.alert(
        'Success',
        'Your profile has been updated successfully!',
        [{ text: 'OK', onPress: onClose || (() => navigation?.goBack()) }]
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
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Profile Completion: {completionPercentage}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
          </View>
        </View>

        {/* Basic Infos Section */}
        <CollapsibleSection
          id="basic-info"
          title="Basic Infos"
          isExpanded={expandedSections.has('basic-info')}
          onToggle={() => toggleSection('basic-info')}
          sectionRef={sectionRefs['basic-info']}
        >
          {/* Profile Picture Preview */}
          <View style={styles.profilePictureContainer}>
            <Text style={styles.sectionTitle}>Profile Picture</Text>
            <TouchableOpacity
              onPress={pickImage}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <View style={styles.profilePictureWrapper}>
                {formData.imageUrl ? (
                  <Image 
                    source={{ uri: formData.imageUrl }} 
                    style={styles.profilePicture}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.profilePicturePlaceholder}>
                    <Ionicons name="camera-outline" size={32} color="#9ca3af" />
                    <Text style={styles.profilePictureInitials}>
                      {getInitials(user?.name || 'User')}
                    </Text>
                  </View>
                )}
                <View style={styles.profilePictureOverlay}>
                  <Ionicons name="camera" size={24} color="#fff" />
                  <Text style={styles.profilePictureOverlayText}>Tap to upload</Text>
                </View>
              </View>
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
                        <Image source={{ uri: picture.image_url }} style={styles.coverImageThumbnail} resizeMode="cover" />
                        {picture.is_main && (
                          <View style={styles.mainImageBadge}>
                            <Ionicons name="star" size={16} color="#fff" />
                            <Text style={styles.mainImageBadgeText}>Main</Text>
                          </View>
                        )}
                        <View style={styles.coverImageActions}>
                          {!picture.is_main && (
                            <TouchableOpacity
                              style={styles.setMainButton}
                              onPress={async () => {
                                try {
                                  const userId = currentUser?.id || user?.id;
                                  if (!userId) return;
                                  await setMainProfilePicture(userId, picture.id);
                                  // Reload profile pictures
                                  const response = await getUserProfilePictures(userId);
                                  if (response.success && response.data) {
                                    const pictures = Array.isArray(response.data) ? response.data : [];
                                    setProfilePictures(pictures);
                                    const mainPicture = pictures.find((p: any) => p.is_main);
                                    if (mainPicture) {
                                      setFormData(prev => ({
                                        ...prev,
                                        imageUrl: mainPicture.image_url,
                                      }));
                                    }
                                  }
                                  Alert.alert('Success', 'Main profile picture updated!');
                                } catch (error: any) {
                                  console.error('Failed to set main picture:', error);
                                  Alert.alert('Error', error.message || 'Failed to set main picture.');
                                }
                              }}
                              disabled={isSubmitting}
                            >
                              <Ionicons name="star-outline" size={16} color="#3b82f6" />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.removeCoverImageButton}
                            onPress={async () => {
                              try {
                                const userId = currentUser?.id || user?.id;
                                if (!userId) return;
                                await deleteProfilePicture(userId, picture.id);
                                // Reload profile pictures
                                const response = await getUserProfilePictures(userId);
                                if (response.success && response.data) {
                                  const pictures = Array.isArray(response.data) ? response.data : [];
                                  setProfilePictures(pictures);
                                  const mainPicture = pictures.find((p: any) => p.is_main);
                                  if (mainPicture) {
                                    setFormData(prev => ({
                                      ...prev,
                                      imageUrl: mainPicture.image_url,
                                    }));
                                  } else {
                                    setFormData(prev => ({
                                      ...prev,
                                      imageUrl: '',
                                    }));
                                  }
                                }
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
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Add Cover Image Buttons */}
                <View style={styles.imageSelectionContainer}>
                  <TouchableOpacity
                    style={styles.imageSelectionButton}
                    onPress={async () => {
                      try {
                        const result = await mediaPicker.pickImage({
                          allowsEditing: true,
                          quality: 0.8,
                          maxWidth: 1920,
                          maxHeight: 1080,
                        });

                        if (result) {
                          if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, 20)) {
                            Alert.alert('File Too Large', 'Please select an image smaller than 20MB.');
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

                            const uploadResult = await uploadProfilePicture(file, isFirstPicture);
                            
                            if (uploadResult.success) {
                              // Reload profile pictures
                              const response = await getUserProfilePictures(userId);
                              if (response.success && response.data) {
                                const pictures = Array.isArray(response.data) ? response.data : [];
                                setProfilePictures(pictures);
                                const mainPicture = pictures.find((p: any) => p.is_main);
                                if (mainPicture) {
                                  setFormData(prev => ({
                                    ...prev,
                                    imageUrl: mainPicture.image_url,
                                  }));
                                }
                              }
                              Alert.alert('Success', 'Cover image uploaded!');
                            } else {
                              throw new Error(uploadResult.error || 'Upload failed');
                            }
                          } catch (uploadError: any) {
                            console.error('Upload error:', uploadError);
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
                    <Ionicons name="image-outline" size={20} color="#3b82f6" />
                    <Text style={styles.imageSelectionText}>Add from Gallery</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.imageSelectionButton}
                    onPress={async () => {
                      try {
                        const result = await mediaPicker.takePhoto({
                          allowsEditing: true,
                          quality: 0.8,
                          maxWidth: 1920,
                          maxHeight: 1080,
                        });

                        if (result) {
                          if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, 20)) {
                            Alert.alert('File Too Large', 'Please take a photo smaller than 20MB.');
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

                            const uploadResult = await uploadProfilePicture(file, isFirstPicture);
                            
                            if (uploadResult.success) {
                              // Reload profile pictures
                              const response = await getUserProfilePictures(userId);
                              if (response.success && response.data) {
                                const pictures = Array.isArray(response.data) ? response.data : [];
                                setProfilePictures(pictures);
                                const mainPicture = pictures.find((p: any) => p.is_main);
                                if (mainPicture) {
                                  setFormData(prev => ({
                                    ...prev,
                                    imageUrl: mainPicture.image_url,
                                  }));
                                }
                              }
                              Alert.alert('Success', 'Cover photo uploaded!');
                            } else {
                              throw new Error(uploadResult.error || 'Upload failed');
                            }
                          } catch (uploadError: any) {
                            console.error('Upload error:', uploadError);
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
                    <Ionicons name="camera-outline" size={20} color="#3b82f6" />
                    <Text style={styles.imageSelectionText}>Take Photo</Text>
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
            <Text style={styles.label}>Specialty *</Text>
              <TextInput
              style={[styles.input, formErrors.specialty && styles.inputError]}
              placeholder="e.g., Character Actor, Voice Actor, etc."
                placeholderTextColor="#9ca3af"
              value={formData.specialty}
              onChangeText={(text) => handleInputChange('specialty', text)}
                editable={!isSubmitting}
              />
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

        {/* Portfolio and Video Section */}
        <CollapsibleSection
          id="portfolio"
          title="Portfolio and Video"
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
            onPress={() => {
              setPortfolioType('audio');
              Alert.alert('Coming Soon', 'Audio upload will be available soon!');
            }}
            disabled={isSubmitting || isUploadingPortfolio}
          >
            <Text style={[styles.portfolioTypeButtonText, portfolioType === 'audio' && styles.portfolioTypeButtonTextActive]}>
              🎵 Audio
            </Text>
          </TouchableOpacity>
        </View>
          
        {/* Portfolio URL Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Portfolio URL (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder={`Enter ${portfolioType} URL manually or use buttons above to upload`}
            value={currentPortfolioUrl}
            onChangeText={setCurrentPortfolioUrl}
            multiline
            editable={!isSubmitting}
          />
        </View>

        {/* Portfolio Caption Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Caption (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Add a caption for this portfolio item"
            value={currentPortfolioCaption}
            onChangeText={setCurrentPortfolioCaption}
            multiline
            editable={!isSubmitting}
          />
        </View>

        {/* Add Portfolio Item Button */}
              <TouchableOpacity
          style={[styles.addPortfolioButton, isUploadingPortfolio && styles.addPortfolioButtonDisabled]}
          onPress={addPortfolioItem}
          disabled={isUploadingPortfolio || isSubmitting}
        >
          <Text style={styles.addPortfolioButtonText}>
            {isUploadingPortfolio ? 'Adding...' : 'Add to Portfolio'}
          </Text>
              </TouchableOpacity>
              
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

        {/* Platform Selection */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Platform</Text>
          <CustomDropdown
            options={[
              { id: 'instagram', name: '📷 Instagram' },
              { id: 'twitter', name: '🐦 Twitter' },
              { id: 'facebook', name: '📘 Facebook' },
              { id: 'linkedin', name: '💼 LinkedIn' },
              { id: 'youtube', name: '📺 YouTube' },
              { id: 'tiktok', name: '🎵 TikTok' },
              { id: 'website', name: '🌐 Website' },
              { id: 'other', name: '🔗 Other' },
            ]}
            value={newSocialLink.platform}
            onValueChange={(value: string) => setNewSocialLink(prev => ({ ...prev, platform: value as any }))}
            placeholder="Select platform"
            disabled={isSubmitting}
          />
        </View>

        {/* URL Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>URL *</Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com/profile"
            placeholderTextColor="#9ca3af"
            value={newSocialLink.url}
            onChangeText={(text) => setNewSocialLink(prev => ({ ...prev, url: text }))}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
          />
        </View>

        {/* Username Input (Optional) */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="@username"
            placeholderTextColor="#9ca3af"
            value={newSocialLink.username}
            onChangeText={(text) => setNewSocialLink(prev => ({ ...prev, username: text }))}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
          />
        </View>

        {/* Add/Update Button */}
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.addSocialLinkButton, isSubmitting && styles.addSocialLinkButtonDisabled]}
            onPress={handleAddSocialLink}
            disabled={isSubmitting}
          >
            <Ionicons 
              name={editingSocialLinkIndex !== null ? "checkmark" : "add"} 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.addSocialLinkButtonText}>
              {editingSocialLinkIndex !== null ? 'Update Link' : 'Add Link'}
            </Text>
          </TouchableOpacity>
          
          {editingSocialLinkIndex !== null && (
            <TouchableOpacity
              style={[styles.cancelSocialLinkButton, isSubmitting && styles.cancelSocialLinkButtonDisabled]}
              onPress={cancelEditSocialLink}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelSocialLinkButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Social Links List */}
        {formData.socialLinks.length > 0 && (
          <View style={styles.socialLinksList}>
            <Text style={styles.socialLinksListTitle}>
              Your Social Links ({formData.socialLinks.length})
            </Text>
            {formData.socialLinks.map((link, index) => (
              <View key={index} style={styles.socialLinkItem}>
                <View style={styles.socialLinkItemInfo}>
                  <Text style={styles.socialLinkItemPlatform}>
                    {link.platform === 'instagram' ? '📷 Instagram' :
                     link.platform === 'twitter' ? '🐦 Twitter' :
                     link.platform === 'facebook' ? '📘 Facebook' :
                     link.platform === 'linkedin' ? '💼 LinkedIn' :
                     link.platform === 'youtube' ? '📺 YouTube' :
                     link.platform === 'tiktok' ? '🎵 TikTok' :
                     link.platform === 'website' ? '🌐 Website' : '🔗 Other'}
                  </Text>
                  <Text style={styles.socialLinkItemUrl} numberOfLines={1}>
                    {link.url}
                  </Text>
                  {link.username && (
                    <Text style={styles.socialLinkItemUsername} numberOfLines={1}>
                      @{link.username}
                    </Text>
                  )}
                </View>
                <View style={styles.socialLinkItemActions}>
                  <TouchableOpacity
                    style={styles.editSocialLinkButton}
                    onPress={() => handleEditSocialLink(index)}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="create-outline" size={18} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeSocialLinkButton}
                    onPress={() => handleRemoveSocialLink(index)}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        </CollapsibleSection>

        {/* Details Info Section */}
        <CollapsibleSection
          id="details-info"
          title="Details Info"
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
            <Text style={styles.label}>Gender *</Text>
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
              label="Date of Birth *"
              value={formData.about.birthday}
              onChange={(date) => handleInputChange('about.birthday', date)}
              placeholder="Select your birthday"
              mode="date"
              maximumDate={new Date()} // Can't be in the future
              minimumDate={new Date(1900, 0, 1)} // Reasonable minimum date
              disabled={isSubmitting}
              required={true}
              error={formErrors.birthday}
              style={{ marginBottom: 0 }}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Nationality *</Text>
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
            <Text style={styles.label}>Location *</Text>
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

        {/* The Rest Section */}
        <CollapsibleSection
          id="other"
          title="The Rest"
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

          {/* Image URL */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Profile Image URL</Text>
            <TextInput
              style={[styles.input, formErrors.imageUrl && styles.inputError]}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor="#9ca3af"
              value={formData.imageUrl}
              onChangeText={(text) => handleInputChange('imageUrl', text)}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
            {formErrors.imageUrl && <Text style={styles.fieldError}>{formErrors.imageUrl}</Text>}
            <Text style={styles.helpText}>
              Enter a valid image URL (JPG, PNG, or GIF format recommended)
            </Text>
          </View>
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
    gap: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  coverImageItem: {
    position: 'relative',
    width: 120,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  coverImageThumbnail: {
    width: '100%',
    height: '100%',
  },
  removeCoverImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    zIndex: 1,
  },
  mainImageBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  mainImageBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  coverImageActions: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    gap: 4,
    zIndex: 1,
  },
  setMainButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
  },
  imageSelectionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  imageSelectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    gap: 8,
  },
  imageSelectionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
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
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1001,
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
  // Social media links styles
  addSocialLinkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    gap: 8,
  },
  addSocialLinkButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  addSocialLinkButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelSocialLinkButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelSocialLinkButtonDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  cancelSocialLinkButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  socialLinksList: {
    marginTop: 16,
  },
  socialLinksListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  socialLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  socialLinkItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  socialLinkItemPlatform: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  socialLinkItemUrl: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  socialLinkItemUsername: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  socialLinkItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editSocialLinkButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
  },
  removeSocialLinkButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
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