import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, semanticSpacing } from '../constants/spacing';

const { width } = Dimensions.get('window');

export interface FilterParams {
  search?: string;
  category?: 'talent' | 'crew' | 'company';
  role?: string;
  location?: string;
  // Physical Attributes - exact or range
  height?: number;
  height_min?: number;
  height_max?: number;
  weight?: number;
  weight_min?: number;
  weight_max?: number;
  age?: number;
  age_min?: number;
  age_max?: number;
  // Body Measurements - range queries
  chest_min?: number;
  chest_max?: number;
  waist_min?: number;
  waist_max?: number;
  hips_min?: number;
  hips_max?: number;
  shoe_size_min?: number;
  shoe_size_max?: number;
  // Appearance - partial match, supports string and ID lookup
  skin_tone?: string;
  hair_color?: string;
  eye_color?: string;
  // Personal Details
  gender?: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | 'other';
  nationality?: string;
  // Professional Preferences
  union_member?: boolean;
  willing_to_travel?: boolean;
  travel_ready?: boolean;
  // Additional filters
  accent?: string;
  nationalities?: string[];
  skills?: string[];
  languages?: string[];
  awards?: string[];
  currentLocation?: string;
  shootingLocation?: string;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterParams) => void;
  initialFilters?: FilterParams;
  availableRoles?: string[];
}

