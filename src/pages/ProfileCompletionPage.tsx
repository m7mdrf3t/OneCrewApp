import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import MediaPickerService, { MediaPickerResult } from '../services/MediaPickerService';

// Helper function to get initials
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

interface ProfileFormData {
  bio: string;
  skills: string[];
  portfolio: Array<{
    kind: 'image' | 'video';
    url: string;
    caption?: string;
    sort_order?: number;
  }>;
  socialLinks: Array<{
    platform: 'instagram' | 'twitter' | 'facebook' | 'linkedin' | 'youtube' | 'tiktok' | 'website' | 'other';
    url: string;
    username?: string;
  }>;
  about: {
    gender: string;
    age: string;
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
  onProfileUpdated?: () => void;
}

const ProfileCompletionPage: React.FC<ProfileCompletionPageProps> = ({
  navigation,
  user,
  onProfileUpdated,
}) => {
  const { api, updateProfile, isLoading, getSkinTones, getHairColors, getSkills, getAbilities, getLanguages } = useApi();
  const mediaPicker = MediaPickerService.getInstance();
  const [formData, setFormData] = useState<ProfileFormData>({
    bio: '',
    skills: [],
    portfolio: [],
    socialLinks: [],
    about: {
      gender: '',
      age: '',
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
  const [currentSkill, setCurrentSkill] = useState('');
  const [currentDialect, setCurrentDialect] = useState('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Portfolio and social media state
  const [currentPortfolioUrl, setCurrentPortfolioUrl] = useState('');
  const [portfolioType, setPortfolioType] = useState<'image' | 'video'>('image');
  const [currentSocialPlatform, setCurrentSocialPlatform] = useState('');
  const [currentSocialUrl, setCurrentSocialUrl] = useState('');
  const [currentSocialUsername, setCurrentSocialUsername] = useState('');
  
  // Portfolio and social media state
  const [portfolio, setPortfolio] = useState<Array<{
    kind: 'image' | 'video';
    url: string;
    caption?: string;
    sort_order?: number;
  }>>([]);
  const [socialLinks, setSocialLinks] = useState<Array<{
    platform: 'instagram' | 'twitter' | 'facebook' | 'linkedin' | 'youtube' | 'tiktok' | 'website' | 'other';
    url: string;
    username?: string;
  }>>([]);
  
  // Reference data state
  const [skinTones, setSkinTones] = useState<Array<{id: string, name: string}>>([]);
  const [hairColors, setHairColors] = useState<Array<{id: string, name: string}>>([]);
  const [availableSkills, setAvailableSkills] = useState<Array<{id: string, name: string}>>([]);
  const [abilities, setAbilities] = useState<Array<{id: string, name: string}>>([]);
  const [languages, setLanguages] = useState<Array<{id: string, name: string}>>([]);
  const [loadingReferences, setLoadingReferences] = useState(false);

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      console.log('🔄 Initializing form data with user:', user);
      setFormData({
        bio: user.bio || '',
        skills: user.skills || [],
        portfolio: user.portfolio || [],
        socialLinks: user.social_links || [],
        about: {
          gender: user.about?.gender || '',
          age: user.about?.age?.toString() || '',
          nationality: user.about?.nationality || '',
          location: user.about?.location || '',
          height: user.about?.height_cm?.toString() || '',
          weight: user.about?.weight_kg?.toString() || '',
          skinTone: user.about?.skin_tone_id || user.about?.skin_tone || '',
          hairColor: user.about?.hair_color_id || user.about?.hair_color || '',
          eyeColor: user.about?.eye_color || '',
          chestCm: user.about?.chest_cm?.toString() || '',
          waistCm: user.about?.waist_cm?.toString() || '',
          hipsCm: user.about?.hips_cm?.toString() || '',
          shoeSizeEu: user.about?.shoe_size_eu?.toString() || '',
          reelUrl: user.about?.reel_url || '',
          unionMember: user.about?.union_member || false,
          dialects: user.about?.dialects || [],
          willingToTravel: user.about?.travel_ready || false,
        },
        specialty: user.specialty || '',
        imageUrl: user.imageUrl || user.image_url || '',
      });
    }
  }, [user]);

  // Load reference data when component mounts
  useEffect(() => {
    const loadReferenceData = async () => {
      setLoadingReferences(true);
      try {
        console.log('🔄 Loading reference data...');
        
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
        
        console.log('🔍 Reference data loaded:', {
          skinTones: skinTonesRes.data?.length || 0,
          hairColors: hairColorsRes.data?.length || 0,
          skills: skillsRes.data?.length || 0,
          abilities: abilitiesRes.data?.length || 0,
          languages: languagesRes.data?.length || 0,
        });
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

    if (!formData.about.gender) {
      errors.gender = 'Gender is required';
    }

    if (!formData.about.age) {
      errors.age = 'Age is required';
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

    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
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

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove),
    }));
  };

  // Portfolio handlers
  const addPortfolioItem = () => {
    if (currentPortfolioUrl.trim()) {
      const newItem = {
        kind: portfolioType,
        url: currentPortfolioUrl.trim(),
        caption: '',
        sort_order: portfolio.length,
      };
      setPortfolio(prev => [...prev, newItem]);
      setFormData(prev => ({
        ...prev,
        portfolio: [...prev.portfolio, newItem],
      }));
      setCurrentPortfolioUrl('');
    }
  };

  const removePortfolioItem = (index: number) => {
    setPortfolio(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      portfolio: prev.portfolio.filter((_, i) => i !== index),
    }));
  };

