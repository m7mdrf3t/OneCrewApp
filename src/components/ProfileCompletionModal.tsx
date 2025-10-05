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
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';

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
interface DropdownProps {
  options: Array<{id: string, name: string}>;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

const CustomDropdown: React.FC<DropdownProps> = ({ options, value, onValueChange, placeholder, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(option => option.id === value);
  
  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={[styles.dropdownButton, disabled && styles.dropdownButtonDisabled]}
        onPress={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <Text style={[styles.dropdownButtonText, !selectedOption && styles.placeholderText]}>
          {selectedOption ? selectedOption.name : placeholder}
        </Text>
        <Ionicons 
          name={isOpen ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#6b7280" 
        />
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.dropdownList}>
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
        </View>
      )}
    </View>
  );
};

interface ProfileCompletionModalProps {
  visible: boolean;
  onClose: () => void;
  user: any;
  onProfileUpdated: (updatedProfile: any) => void;
}

interface ProfileFormData {
  bio: string;
  skills: string[];
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

const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  visible,
  onClose,
  user,
  onProfileUpdated,
}) => {
  const { api, updateProfile, isLoading, getSkinTones, getHairColors, getSkills, getAbilities, getLanguages } = useApi();
  const [formData, setFormData] = useState<ProfileFormData>({
    bio: '',
    skills: [],
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
      console.log('🔄 User about data:', user.about);
      
      setFormData({
        bio: user.bio || '',
        skills: user.skills || [],
        about: {
          gender: user.about?.gender || '',
          age: user.about?.age?.toString() || '',
          nationality: user.about?.nationality || '',
          location: user.about?.location || '',
          height: user.about?.height_cm?.toString() || '',
          weight: user.about?.weight_kg?.toString() || '',
          skinTone: user.about?.skin_tone || '',
          hairColor: user.about?.hair_color || '',
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
      
      console.log('🔄 Form data initialized:', {
        bio: user.bio || '',
        specialty: user.specialty || '',
        height: user.about?.height_cm?.toString() || '',
        weight: user.about?.weight_kg?.toString() || '',
        eyeColor: user.about?.eye_color || '',
        skinTone: user.about?.skin_tone || '',
        hairColor: user.about?.hair_color || '',
      });
    }
  }, [user]);

  // Load reference data when modal opens
  useEffect(() => {
    const loadReferenceData = async () => {
      if (visible) {
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
          
          console.log('✅ Reference data loaded:', {
            skinTones: skinTonesRes.data?.length || 0,
            hairColors: hairColorsRes.data?.length || 0,
            skills: skillsRes.data?.length || 0,
            abilities: abilitiesRes.data?.length || 0,
            languages: languagesRes.data?.length || 0,
          });
        } catch (error) {
          console.error('❌ Failed to load reference data:', error);
          // Don't show error to user, just use empty arrays
        } finally {
          setLoadingReferences(false);
        }
      }
    };
    
    loadReferenceData();
  }, [visible, getSkinTones, getHairColors, getSkills, getAbilities, getLanguages]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.bio.trim()) {
      errors.bio = 'Bio is required';
    } else if (formData.bio.trim().length < 10) {
      errors.bio = 'Bio must be at least 10 characters';
    }

    if (!formData.specialty.trim()) {
      errors.specialty = 'Specialty is required';
    }

    if (formData.skills.length === 0) {
      errors.skills = 'At least one skill is required';
    }

    if (!formData.about.gender) {
      errors.gender = 'Gender is required';
    }

    if (!formData.about.age) {
      errors.age = 'Age is required';
    } else if (isNaN(Number(formData.about.age)) || Number(formData.about.age) < 16 || Number(formData.about.age) > 100) {
      errors.age = 'Please enter a valid age (16-100)';
    }

    if (!formData.about.nationality) {
      errors.nationality = 'Nationality is required';
    }

    if (!formData.about.location) {
      errors.location = 'Location is required';
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
      console.log('🔄 Starting profile update using talent profile API...');
      
      // Prepare basic profile data (bio, specialty, skills, imageUrl)
      const basicProfileData = {
        bio: formData.bio.trim(),
        specialty: formData.specialty.trim(),
        skills: formData.skills,
        imageUrl: formData.imageUrl.trim(),
      };

      // Prepare complete talent profile data (includes age, nationality, gender, and all other details)
      const talentProfileData = {
        gender: formData.about.gender,
        age: Number(formData.about.age),
        nationality: formData.about.nationality,
        height_cm: Number(formData.about.height) || undefined,
        weight_kg: Number(formData.about.weight) || undefined,
        skin_tone: formData.about.skinTone,
        hair_color: formData.about.hairColor,
        eye_color: formData.about.eyeColor,
        chest_cm: Number(formData.about.chestCm) || undefined,
        waist_cm: Number(formData.about.waistCm) || undefined,
        hips_cm: Number(formData.about.hipsCm) || undefined,
        shoe_size_eu: Number(formData.about.shoeSizeEu) || undefined,
        reel_url: formData.about.reelUrl,
        union_member: formData.about.unionMember,
        dialects: formData.about.dialects,
        travel_ready: formData.about.willingToTravel,
      };

      console.log('🔄 Updating basic profile:', basicProfileData);
      console.log('🔄 Updating talent profile (all details):', talentProfileData);

      // Update basic profile
      const profileResponse = await updateProfile(basicProfileData);
      console.log('✅ Basic profile updated:', profileResponse);

      // Update talent profile (includes all user details)
      const talentResponse = await updateProfile({
        about: talentProfileData
      });
      console.log('✅ Talent profile updated:', talentResponse);

      // Combine responses
      const combinedData = {
        ...profileResponse.data,
        about: talentResponse.data?.about || talentProfileData
      };

      Alert.alert(
        'Success',
        'Your profile has been updated successfully!',
        [{ text: 'OK', onPress: onClose }]
      );
      onProfileUpdated(combinedData);
      
    } catch (error: any) {
      console.error('❌ Profile update error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Complete Your Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Profile Completion: {completionPercentage}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
            </View>
          </View>

          {/* Profile Picture Preview */}
          <View style={styles.profilePictureContainer}>
            <Text style={styles.sectionTitle}>Profile Picture</Text>
            <View style={styles.profilePictureWrapper}>
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
            <Text style={styles.profilePictureHint}>
              {formData.imageUrl ? 'Profile picture loaded' : 'Add an image URL below to see your profile picture'}
            </Text>
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
            <View style={styles.skillInputContainer}>
              <TextInput
                style={styles.skillInput}
                placeholder="Add a skill..."
                placeholderTextColor="#9ca3af"
                value={currentSkill}
                onChangeText={setCurrentSkill}
                onSubmitEditing={addSkill}
                editable={!isSubmitting}
              />
              <TouchableOpacity style={styles.addButton} onPress={addSkill} disabled={isSubmitting}>
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

          {/* Personal Information */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Gender *</Text>
              <View style={[styles.inputWrapper, formErrors.gender && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Male/Female/Other"
                  placeholderTextColor="#9ca3af"
                  value={formData.about.gender}
                  onChangeText={(text) => handleInputChange('about.gender', text)}
                  editable={!isSubmitting}
                />
              </View>
              {formErrors.gender && <Text style={styles.fieldError}>{formErrors.gender}</Text>}
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Age *</Text>
              <TextInput
                style={[styles.input, formErrors.age && styles.inputError]}
                placeholder="25"
                placeholderTextColor="#9ca3af"
                value={formData.about.age}
                onChangeText={(text) => handleInputChange('about.age', text)}
                keyboardType="numeric"
                editable={!isSubmitting}
              />
              {formErrors.age && <Text style={styles.fieldError}>{formErrors.age}</Text>}
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
                  onValueChange={(value) => handleInputChange('about.skinTone', value)}
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
                  onValueChange={(value) => handleInputChange('about.hairColor', value)}
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

          {/* Professional Details */}
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

          {/* Image URL */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Profile Image URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor="#9ca3af"
              value={formData.imageUrl}
              onChangeText={(text) => handleInputChange('imageUrl', text)}
              editable={!isSubmitting}
            />
          </View>
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
    </Modal>
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
  },
  profilePictureInitials: {
    fontSize: 36,
    fontWeight: '800',
    color: '#9ca3af',
  },
  profilePictureHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
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
});

export default ProfileCompletionModal;