// Simple Range Slider Component
const RangeSlider: React.FC<{
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  unit?: string;
}> = ({ min, max, value, onChange, unit = '' }) => {
  const [localValue, setLocalValue] = useState(value);

  // Sync local value with prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleMinChange = (newMin: number) => {
    const newValue: [number, number] = [Math.min(newMin, localValue[1]), localValue[1]];
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleMaxChange = (newMax: number) => {
    const newValue: [number, number] = [localValue[0], Math.max(newMax, localValue[0])];
    setLocalValue(newValue);
    onChange(newValue);
  };

  const percentageMin = ((localValue[0] - min) / (max - min)) * 100;
  const percentageMax = ((localValue[1] - min) / (max - min)) * 100;

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderTrack}>
        <View
          style={[
            styles.sliderActiveTrack,
            {
              left: `${percentageMin}%`,
              width: `${percentageMax - percentageMin}%`,
            },
          ]}
        />
        <TouchableOpacity
          style={[styles.sliderHandle, { left: `${percentageMin}%` }]}
          onPress={() => {}}
        />
        <TouchableOpacity
          style={[styles.sliderHandle, { left: `${percentageMax}%` }]}
          onPress={() => {}}
        />
      </View>
      <Text style={styles.sliderValue}>
        {localValue[0]}{unit} - {localValue[1]}{unit}
      </Text>
    </View>
  );
};

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  initialFilters = {},
  availableRoles = [],
}) => {
  const [filters, setFilters] = useState<FilterParams>(initialFilters);
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());
  const [accentInput, setAccentInput] = useState(initialFilters.accent || '');
  const [nationalityInput, setNationalityInput] = useState('');
  const [currentLocationInput, setCurrentLocationInput] = useState(initialFilters.currentLocation || '');
  const [shootingLocationInput, setShootingLocationInput] = useState(initialFilters.shootingLocation || '');

  useEffect(() => {
    if (visible) {
      setFilters(initialFilters);
      setExpandedFilters(new Set());
      setAccentInput(initialFilters.accent || '');
      setCurrentLocationInput(initialFilters.currentLocation || '');
      setShootingLocationInput(initialFilters.shootingLocation || '');
      setNationalityInput('');
    }
  }, [visible, initialFilters]);

  const toggleFilter = (filterKey: string) => {
    setExpandedFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filterKey)) {
        newSet.delete(filterKey);
      } else {
        newSet.add(filterKey);
      }
      return newSet;
    });
  };

  const handleGenderSelect = (gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | 'other') => {
    setFilters(prev => ({
      ...prev,
      gender: prev.gender === gender ? undefined : gender,
    }));
  };

  // Range validation helper
  const validateRange = (min: number, max: number): [number, number] => {
    if (min > max) {
      // Swap if min > max
      return [max, min];
    }
    return [min, max];
  };

  const handleAgeRangeChange = (value: [number, number]) => {
    const [min, max] = validateRange(value[0], value[1]);
    setFilters(prev => ({
      ...prev,
      age_min: min,
      age_max: max,
    }));
  };

  const handleHeightRangeChange = (value: [number, number]) => {
    const [min, max] = validateRange(value[0], value[1]);
    setFilters(prev => ({
      ...prev,
      height_min: min,
      height_max: max,
    }));
  };

  const handleWeightRangeChange = (value: [number, number]) => {
    const [min, max] = validateRange(value[0], value[1]);
    setFilters(prev => ({
      ...prev,
      weight_min: min,
      weight_max: max,
    }));
  };

  const handleChestRangeChange = (value: [number, number]) => {
    const [min, max] = validateRange(value[0], value[1]);
    setFilters(prev => ({
      ...prev,
      chest_min: min,
      chest_max: max,
    }));
  };

  const handleWaistRangeChange = (value: [number, number]) => {
    const [min, max] = validateRange(value[0], value[1]);
    setFilters(prev => ({
      ...prev,
      waist_min: min,
      waist_max: max,
    }));
  };

  const handleHipsRangeChange = (value: [number, number]) => {
    const [min, max] = validateRange(value[0], value[1]);
    setFilters(prev => ({
      ...prev,
      hips_min: min,
      hips_max: max,
    }));
  };

  const handleShoeSizeRangeChange = (value: [number, number]) => {
    const [min, max] = validateRange(value[0], value[1]);
    setFilters(prev => ({
      ...prev,
      shoe_size_min: min,
      shoe_size_max: max,
    }));
  };

  const handleEyeColorChange = (text: string) => {
    setFilters(prev => ({
      ...prev,
      eye_color: text.trim() || undefined,
    }));
  };

  const handleNationalityChange = (text: string) => {
    setFilters(prev => ({
      ...prev,
      nationality: text.trim() || undefined,
    }));
  };

  const handleUnionMemberToggle = (value: boolean) => {
    setFilters(prev => ({
      ...prev,
      union_member: prev.union_member === value ? undefined : value,
    }));
  };

  const handleWillingToTravelToggle = (value: boolean) => {
    setFilters(prev => ({
      ...prev,
      willing_to_travel: prev.willing_to_travel === value ? undefined : value,
    }));
  };

  const handleTravelReadyToggle = (value: boolean) => {
    setFilters(prev => ({
      ...prev,
      travel_ready: prev.travel_ready === value ? undefined : value,
    }));
  };

  const handleAccentChange = (text: string) => {
    setAccentInput(text);
    setFilters(prev => ({
      ...prev,
      accent: text.trim() || undefined,
    }));
  };

  const handleAddNationality = () => {
    if (nationalityInput.trim()) {
      setFilters(prev => ({
        ...prev,
        nationalities: [...(prev.nationalities || []), nationalityInput.trim()],
      }));
      setNationalityInput('');
    }
  };

  const handleRemoveNationality = (index: number) => {
    setFilters(prev => ({
      ...prev,
      nationalities: prev.nationalities?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSkinToneSelect = (tone: string) => {
    setFilters(prev => ({
      ...prev,
      skin_tone: prev.skin_tone === tone ? undefined : tone,
    }));
  };

  const handleHairColorSelect = (color: string) => {
    setFilters(prev => ({
      ...prev,
      hair_color: prev.hair_color === color ? undefined : color,
    }));
  };

  const handleSkillToggle = (skill: string) => {
    setFilters(prev => {
      const currentSkills = prev.skills || [];
      const newSkills = currentSkills.includes(skill)
        ? currentSkills.filter(s => s !== skill)
        : [...currentSkills, skill];
      return {
        ...prev,
        skills: newSkills.length > 0 ? newSkills : undefined,
      };
    });
  };

  const handleAwardToggle = (award: string) => {
    setFilters(prev => {
      const currentAwards = prev.awards || [];
      const newAwards = currentAwards.includes(award)
        ? currentAwards.filter(a => a !== award)
        : [...currentAwards, award];
      return {
        ...prev,
        awards: newAwards.length > 0 ? newAwards : undefined,
      };
    });
  };

  const handleLocationChange = (type: 'current' | 'shooting', text: string) => {
    if (type === 'current') {
      setCurrentLocationInput(text);
      setFilters(prev => ({
        ...prev,
        currentLocation: text.trim() || undefined,
      }));
    } else {
      setShootingLocationInput(text);
      setFilters(prev => ({
        ...prev,
        shootingLocation: text.trim() || undefined,
      }));
    }
  };

  const handleClear = () => {
    const clearedFilters: FilterParams = {};
    setFilters(clearedFilters);
    setAccentInput('');
    setNationalityInput('');
    setCurrentLocationInput('');
    setShootingLocationInput('');
    setExpandedFilters(new Set());
  };

  const handleApply = () => {
    try {
      if (typeof onApply === 'function') {
        onApply(filters);
        onClose();
      } else {
        console.error('onApply is not a function:', onApply, typeof onApply);
        Alert.alert('Error', 'Filter application failed. onApply is not a function.');
      }
    } catch (error: any) {
      console.error('Error applying filters:', error);
      Alert.alert('Error', error?.message || 'Failed to apply filters. Please try again.');
    }
  };

  const handleReset = () => {
    handleClear();
    if (typeof onApply === 'function') {
      onApply({});
    } else {
      console.error('onApply is not a function:', onApply);
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.role) count++;
    if (filters.gender) count++;
    if (filters.age || filters.age_min || filters.age_max) count++;
    if (filters.height || filters.height_min || filters.height_max) count++;
    if (filters.weight || filters.weight_min || filters.weight_max) count++;
    if (filters.chest_min || filters.chest_max) count++;
    if (filters.waist_min || filters.waist_max) count++;
    if (filters.hips_min || filters.hips_max) count++;
    if (filters.shoe_size_min || filters.shoe_size_max) count++;
    if (filters.skin_tone) count++;
    if (filters.hair_color) count++;
    if (filters.eye_color) count++;
    if (filters.nationality) count++;
    if (filters.union_member !== undefined) count++;
    if (filters.willing_to_travel !== undefined) count++;
    if (filters.travel_ready !== undefined) count++;
    if (filters.accent) count++;
    if (filters.nationalities && filters.nationalities.length > 0) count++;
    if (filters.skills && filters.skills.length > 0) count++;
    if (filters.languages && filters.languages.length > 0) count++;
    if (filters.awards && filters.awards.length > 0) count++;
    if (filters.currentLocation) count++;
    if (filters.shootingLocation) count++;
    return count;
  };

  const skinTones = ['#F4E4BC', '#E6C79A', '#D4A574', '#B87333', '#8B4513'];
  const hairColors = ['#000000', '#3D2817', '#F5DEB3', '#A0522D', '#808080'];
  
  const commonSkills = ['Method Acting', 'Improvisation', 'Stage Combat', 'Voice Acting', 'Dialects & Accents', 'Singing', 'Dancing'];
  const commonAwards = ['Best Actor', 'Top Performer', 'Rising Star', 'Outstanding Performance'];

  const renderFilterContent = (filterKey: string) => {
    if (!expandedFilters.has(filterKey)) return null;

    switch (filterKey) {
      case 'gender':
        return (
          <View style={styles.filterContent}>
            <View style={styles.blueLine} />
            <View style={styles.genderOptions}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  filters.gender === 'male' && styles.genderButtonActive,
                ]}
                onPress={() => handleGenderSelect('male')}
              >
                <Text style={[styles.genderText, filters.gender === 'male' && styles.genderTextActive]}>
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  filters.gender === 'female' && styles.genderButtonActive,
                ]}
                onPress={() => handleGenderSelect('female')}
              >
                <Text style={[styles.genderText, filters.gender === 'female' && styles.genderTextActive]}>
                  Female
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  filters.gender === 'non_binary' && styles.genderButtonActive,
                ]}
                onPress={() => handleGenderSelect('non_binary')}
              >
                <Text style={[styles.genderText, filters.gender === 'non_binary' && styles.genderTextActive]}>
                  Non Binary
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  filters.gender === 'prefer_not_to_say' && styles.genderButtonActive,
                ]}
                onPress={() => handleGenderSelect('prefer_not_to_say')}
              >
                <Text style={[styles.genderText, filters.gender === 'prefer_not_to_say' && styles.genderTextActive]}>
                  Prefer Not To Say
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  filters.gender === 'other' && styles.genderButtonActive,
                ]}
                onPress={() => handleGenderSelect('other')}
              >
                <Text style={[styles.genderText, filters.gender === 'other' && styles.genderTextActive]}>
                  Other
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'physicalAttributes':
        return (
          <View style={styles.filterContent}>
            <View style={styles.blueLine} />
            <View style={styles.physicalAttributeSection}>
              <View style={styles.attributeRow}>
                <Ionicons name="calendar-outline" size={20} color="#000" style={styles.attributeIcon} />
                <Text style={styles.attributeLabel}>Age</Text>
              </View>
              <RangeSlider
                min={18}
                max={80}
                value={[filters.age_min || 18, filters.age_max || 40]}
                onChange={handleAgeRangeChange}
              />
            </View>
            <View style={styles.physicalAttributeSection}>
              <View style={styles.attributeRow}>
                <Ionicons name="resize-outline" size={20} color="#000" style={styles.attributeIcon} />
                <Text style={styles.attributeLabel}>Height (cm)</Text>
              </View>
              <RangeSlider
                min={150}
                max={220}
                value={[filters.height_min || 150, filters.height_max || 190]}
                onChange={handleHeightRangeChange}
                unit="cm"
              />
            </View>
            <View style={styles.physicalAttributeSection}>
              <View style={styles.attributeRow}>
                <Ionicons name="resize-outline" size={20} color="#000" style={styles.attributeIcon} />
                <Text style={styles.attributeLabel}>Weight (kg)</Text>
              </View>
              <RangeSlider
                min={50}
                max={150}
                value={[filters.weight_min || 50, filters.weight_max || 90]}
                onChange={handleWeightRangeChange}
                unit="kg"
              />
            </View>
          </View>
        );

      case 'bodyMeasurements':
        return (
          <View style={styles.filterContent}>
            <View style={styles.blueLine} />
            <View style={styles.physicalAttributeSection}>
              <View style={styles.attributeRow}>
                <Ionicons name="body-outline" size={20} color="#000" style={styles.attributeIcon} />
                <Text style={styles.attributeLabel}>Chest (cm)</Text>
              </View>
              <RangeSlider
                min={70}
                max={150}
                value={[filters.chest_min || 70, filters.chest_max || 120]}
                onChange={handleChestRangeChange}
                unit="cm"
              />
            </View>
            <View style={styles.physicalAttributeSection}>
              <View style={styles.attributeRow}>
                <Ionicons name="body-outline" size={20} color="#000" style={styles.attributeIcon} />
                <Text style={styles.attributeLabel}>Waist (cm)</Text>
              </View>
              <RangeSlider
                min={60}
                max={130}
                value={[filters.waist_min || 60, filters.waist_max || 100]}
                onChange={handleWaistRangeChange}
                unit="cm"
              />
            </View>
            <View style={styles.physicalAttributeSection}>
              <View style={styles.attributeRow}>
                <Ionicons name="body-outline" size={20} color="#000" style={styles.attributeIcon} />
                <Text style={styles.attributeLabel}>Hips (cm)</Text>
              </View>
              <RangeSlider
                min={70}
                max={150}
                value={[filters.hips_min || 70, filters.hips_max || 120]}
                onChange={handleHipsRangeChange}
                unit="cm"
              />
            </View>
            <View style={styles.physicalAttributeSection}>
              <View style={styles.attributeRow}>
                <Ionicons name="footsteps-outline" size={20} color="#000" style={styles.attributeIcon} />
                <Text style={styles.attributeLabel}>Shoe Size (EU)</Text>
              </View>
              <RangeSlider
                min={35}
                max={50}
                value={[filters.shoe_size_min || 35, filters.shoe_size_max || 45]}
                onChange={handleShoeSizeRangeChange}
                unit="EU"
              />
            </View>
          </View>
        );

      case 'accent':
        return (
          <View style={styles.filterContent}>
            <View style={styles.inputContainer}>
              <Ionicons name="mic-outline" size={20} color="#000" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={accentInput}
                onChangeText={handleAccentChange}
                placeholder="Accent"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>
        );

      case 'nationality':
        return (
          <View style={styles.filterContent}>
            <View style={styles.blueLine} />
            <Text style={styles.instructionText}>Enter nationality (partial match supported).</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="globe-outline" size={20} color="#000" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={filters.nationality || ''}
                onChangeText={handleNationalityChange}
                placeholder="e.g., Egyptian, American..."
                placeholderTextColor="#9ca3af"
              />
            </View>
            {/* Legacy support for multiple nationalities */}
            <Text style={[styles.instructionText, { marginTop: 16 }]}>Or add multiple nationalities (legacy):</Text>
            <View style={styles.addInputContainer}>
              <TextInput
                style={styles.addInput}
                value={nationalityInput}
                onChangeText={setNationalityInput}
                placeholder="e.g., Egyptian, American..."
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddNationality}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {filters.nationalities && filters.nationalities.length > 0 && (
              <>
                <View style={styles.selectedItems}>
                  {filters.nationalities.map((nat, index) => (
                    <View key={index} style={styles.selectedItem}>
                      <Text style={styles.selectedItemText}>{nat}</Text>
                      <TouchableOpacity onPress={() => handleRemoveNationality(index)}>
                        <Ionicons name="close" size={16} color="#000" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <TouchableOpacity onPress={() => setFilters(prev => ({ ...prev, nationalities: undefined }))}>
                  <Text style={styles.clearAllText}>Clear all</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );

      case 'skinTone':
        return (
          <View style={styles.filterContent}>
            <View style={styles.blueLine} />
            <View style={styles.colorSwatches}>
              {skinTones.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    filters.skin_tone === color && styles.colorSwatchActive,
                  ]}
                  onPress={() => handleSkinToneSelect(color)}
                />
              ))}
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="color-palette-outline" size={20} color="#000" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={filters.skin_tone || ''}
                onChangeText={(text) => {
                  setFilters(prev => ({
                    ...prev,
                    skin_tone: text.trim() || undefined,
                  }));
                }}
                placeholder="Or enter skin tone text/ID (partial match)"
                placeholderTextColor="#9ca3af"
              />
            </View>
            {filters.skin_tone && (
              <TouchableOpacity onPress={() => handleSkinToneSelect('')}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'hairColor':
        return (
          <View style={styles.filterContent}>
            <View style={styles.blueLine} />
            <View style={styles.colorSwatches}>
              {hairColors.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    filters.hair_color === color && styles.colorSwatchActive,
                  ]}
                  onPress={() => handleHairColorSelect(color)}
                />
              ))}
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="cut-outline" size={20} color="#000" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={filters.hair_color || ''}
                onChangeText={(text) => {
                  setFilters(prev => ({
                    ...prev,
                    hair_color: text.trim() || undefined,
                  }));
                }}
                placeholder="Or enter hair color text (partial match)"
                placeholderTextColor="#9ca3af"
              />
            </View>
            {filters.hair_color && (
              <TouchableOpacity onPress={() => handleHairColorSelect('')}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'eyeColor':
        return (
          <View style={styles.filterContent}>
            <View style={styles.blueLine} />
            <View style={styles.inputContainer}>
              <Ionicons name="eye-outline" size={20} color="#000" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={filters.eye_color || ''}
                onChangeText={handleEyeColorChange}
                placeholder="e.g., Brown, Blue, Green, Hazel..."
                placeholderTextColor="#9ca3af"
              />
            </View>
            {filters.eye_color && (
              <TouchableOpacity onPress={() => handleEyeColorChange('')}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'professionalPreferences':
        return (
          <View style={styles.filterContent}>
            <View style={styles.blueLine} />
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => handleUnionMemberToggle(true)}
              >
                <View style={[styles.checkbox, filters.union_member === true && styles.checkboxChecked]}>
                  {filters.union_member === true && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Union Member</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => handleWillingToTravelToggle(true)}
              >
                <View style={[styles.checkbox, filters.willing_to_travel === true && styles.checkboxChecked]}>
                  {filters.willing_to_travel === true && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Willing to Travel</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => handleTravelReadyToggle(true)}
              >
                <View style={[styles.checkbox, filters.travel_ready === true && styles.checkboxChecked]}>
                  {filters.travel_ready === true && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Travel Ready</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'location':
        return (
          <View style={styles.filterContent}>
            <View style={styles.locationSection}>
              <Text style={styles.locationLabel}>Current location:</Text>
              <View style={styles.addInputContainer}>
                <TextInput
                  style={styles.addInput}
                  value={currentLocationInput}
                  onChangeText={(text) => handleLocationChange('current', text)}
                  placeholder="e.g., Cairo, Dubai..."
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity style={styles.addButton}>
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.locationSection}>
              <Text style={styles.locationLabel}>Shooting location:</Text>
              <View style={styles.addInputContainer}>
                <TextInput
                  style={styles.addInput}
                  value={shootingLocationInput}
                  onChangeText={(text) => handleLocationChange('shooting', text)}
                  placeholder="e.g., Aswan, Siwa..."
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity style={styles.addButton}>
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      case 'skills':
        return (
          <View style={styles.filterContent}>
            <View style={styles.chipsContainer}>
              {commonSkills.map((skill) => (
                <TouchableOpacity
                  key={skill}
                  style={[
                    styles.chip,
                    filters.skills?.includes(skill) && styles.chipActive,
                  ]}
                  onPress={() => handleSkillToggle(skill)}
                >
                  <Text style={[styles.chipText, filters.skills?.includes(skill) && styles.chipTextActive]}>
                    {skill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {filters.skills && filters.skills.length > 0 && (
              <TouchableOpacity onPress={() => setFilters(prev => ({ ...prev, skills: undefined }))}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'awards':
        return (
          <View style={styles.filterContent}>
            <View style={styles.chipsContainer}>
              {commonAwards.map((award) => (
                <TouchableOpacity
                  key={award}
                  style={[
                    styles.chip,
                    filters.awards?.includes(award) && styles.chipActive,
                  ]}
                  onPress={() => handleAwardToggle(award)}
                >
                  <Text style={[styles.chipText, filters.awards?.includes(award) && styles.chipTextActive]}>
                    {award}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {filters.awards && filters.awards.length > 0 && (
              <TouchableOpacity onPress={() => setFilters(prev => ({ ...prev, awards: undefined }))}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  const userFilters = [
    { key: 'gender', label: 'Gender', icon: 'people-outline' },
    { key: 'physicalAttributes', label: 'Physical Attributes', icon: 'body-outline' },
    { key: 'bodyMeasurements', label: 'Body Measurements', icon: 'resize-outline' },
    { key: 'skinTone', label: 'Skin Tone', icon: 'color-palette-outline' },
    { key: 'hairColor', label: 'Hair Color', icon: 'cut-outline' },
    { key: 'eyeColor', label: 'Eye Color', icon: 'eye-outline' },
    { key: 'nationality', label: 'Nationality', icon: 'globe-outline' },
    { key: 'professionalPreferences', label: 'Professional Preferences', icon: 'briefcase-outline' },
    { key: 'accent', label: 'Accent', icon: 'mic-outline' },
    { key: 'location', label: 'Location', icon: 'location-outline' },
    { key: 'skills', label: 'Skills', icon: 'star-outline' },
    { key: 'awards', label: 'Awards', icon: 'trophy-outline' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {userFilters.map((filter) => {
              const isActive = filters[filter.key as keyof FilterParams] !== undefined && 
                filters[filter.key as keyof FilterParams] !== '' &&
                !(Array.isArray(filters[filter.key as keyof FilterParams]) && 
                  (filters[filter.key as keyof FilterParams] as any[]).length === 0);
              const isExpanded = expandedFilters.has(filter.key);
              
              return (
                <View key={filter.key} style={styles.filterCard}>
                  <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => toggleFilter(filter.key)}
                  >
                    <Ionicons 
                      name={filter.icon as any} 
                      size={20} 
                      color="#000" 
                      style={styles.filterIcon}
                    />
                    <Text style={styles.filterText}>
                      {filter.label}
                    </Text>
                    <Ionicons 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#000" 
                    />
                  </TouchableOpacity>
                  {renderFilterContent(filter.key)}
                </View>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={handleReset}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.applyButton]}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '95%',
    maxHeight: '95%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: semanticSpacing.containerPaddingLarge,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
    padding: semanticSpacing.containerPaddingLarge,
  },
  filterCard: {
    marginBottom: spacing.md,
    borderRadius: semanticSpacing.borderRadius.md,
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  filterIcon: {
    marginRight: spacing.md,
  },
  filterText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.2,
  },
  filterContent: {
    padding: semanticSpacing.containerPadding,
    paddingTop: 0,
  },
  blueLine: {
    height: 2,
    backgroundColor: '#3b82f6',
    marginBottom: spacing.md,
  },
  genderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  genderButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: semanticSpacing.borderRadius.md,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#e5e7eb',
  },
  genderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  genderTextActive: {
    fontWeight: '700',
  },
  physicalAttributeSection: {
    marginBottom: spacing.lg,
  },
  attributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  attributeIcon: {
    marginRight: spacing.sm,
  },
  attributeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  sliderContainer: {
    marginTop: spacing.sm,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    position: 'relative',
    marginBottom: spacing.sm,
  },
  sliderActiveTrack: {
    height: 4,
    backgroundColor: '#000',
    borderRadius: 2,
    position: 'absolute',
    top: 0,
  },
  sliderHandle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000',
    position: 'absolute',
    top: -8,
    marginLeft: -10,
  },
  sliderValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: semanticSpacing.borderRadius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: semanticSpacing.containerPadding,
    height: 44,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  instructionText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: spacing.md,
  },
  addInputContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  addInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: semanticSpacing.borderRadius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: '#000',
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: '#000',
    borderRadius: semanticSpacing.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: semanticSpacing.borderRadius.md,
    gap: spacing.xs,
  },
  selectedItemText: {
    fontSize: 14,
    color: '#000',
  },
  clearAllText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  colorSwatches: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: '#000',
  },
  locationSection: {
    marginBottom: spacing.lg,
  },
  locationLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: spacing.sm,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: semanticSpacing.borderRadius.md,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#e5e7eb',
    borderColor: '#000',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  chipTextActive: {
    fontWeight: '600',
  },
  checkboxContainer: {
    marginBottom: spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
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
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: semanticSpacing.containerPaddingLarge,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    flex: 1,
    paddingVertical: semanticSpacing.containerPadding,
    borderRadius: semanticSpacing.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  applyButton: {
    backgroundColor: '#000',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default FilterModal;