  // Social media handlers
  const addSocialLink = () => {
    if (currentSocialPlatform && currentSocialUrl.trim()) {
      const newLink = {
        platform: currentSocialPlatform as any,
        url: currentSocialUrl.trim(),
        username: currentSocialUsername.trim() || undefined,
      };
      setSocialLinks(prev => [...prev, newLink]);
      setFormData(prev => ({
        ...prev,
        socialLinks: [...prev.socialLinks, newLink],
      }));
      setCurrentSocialPlatform('');
      setCurrentSocialUrl('');
      setCurrentSocialUsername('');
    }
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }));
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

        handleInputChange('imageUrl', result.uri);
        Alert.alert('Success', 'Image selected successfully!');
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

        handleInputChange('imageUrl', result.uri);
        Alert.alert('Success', 'Photo taken successfully!');
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', error.message || 'Failed to take photo. Please try again.');
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
        // Validate file size (max 20MB for portfolio)
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, 20)) {
          Alert.alert('File Too Large', 'Please select an image smaller than 20MB.');
          return;
        }

        setCurrentPortfolioUrl(result.uri);
        setPortfolioType('image');
        Alert.alert('Success', 'Portfolio image selected! Click "Add to Portfolio" to include it.');
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
        // Validate file size (max 20MB for portfolio)
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, 20)) {
          Alert.alert('File Too Large', 'Please take a photo smaller than 20MB.');
          return;
        }

        setCurrentPortfolioUrl(result.uri);
        setPortfolioType('image');
        Alert.alert('Success', 'Portfolio photo taken! Click "Add to Portfolio" to include it.');
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
        // Validate file size (max 100MB for videos)
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, 100)) {
          Alert.alert('File Too Large', 'Please select a video smaller than 100MB.');
          return;
        }

        // Validate duration (max 5 minutes)
        if (result.duration && result.duration > 300) {
          Alert.alert('Video Too Long', 'Please select a video shorter than 5 minutes.');
          return;
        }

        setCurrentPortfolioUrl(result.uri);
        setPortfolioType('video');
        Alert.alert('Success', 'Portfolio video selected! Click "Add to Portfolio" to include it.');
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
        // Validate file size (max 100MB for videos)
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, 100)) {
          Alert.alert('File Too Large', 'Please record a video smaller than 100MB.');
          return;
        }

        // Validate duration (max 5 minutes)
        if (result.duration && result.duration > 300) {
          Alert.alert('Video Too Long', 'Please record a video shorter than 5 minutes.');
          return;
        }

        setCurrentPortfolioUrl(result.uri);
        setPortfolioType('video');
        Alert.alert('Success', 'Portfolio video recorded! Click "Add to Portfolio" to include it.');
      }
    } catch (error: any) {
      console.error('Error recording portfolio video:', error);
      Alert.alert('Error', error.message || 'Failed to record portfolio video. Please try again.');
    }
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

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      console.log('🔄 Starting profile update...');
      
      const basicProfileData = {
        bio: formData.bio.trim(),
        specialty: formData.specialty.trim(),
        skills: formData.skills,
        imageUrl: formData.imageUrl.trim(),
      };

      const userDetailsData = {
        gender: formData.about.gender as any,
        age: Number(formData.about.age),
        nationality: formData.about.nationality,
      };

      const talentProfileData = {
        location: formData.about.location,
        height_cm: formData.about.height ? Number(formData.about.height) : null,
        weight_kg: formData.about.weight ? Number(formData.about.weight) : null,
        skin_tone_id: formData.about.skinTone || null,
        hair_color_id: formData.about.hairColor || null,
        eye_color: formData.about.eyeColor || null,
        chest_cm: formData.about.chestCm ? Number(formData.about.chestCm) : null,
        waist_cm: formData.about.waistCm ? Number(formData.about.waistCm) : null,
        hips_cm: formData.about.hipsCm ? Number(formData.about.hipsCm) : null,
        shoe_size_eu: formData.about.shoeSizeEu ? Number(formData.about.shoeSizeEu) : null,
        reel_url: formData.about.reelUrl || null,
        union_member: formData.about.unionMember,
        dialects: formData.about.dialects,
        travel_ready: formData.about.willingToTravel,
      };

      console.log('🔍 Profile data prepared:', {
        basic: basicProfileData,
        userDetails: userDetailsData,
        talentProfile: talentProfileData,
      });

      const result = await updateProfile({
        ...basicProfileData,
        userDetails: userDetailsData,
        talentProfile: talentProfileData,
      });
      
      if (result.success) {
        console.log('✅ Profile updated successfully');
        Alert.alert('Success', 'Profile updated successfully!', [
          {
            text: 'OK',
            onPress: () => {
              onProfileUpdated?.();
              navigation.goBack();
            }
          }
        ]);
      } else {
        console.error('❌ Profile update failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('❌ Profile update error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateCompletionPercentage = () => {
    const fields = [
      formData.bio,
      formData.specialty,
      formData.skills.length > 0,
      formData.about.gender,
      formData.about.age,
      formData.about.nationality,
      formData.about.location,
    ];
    
    const completedFields = fields.filter(Boolean).length;
    return Math.round((completedFields / fields.length) * 100);
  };

  const completionPercentage = calculateCompletionPercentage();

  if (loadingReferences) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading profile data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Complete Your Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>{completionPercentage}% Complete</Text>
        </View>

        {/* Profile Picture */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Profile Picture</Text>
          <View style={styles.profilePictureContainer}>
            {formData.imageUrl ? (
              <Image 
                source={{ uri: formData.imageUrl }} 
                style={styles.profilePicture}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Text style={styles.profilePictureInitials}>
                  {getInitials(user?.name || 'User')}
                </Text>
              </View>
            )}
          </View>
          
          {/* Image Selection Buttons for Profile Picture */}
          <View style={styles.profileImageButtons}>
            <TouchableOpacity
              style={styles.profileImageButton}
              onPress={pickImage}
              disabled={isSubmitting}
            >
              <Ionicons name="camera-outline" size={16} color="#3b82f6" />
              <Text style={styles.profileImageButtonText}>Choose Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.profileImageButton}
              onPress={takePhoto}
              disabled={isSubmitting}
            >
              <Ionicons name="camera" size={16} color="#10b981" />
              <Text style={styles.profileImageButtonText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Or enter image URL..."
            placeholderTextColor="#9ca3af"
            value={formData.imageUrl}
            onChangeText={(text) => handleInputChange('imageUrl', text)}
            editable={!isSubmitting}
          />
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

        {/* Skills */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Skills *</Text>
          <View style={styles.skillInputContainer}>
            <TextInput
              style={[styles.input, styles.skillInput]}
              placeholder="Add a skill..."
              placeholderTextColor="#9ca3af"
              value={currentSkill}
              onChangeText={setCurrentSkill}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={[styles.addButton, !currentSkill.trim() && styles.addButtonDisabled]}
              onPress={addSkill}
              disabled={!currentSkill.trim() || isSubmitting}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
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

        {/* Portfolio Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Portfolio</Text>
          <Text style={styles.sectionSubtitle}>Add images and videos to showcase your work</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Portfolio Items</Text>
          {portfolio.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No portfolio items yet</Text>
              <Text style={styles.emptyStateSubtext}>Add images and videos to showcase your work</Text>
            </View>
          ) : (
            <View style={styles.portfolioGrid}>
              {portfolio.map((item, index) => (
                <View key={index} style={styles.portfolioItem}>
                  <View style={styles.portfolioItemHeader}>
                    <Text style={styles.portfolioItemType}>
                      {item.kind === 'image' ? '📷 Image' : '🎥 Video'}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => removePortfolioItem(index)}
                      disabled={isSubmitting}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Show media preview */}
                  {item.url ? (
                    item.kind === 'image' ? (
                      <Image 
                        source={{ uri: item.url }} 
                        style={styles.portfolioItemImagePreview}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.portfolioItemVideoPreview}>
                        <Ionicons name="play-circle" size={32} color="#fff" />
                        <Text style={styles.portfolioItemVideoText}>Video</Text>
                      </View>
                    )
                  ) : (
                    <Text style={styles.portfolioItemUrl} numberOfLines={1}>
                      {item.url}
                    </Text>
                  )}
                  
                  {item.caption && (
                    <Text style={styles.portfolioItemCaption} numberOfLines={2}>
                      {item.caption}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.addPortfolioContainer}>
            {/* Image/Video URL Input */}
            <TextInput
              style={[styles.input, { marginBottom: 8 }]}
              placeholder="Add image or video URL..."
              placeholderTextColor="#9ca3af"
              value={currentPortfolioUrl}
              onChangeText={setCurrentPortfolioUrl}
              editable={!isSubmitting}
            />
            
            {/* Media Selection Buttons */}
            <View style={styles.imageSelectionContainer}>
              <TouchableOpacity
                style={styles.imageSelectionButton}
                onPress={pickPortfolioImage}
                disabled={isSubmitting}
              >
                <Ionicons name="images-outline" size={20} color="#3b82f6" />
                <Text style={styles.imageSelectionText}>Choose Image</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.imageSelectionButton}
                onPress={takePortfolioPhoto}
                disabled={isSubmitting}
              >
                <Ionicons name="camera" size={20} color="#10b981" />
                <Text style={styles.imageSelectionText}>Take Photo</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.imageSelectionContainer}>
              <TouchableOpacity
                style={styles.imageSelectionButton}
                onPress={pickPortfolioVideo}
                disabled={isSubmitting}
              >
                <Ionicons name="videocam-outline" size={20} color="#8b5cf6" />
                <Text style={styles.imageSelectionText}>Choose Video</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.imageSelectionButton}
                onPress={recordPortfolioVideo}
                disabled={isSubmitting}
              >
                <Ionicons name="videocam" size={20} color="#f59e0b" />
                <Text style={styles.imageSelectionText}>Record Video</Text>
              </TouchableOpacity>
            </View>

            {/* Type Selection */}
            <View style={styles.portfolioTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.portfolioTypeButton,
                  portfolioType === 'image' && styles.portfolioTypeButtonActive
                ]}
                onPress={() => setPortfolioType('image')}
                disabled={isSubmitting}
              >
                <Text style={[
                  styles.portfolioTypeText,
                  portfolioType === 'image' && styles.portfolioTypeTextActive
                ]}>
                  📷 Image
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.portfolioTypeButton,
                  portfolioType === 'video' && styles.portfolioTypeButtonActive
                ]}
                onPress={() => setPortfolioType('video')}
                disabled={isSubmitting}
              >
                <Text style={[
                  styles.portfolioTypeText,
                  portfolioType === 'video' && styles.portfolioTypeTextActive
                ]}>
                  🎥 Video
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.addButtonNew, !currentPortfolioUrl.trim() && styles.addButtonDisabled]}
              onPress={addPortfolioItem}
              disabled={!currentPortfolioUrl.trim() || isSubmitting}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add to Portfolio</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Social Media Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Social Media & Links</Text>
          <Text style={styles.sectionSubtitle}>Add your social media profiles and website</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Social Media Links</Text>
          {socialLinks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="link-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No social media links yet</Text>
              <Text style={styles.emptyStateSubtext}>Add your social media profiles and website</Text>
            </View>
          ) : (
            <View style={styles.socialLinksList}>
              {socialLinks.map((link, index) => (
                <View key={index} style={styles.socialLinkItem}>
                  <View style={styles.socialLinkHeader}>
                    <Text style={styles.socialLinkPlatform}>
                      {link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => removeSocialLink(index)}
                      disabled={isSubmitting}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.socialLinkUrl} numberOfLines={1}>{link.url}</Text>
                  {link.username && (
                    <Text style={styles.socialLinkUsername}>@{link.username}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.addSocialLinkContainer}>
            <View style={styles.socialLinkInputRow}>
              <View style={styles.socialPlatformContainer}>
                <Text style={styles.socialPlatformLabel}>Platform</Text>
                <View style={styles.socialPlatformDropdown}>
                  <Text style={styles.socialPlatformText}>
                    {currentSocialPlatform || 'Select Platform'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#6b7280" />
                </View>
              </View>
              
              <View style={styles.socialUrlContainer}>
                <Text style={styles.socialUrlLabel}>URL</Text>
                <TextInput
                  style={styles.socialUrlInput}
                  placeholder="https://..."
                  placeholderTextColor="#9ca3af"
                  value={currentSocialUrl}
                  onChangeText={setCurrentSocialUrl}
                  editable={!isSubmitting}
                />
              </View>
            </View>
            
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Username (optional)"
              placeholderTextColor="#9ca3af"
              value={currentSocialUsername}
              onChangeText={setCurrentSocialUsername}
              editable={!isSubmitting}
            />
            
            <TouchableOpacity
              style={[styles.addButtonNew, (!currentSocialPlatform || !currentSocialUrl.trim()) && styles.addButtonDisabled]}
              onPress={addSocialLink}
              disabled={!currentSocialPlatform || !currentSocialUrl.trim() || isSubmitting}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Social Link</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Text style={styles.sectionSubtitle}>Tell us more about yourself</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Gender *</Text>
          <View style={styles.genderContainer}>
            {['male', 'female', 'non_binary', 'other', 'prefer_not_to_say'].map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.genderOption,
                  formData.about.gender === gender && styles.genderOptionSelected
                ]}
                onPress={() => handleInputChange('about.gender', gender)}
                disabled={isSubmitting}
              >
                <Text style={[
                  styles.genderOptionText,
                  formData.about.gender === gender && styles.genderOptionTextSelected
                ]}>
                  {gender.charAt(0).toUpperCase() + gender.slice(1).replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {formErrors.gender && <Text style={styles.fieldError}>{formErrors.gender}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Age *</Text>
          <TextInput
            style={[styles.input, formErrors.age && styles.inputError]}
            placeholder="Enter your age"
            placeholderTextColor="#9ca3af"
            value={formData.about.age}
            onChangeText={(text) => handleInputChange('about.age', text)}
            keyboardType="numeric"
            editable={!isSubmitting}
          />
          {formErrors.age && <Text style={styles.fieldError}>{formErrors.age}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nationality *</Text>
          <TextInput
            style={[styles.input, formErrors.nationality && styles.inputError]}
            placeholder="Enter your nationality"
            placeholderTextColor="#9ca3af"
            value={formData.about.nationality}
            onChangeText={(text) => handleInputChange('about.nationality', text)}
            editable={!isSubmitting}
          />
          {formErrors.nationality && <Text style={styles.fieldError}>{formErrors.nationality}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={[styles.input, formErrors.location && styles.inputError]}
            placeholder="Enter your location"
            placeholderTextColor="#9ca3af"
            value={formData.about.location}
            onChangeText={(text) => handleInputChange('about.location', text)}
            editable={!isSubmitting}
          />
          {formErrors.location && <Text style={styles.fieldError}>{formErrors.location}</Text>}
        </View>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Save Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressContainer: {
    marginVertical: 20,
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
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureInitials: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6b7280',
  },
  profileImageButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  profileImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  profileImageButtonText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 6,
    fontWeight: '500',
  },
  skillInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  skillInput: {
    flex: 1,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  skillText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  portfolioItem: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  portfolioItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  portfolioItemType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  portfolioItemUrl: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  portfolioItemCaption: {
    fontSize: 11,
    color: '#6b7280',
  },
  portfolioItemImagePreview: {
    width: '100%',
    height: 80,
    borderRadius: 4,
    marginBottom: 8,
  },
  portfolioItemVideoPreview: {
    width: '100%',
    height: 80,
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioItemVideoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  addPortfolioContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  imageSelectionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
  },
  imageSelectionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  portfolioTypeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  portfolioTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  portfolioTypeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  portfolioTypeText: {
    fontSize: 14,
    color: '#374151',
  },
  portfolioTypeTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  addButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  socialLinksList: {
    gap: 12,
    marginBottom: 16,
  },
  socialLinkItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  socialLinkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  socialLinkPlatform: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  socialLinkUrl: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  socialLinkUsername: {
    fontSize: 11,
    color: '#9ca3af',
  },
  addSocialLinkContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  socialLinkInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  socialPlatformContainer: {
    flex: 1,
  },
  socialPlatformLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  socialPlatformDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  socialPlatformText: {
    fontSize: 14,
    color: '#374151',
  },
  socialUrlContainer: {
    flex: 2,
  },
  socialUrlLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  socialUrlInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  genderOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  genderOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  genderOptionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  submitContainer: {
    paddingVertical: 24,
    paddingBottom: 40,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileCompletionPage;
